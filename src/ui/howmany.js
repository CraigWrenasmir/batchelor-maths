// How many?  Estimate a collection, then count it by tapping, grouping as
// you go. Feedback explains the structure (tens and ones, groups, arrays).
import { mountShell, setting, feedbackEl, button, keypad, talkPrompts, el, params } from '../shared.js';
import { makeRng, randomSeed } from '../logic/rng.js';
import { chooseScene, layoutScene, estimateMessage, describeCount, tally } from '../logic/howmany.js';
import { HOW_MANY_PRESETS, howManyPreset } from '../../content/how-many.js';
import { CONTEXTS, contextById } from '../../content/contexts.js';
import { ensureDefs, svgEl, GROUNDS } from './scenes.js';

const state = {
  preset: howManyPreset(setting('preset', 'to20')),
  context: contextById(setting('context', 'mounds')),
  quick: setting('quick', 'off') === 'on',
  support: setting('support', 'full'),
  seed: parseInt(setting('seed', ''), 10) || randomSeed(),
  round: 0,
  phase: 'estimate',
  scene: null, layout: null, marked: [], estimate: null, order: [],
};

const shell = mountShell({
  title: 'How many?',
  activity: 'how-many',
  onNewLearner: () => { state.seed = randomSeed(); state.round = 0; newRound(); },
  teacherControls: [
    { key: 'h', label: 'Hint', onClick: () => hint() },
    { key: 'r', label: 'Reveal', onClick: () => reveal() },
    { key: 'n', label: 'Next', onClick: () => newRound() },
    { key: 's', label: 'Start again', onClick: () => restartRound() },
  ],
});
ensureDefs();

const stage = shell.stage;
stage.innerHTML = `
  <div class="two-col">
    <div>
      <div class="scene-wrap" id="scene-wrap"></div>
      <div class="tally-text" id="tally-text" aria-live="polite"></div>
      <div class="tally" id="tally" aria-hidden="true"></div>
    </div>
    <div class="panel" id="panel"></div>
  </div>
  <div id="talk"></div>
`;
const sceneWrap = stage.querySelector('#scene-wrap');
const panel = stage.querySelector('#panel');
const tallyText = stage.querySelector('#tally-text');
const tallyBox = stage.querySelector('#tally');
const talkBox = stage.querySelector('#talk');
let feedback;
let pad;

shell.setDrawer(drawerContent);

function isPortrait() { return window.matchMedia('(orientation: portrait)').matches && window.innerWidth < 900; }

function newRound() {
  state.round += 1;
  const rng = makeRng(state.seed + state.round * 7919);
  state.scene = chooseScene(state.preset, rng);
  state.layout = layoutScene(state.scene, rng, isPortrait() ? 1.35 : 1.6);
  state.order = state.layout.items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)).map((i) => i.id);
  state.marked = [];
  state.estimate = null;
  state.phase = 'estimate';
  renderScene();
  renderPanel();
  renderTally();
  talkBox.innerHTML = '';
}

function restartRound() {
  state.marked = [];
  state.estimate = null;
  state.phase = 'estimate';
  renderScene();
  renderPanel();
  renderTally();
  talkBox.innerHTML = '';
}

function renderScene() {
  const portrait = isPortrait();
  const W = portrait ? 1350 : 1600, H = 1000;
  sceneWrap.innerHTML = '';
  const svg = svgEl('svg', { class: 'scene', viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': `A collection of ${state.context.noun[1]}` });
  const g = GROUNDS[state.context.ground] || GROUNDS.paper;
  const gradId = `grad-${state.context.ground}`;
  svg.innerHTML = `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/></linearGradient></defs>`;
  svg.append(svgEl('rect', { width: W, height: H, rx: 24, fill: `url(#${gradId})` }));
  const pad = 70;
  const diameter = state.layout.radius * 2 * (H - pad * 2);
  for (const item of state.layout.items) {
    const cx = pad + item.x * (W - pad * 2), cy = pad + item.y * (H - pad * 2);
    const node = svgEl('g', { class: 'item', role: 'button', tabindex: '0', 'data-id': item.id, 'aria-label': `${state.context.noun[0]}`, 'aria-pressed': 'false' });
    node.append(svgEl('circle', { class: 'hit', cx, cy, r: Math.max(diameter * 0.8, 40), fill: 'transparent' }));
    node.append(svgEl('circle', { class: 'focus-ring', cx, cy, r: diameter * 0.62 }));
    node.append(svgEl('use', { href: `#sym-${state.context.symbol}`, x: cx - diameter / 2, y: cy - diameter / 2, width: diameter, height: diameter }));
    node.append(svgEl('circle', { class: 'mark-ring', cx, cy, r: diameter * 0.56 }));
    node.append(svgEl('text', { class: 'mark-num', x: cx, y: cy, 'font-size': Math.max(26, diameter * 0.55) }));
    node.addEventListener('click', () => tapItem(item.id));
    node.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapItem(item.id); } });
    svg.append(node);
  }
  sceneWrap.append(svg);
  if (state.quick && state.phase === 'estimate') addCover();
  refreshMarks();
}

function addCover() {
  const cover = el('div', { class: 'cover' });
  const look = button('Look for 3 seconds', { primary: true });
  look.addEventListener('click', () => {
    cover.hidden = true;
    setTimeout(() => { if (state.phase === 'estimate') cover.hidden = false; }, 3000);
  });
  cover.append(look);
  sceneWrap.append(cover);
}

function refreshMarks() {
  const gs = state.scene.groupSize || 10;
  sceneWrap.querySelectorAll('.item').forEach((node) => {
    const id = +node.dataset.id;
    const idx = state.marked.indexOf(id);
    node.classList.toggle('marked', idx >= 0);
    node.setAttribute('aria-pressed', String(idx >= 0));
    node.classList.remove('missed', 'hinted');
    const ring = node.querySelector('.mark-ring');
    const num = node.querySelector('.mark-num');
    if (idx >= 0) {
      const group = Math.floor(idx / gs);
      ring.setAttribute('stroke', group % 2 === 0 ? '#2f6f8a' : '#b65a2e');
      num.textContent = String(idx + 1);
      node.setAttribute('aria-label', `${state.context.noun[0]}, counted ${idx + 1}`);
    } else {
      num.textContent = '';
      node.setAttribute('aria-label', state.context.noun[0]);
    }
  });
}

function tapItem(id) {
  if (state.phase === 'estimate') {
    feedback?.set('info', 'Make your estimate first. If you want to count straight away, tap "Skip the estimate".');
    return;
  }
  if (state.phase !== 'count') return;
  const idx = state.marked.indexOf(id);
  if (idx >= 0) {
    // Un-mark this item and everything counted after it, so numbering stays in order.
    state.marked = state.marked.slice(0, idx);
  } else {
    state.marked.push(id);
  }
  refreshMarks();
  renderTally();
  if (state.marked.length === state.scene.n) finishCount();
}

function countNext() {
  if (state.phase === 'estimate') { state.phase = 'count'; renderPanel(); sceneWrap.querySelector('.cover')?.remove(); }
  const next = state.order.find((id) => !state.marked.includes(id));
  if (next !== undefined) tapItem(next);
}

function renderTally() {
  const gs = state.scene.groupSize || 10;
  const t = tally(state.marked.length, gs);
  tallyBox.innerHTML = '';
  for (let i = 0; i < t.groups; i++) tallyBox.append(el('div', { class: `rod${gs === 5 ? ' five' : ''}`, 'data-n': gs }));
  for (let i = 0; i < t.rest; i++) tallyBox.append(el('div', { class: 'dot' }));
  if (state.phase !== 'count' && state.phase !== 'done') { tallyText.textContent = ''; return; }
  const n = state.marked.length;
  if (n === 0) { tallyText.textContent = ''; return; }
  if (state.support === 'light') { tallyText.textContent = String(n); return; }
  const plural = t.groups > 1;
  let unit;
  if (state.scene.arrangement === 'rows') unit = `row${plural ? 's' : ''} of ${gs}`;
  else if (gs === 10) unit = plural ? 'tens' : 'ten';
  else if (gs === 5) unit = plural ? 'fives' : 'five';
  else unit = `group${plural ? 's' : ''} of ${gs}`;
  if (t.groups === 0) tallyText.textContent = `${n}`;
  else tallyText.textContent = `${t.groups} ${unit}${t.rest ? ` and ${t.rest}` : ''} = ${n}`;
}

function renderPanel() {
  panel.innerHTML = '';
  if (state.phase === 'estimate') {
    panel.append(el('p', { class: 'prompt', text: 'How many?' }));
    panel.append(el('p', { class: 'hint-text', text: 'Make your best estimate. Then we count.' }));
    pad = keypad({ onDone: (v) => { state.estimate = v; state.phase = 'count'; renderPanel(); sceneWrap.querySelector('.cover')?.remove(); renderTally(); }, maxDigits: 3, doneLabel: 'That is my estimate' });
    panel.append(pad.el);
    const actions = el('div', { class: 'actions' });
    actions.append(button('Skip the estimate', { quiet: true, onClick: () => { state.phase = 'count'; renderPanel(); sceneWrap.querySelector('.cover')?.remove(); } }));
    panel.append(actions);
    feedback = feedbackEl(panel);
    setTimeout(() => pad.el.focus(), 50);
  } else if (state.phase === 'count') {
    panel.append(el('p', { class: 'prompt', text: 'Now count.' }));
    panel.append(el('p', { class: 'hint-text', text: `Tap each ${state.context.noun[0]} once. Tap again to undo.` }));
    if (state.estimate !== null) panel.append(el('p', { class: 'muted', text: `Your estimate: ${state.estimate}` }));
    const actions = el('div', { class: 'actions' });
    actions.append(button('Count next', { onClick: countNext }));
    actions.append(button('Undo', { quiet: true, onClick: () => { state.marked.pop(); refreshMarks(); renderTally(); } }));
    actions.append(button('I have counted them all', { primary: true, onClick: finishCount }));
    panel.append(actions);
    feedback = feedbackEl(panel);
  } else {
    panel.append(el('p', { class: 'prompt', text: `There are ${state.scene.n}.` }));
    feedback = feedbackEl(panel);
    const actions = el('div', { class: 'actions' });
    actions.append(button('Next', { primary: true, onClick: newRound }));
    actions.append(button('Count again', { quiet: true, onClick: restartRound }));
    panel.append(actions);
  }
}

function finishCount() {
  const n = state.scene.n;
  if (state.marked.length < n) {
    const missing = n - state.marked.length;
    state.layout.items.forEach((it) => {
      if (!state.marked.includes(it.id)) sceneWrap.querySelector(`.item[data-id="${it.id}"]`).classList.add('missed');
    });
    feedback.set('try', `You counted ${state.marked.length}. ${missing} ${missing === 1 ? 'has' : 'have'} not been counted yet. ${missing === 1 ? 'It is' : 'They are'} marked with a dashed ring.`);
    return;
  }
  state.phase = 'done';
  renderPanel();
  renderTally();
  const parts = [];
  if (state.estimate !== null) parts.push(estimateMessage(state.estimate, n));
  else parts.push(`There are ${n}.`);
  feedback.set(state.estimate !== null && Math.abs(state.estimate - n) <= Math.max(2, n * 0.1) ? 'ok' : 'info', parts.join(' '), describeCount(state.scene));
  talkBox.innerHTML = '';
  talkBox.append(talkPrompts([
    'What helped you make your estimate?',
    state.scene.arrangement === 'rows' ? 'How could you count the rows without touching every one?' : `Would counting in ${state.scene.groupSize === 5 ? 'fives' : 'tens'} be quicker than ones? Why?`,
    'If there were 10 more, how many would there be?',
  ]));
}

function hint() {
  const gs = state.scene.groupSize || 10;
  if (state.phase === 'estimate') {
    const ids = state.order.slice(0, Math.min(gs, state.scene.n));
    ids.forEach((id) => sceneWrap.querySelector(`.item[data-id="${id}"]`).classList.add('hinted'));
    feedback?.set('info', `The dotted rings show a group of ${ids.length}. About how many groups like this are there?`);
  } else if (state.phase === 'count') {
    const next = state.order.find((id) => !state.marked.includes(id));
    if (next !== undefined) sceneWrap.querySelector(`.item[data-id="${next}"]`).classList.add('hinted');
    feedback?.set('info', `The dotted ring shows one that has not been counted yet.`);
  }
}

function reveal() {
  state.marked = state.order.slice();
  state.phase = 'count';
  refreshMarks();
  finishCount();
}

function drawerContent() {
  const sheet = el('div');
  sheet.append(el('h2', { id: 'drawer-title', text: 'Set up: How many?' }));
  sheet.append(el('p', { class: 'small muted', text: 'These choices are for the teacher. The student screen only shows the activity.' }));
  const presetSel = el('select', { id: 'sel-preset' });
  HOW_MANY_PRESETS.forEach((p) => presetSel.append(el('option', { value: p.id, text: p.label, ...(p.id === state.preset.id ? { selected: '' } : {}) })));
  const note = el('p', { class: 'codes' });
  const showNote = () => { const p = howManyPreset(presetSel.value); note.textContent = `${p.note} Curriculum: ${p.codes.join(', ')}.`; };
  presetSel.addEventListener('change', showNote); showNote();
  const ctxSel = el('select', { id: 'sel-context' });
  CONTEXTS.forEach((c) => ctxSel.append(el('option', { value: c.id, text: c.name, ...(c.id === state.context.id ? { selected: '' } : {}) })));
  const quickSel = el('select', { id: 'sel-quick' });
  [['off', 'Scene stays visible (no time pressure)'], ['on', 'Quick look: 3 seconds, then hidden']].forEach(([v, t]) => quickSel.append(el('option', { value: v, text: t, ...(v === (state.quick ? 'on' : 'off') ? { selected: '' } : {}) })));
  const supSel = el('select', { id: 'sel-support' });
  [['full', 'Full: tally in words (2 tens and 3 = 23)'], ['light', 'Light: running total only']].forEach(([v, t]) => supSel.append(el('option', { value: v, text: t, ...(v === state.support ? { selected: '' } : {}) })));
  const seedIn = el('input', { type: 'number', id: 'in-seed', value: String(state.seed), min: '1' });
  sheet.append(el('label', { for: 'sel-preset', text: 'Numbers and arrangement' }), presetSel, note);
  sheet.append(el('label', { for: 'sel-context', text: 'What we are counting' }), ctxSel);
  sheet.append(el('label', { for: 'sel-quick', text: 'Looking time' }), quickSel);
  sheet.append(el('label', { for: 'sel-support', text: 'Support' }), supSel);
  sheet.append(el('label', { for: 'in-seed', text: 'Round code (same code gives the same rounds on every device)' }), seedIn);
  const actions = el('div', { class: 'actions' });
  actions.append(button('Apply', { primary: true, onClick: () => {
    const p = new URLSearchParams(params);
    p.set('preset', presetSel.value); p.set('context', ctxSel.value); p.set('quick', quickSel.value); p.set('support', supSel.value); p.set('seed', seedIn.value || String(randomSeed()));
    location.search = p.toString();
  } }));
  actions.append(button('Cancel', { quiet: true, onClick: shell.closeDrawer }));
  actions.append(el('a', { class: 'btn btn-quiet', href: `../teacher.html?activity=how-many&${params.toString()}`, text: 'Teacher page' }));
  sheet.append(actions);
  return sheet;
}

window.addEventListener('resize', () => { if (state.scene) renderScene(); });
newRound();
