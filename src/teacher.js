import { HOW_MANY_PRESETS } from '../content/how-many.js';
import { LINE_PRESETS } from '../content/number-line.js';
import { PATTERN_PRESETS } from '../content/patterns.js';
import { CONTEXTS } from '../content/contexts.js';
const $ = id => document.getElementById(id);
const initial = new URLSearchParams(location.search);
const fieldwork = () => ['pack-the-gear','find-the-way'].includes($('activity').value);
const sets = {
  'how-many': HOW_MANY_PRESETS,
  'where-does-it-go': LINE_PRESETS,
  'grow-the-pattern': PATTERN_PRESETS,
  'pack-the-gear': [5,10,20].map(n=>({id:String(n),label:`Amounts up to ${n}`,codes:n===20?['AC9M1N04']:['AC9MFN04']})),
  'find-the-way': [{id:'short',label:'Short routes'},{id:'turns',label:'More steps'},{id:'detour',label:'Changing routes, with a stop'}].map(p=>({...p,codes:['AC9M1SP02']})),
};
const descriptions = {
  'pack-the-gear':'Make a total in two trays, find another split, change the total, repair a pack and make a challenge for a partner.',
  'find-the-way':'Plan a route with arrows, respond to a blocked path, repair a route and choose a destination for a partner. Arrows always mean directions on the screen.',
  'how-many':'Estimate, then choose a counting strategy: tap items, count whole groups, or enter a total and explain it. Scattered collections can be rearranged into groups.',
  'where-does-it-go':'Place cards on a number line or use bigger and smaller clues to find a mystery number. Close positions stay editable; exact positions are confirmed.',
  'grow-the-pattern':'Continue a repeating pattern, or build and compare a growing pattern before predicting later steps. Different arrangements stay visible for discussion.',
};
function options(id, rows, value) {
  const select=$(id);select.replaceChildren(...rows.map(([v,label])=>new Option(label,v)));
  if(rows.some(([v])=>v===value))select.value=value;
}
if(sets[initial.get('activity')])$('activity').value=initial.get('activity');
function fill(first=false) {
  const a=$('activity').value, fw=fieldwork();
  const key=a==='pack-the-gear'?'packRange':a==='find-the-way'?'routeLevel':'preset';
  const preferred=first?initial.get(key):null;
  const fallback={'pack-the-gear':'10','find-the-way':'short','how-many':'to20','where-does-it-go':'to20','grow-the-pattern':'repeat'}[a];
  options('preset',sets[a].map(p=>[p.id,p.label]),preferred||fallback);
  options('support',fw?[['guided','Visible prompts'],['some','Hints on request'],['independent','Try independently']]:[['full','More labels and prompts'],['light','Fewer labels and prompts']],first?initial.get('support'):null);
  options('context',fw?[['equipment','Equipment'],['shapes','Plain counters']]:CONTEXTS.map(c=>[c.id,c.name]),first?initial.get('context'):null);
  $('opt-context').hidden=!fw&&a!=='how-many';
  $('opt-game').hidden=a!=='where-does-it-go';$('opt-quick').hidden=a!=='how-many';
  if(first)for(const k of ['game','quick','mode','sound','seed'])if(initial.has(k))$(k).value=initial.get(k);
  update();
}
function update(){
  const a=$('activity').value,preset=sets[a].find(p=>p.id===$('preset').value);
  $('preset-note').textContent=`Selected curriculum connections: ${preset.codes.join(', ')}. Provisional until the school sequence is supplied.`;
  const p=new URLSearchParams();
  p.set(a==='pack-the-gear'?'packRange':a==='find-the-way'?'routeLevel':'preset',preset.id);
  for(const k of ['mode','support','sound'])p.set(k,$(k).value);
  if(!$('opt-context').hidden)p.set('context',$('context').value);
  if(a==='how-many')p.set('quick',$('quick').value);
  if(a==='where-does-it-go')p.set('game',$('game').value);
  const seed=$('seed');
  seed.setCustomValidity('');
  if(seed.value && (!Number.isSafeInteger(Number(seed.value)) || Number(seed.value)<1 || Number(seed.value)>999999))seed.setCustomValidity('Use a whole number from 1 to 999999.');
  const valid=seed.checkValidity();
  if(seed.value&&valid)p.set('seed',seed.value);
  const href=new URL(`activities/${a}.html?${p}`,location.href).href;
  $('open').href=valid?href:'#';$('open').setAttribute('aria-disabled',String(!valid));
  $('copy').disabled=!valid;$('link').textContent=valid?href:'Use a whole round code from 1 to 999999.';
  $('example').replaceChildren();
  const h=document.createElement('h3');h.textContent='What learners will do';
  const desc=document.createElement('p');desc.textContent=descriptions[a];
  const note=document.createElement('p');note.className='small';note.textContent='Use the same link on the board and iPads to start together. A round code repeats the starting tasks. No learner responses are included in the link.';
  $('example').append(h,desc,note);
}
$('activity').onchange=()=>fill();
for(const k of ['preset','context','game','quick','mode','support','sound','seed'])$(k).addEventListener('input',update);
$('open').onclick=e=>{if(!$('seed').reportValidity())e.preventDefault();};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('link').textContent);$('copied').textContent='Link copied.';}catch{$('copied').textContent='Select and copy the link below.';}};
fill(true);
