// Optional browser checks: install Playwright separately. Start the static server first.
// BASE_URL, QA_OUTPUT and PLAYWRIGHT_EXECUTABLE_PATH may override defaults.
import { chromium, webkit } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out=process.env.QA_OUTPUT || 'qa-output';
fs.mkdirSync(out,{recursive:true});
const engine=process.argv[2]==='webkit'?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{headless:true,...(process.env.PLAYWRIGHT_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH}:{})});
const context=await browser.newContext({viewport:{width:1024,height:768},hasTouch:true,reducedMotion:'reduce'});
const p=await context.newPage();const errors=[],requests=new Set(),passed=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});p.on('request',r=>requests.add(new URL(r.url()).origin));
await p.addInitScript(()=>{window.__spoken=[];Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(u){window.__spoken.push(u.text)}}});window.SpeechSynthesisUtterance=function(text){this.text=text;};});
const base=process.env.BASE_URL || 'http://127.0.0.1:8077/';
const url=path=>new URL(path,base).href;
const state=()=>p.evaluate(()=>JSON.parse(window.render_game_to_text()));
const go=async path=>{await p.goto(url(path));await p.waitForFunction(()=>typeof window.render_game_to_text==='function');};
const press=async (n,label='Check total')=>{for(const c of String(n))await p.getByRole('button',{name:c,exact:true}).click();await p.getByRole('button',{name:label,exact:true}).click();};
const shot=async name=>p.screenshot({path:`${out}/combined-${engine}-${name}.png`,fullPage:true});
await p.goto(url('index.html'));assert.equal(await p.locator('nav[aria-label="Activities"] > a').count(),5);await shot('home');
await p.goto(url('teacher.html'));
for(const a of ['pack-the-gear','find-the-way','how-many','where-does-it-go','grow-the-pattern']){await p.getByLabel('Activity',{exact:true}).selectOption(a);await p.getByLabel('Round code (optional)').fill('42');const href=await p.locator('#open').getAttribute('href');assert(href.includes(a+'.html'));assert(href.includes('seed=42'));}
passed.push('five home cards and teacher setup links');
await go('activities/how-many.html?preset=arrays-big&seed=7');
await p.locator('#btn-listen').click();assert.match((await p.evaluate(()=>window.__spoken)).at(-1),/estimate/i);
await p.locator('#btn-example').click();assert(await p.getByRole('dialog').isVisible());await p.getByRole('button',{name:'Listen to the example'}).click();await p.getByRole('button',{name:'Back to my task'}).click();
const n=await p.locator('.scene .item').count();await p.getByRole('button',{name:'Skip the estimate'}).click();await p.getByRole('button',{name:'I know the total',exact:true}).click();await press(1);assert.equal((await state()).phase,'count');assert.equal((await state()).total,null);await press(n);assert.equal((await state()).phase,'done');assert.equal((await state()).completion,'total');await shot('count-total');
await p.getByRole('button',{name:'Listen to the questions'}).click();assert.match((await p.evaluate(()=>window.__spoken)).at(-1),/group|estimate|rows/i);passed.push('count direct total, wrong retry, speech and demo');
await go('activities/how-many.html?preset=fives&seed=7');await p.getByRole('button',{name:'Skip the estimate'}).click();await p.locator('#count-groups button').first().click();const before=(await state()).counted;assert(before>1);await p.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await state()).counted,0);while((await state()).phase==='count')await p.locator('#count-groups button:enabled').first().click();assert.equal((await state()).phase,'done');passed.push('count whole groups and undo');
await go('activities/how-many.html?preset=to20&seed=7');await p.getByRole('button',{name:'Skip the estimate'}).click();await p.getByRole('button',{name:'Count one',exact:true}).click();await p.getByRole('button',{name:/Make groups of/}).click();assert.equal((await state()).counted,1);assert.equal((await state()).arrangement,'groups');await p.locator('#btn-mode').click();assert.equal((await state()).counted,1);await p.locator('#btn-new').click();assert.equal((await state()).counted,0);assert.equal((await state()).phase,'estimate');passed.push('regroup retains count; mode retains work; new learner clears');
await go('activities/where-does-it-go.html?preset=to20&seed=491176707&mode=ipad');
let cards=(await state()).cards;assert.deepEqual(cards.map(c=>c.value),[9,2,19,1]);
const line=p.locator('#line');
for(let i=0;i<cards.length;i++){await p.locator('.card').nth(i).click();await line.press('Home');for(let k=0;k<cards[i].value-1;k++)await line.press('ArrowRight');}
await p.getByRole('button',{name:'Check',exact:true}).click();let s=await state();assert(s.cards.every(c=>c.grade==='close'));assert.match(await p.locator('.feedback').innerText(),/0 of 4 exactly/);assert(await p.getByRole('button',{name:'Check again',exact:true}).isEnabled());await shot('line-close');
for(let i=0;i<cards.length;i++){await p.locator('.card').nth(i).click();await p.getByRole('button',{name:'Move right',exact:true}).click();}
await p.getByRole('button',{name:'Check again',exact:true}).click();assert((await state()).cards.every(c=>c.grade==='spot'));await shot('line-exact');passed.push('near placements remain editable; touch nudge to exact');
await go('activities/where-does-it-go.html?preset=to20&seed=42&game=mystery&mode=ipad');await line.press('Home');await p.getByRole('button',{name:/^Guess /}).click();assert.match(await p.locator('.feedback').innerText(),/bigger/);await p.locator('#btn-new').click();assert.equal((await state()).guesses.length,0);passed.push('mystery clue and reset');
for(const width of [390,768,1024,1920]){await p.setViewportSize({width,height:width===1920?1080:900});for(const path of ['index.html','teacher.html','activities/how-many.html?preset=tens&seed=42','activities/where-does-it-go.html?preset=eighths&seed=42']){await p.goto(url(path));if(path.includes('activities'))await p.waitForFunction(()=>!!window.render_game_to_text);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} overflow ${path}`);await shot(`${width}-${path.split('/').at(-1).split('?')[0]}`);}}
passed.push('core responsive pages 390/768/1024/1920 no viewport overflow');
await p.goto(url('activities/how-many.html?seed=42'));await p.waitForFunction(()=>!!window.render_game_to_text);await p.locator('#btn-setup').click();await p.keyboard.press('Escape');assert.equal(await p.locator('#drawer').evaluate(e=>e.open),false);await p.waitForFunction(()=>document.activeElement.id==='btn-setup');passed.push('settings dialog Escape restores focus');
assert.deepEqual(errors,[]);assert.deepEqual([...requests],[new URL(base).origin]);
fs.writeFileSync(`${out}/combined-${engine}-core-results.json`,JSON.stringify({engine,passed,errors,requests:[...requests]},null,2));console.log(JSON.stringify({engine,passed,errors}));await browser.close();
