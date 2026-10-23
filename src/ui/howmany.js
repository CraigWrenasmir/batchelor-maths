// How many?  Estimate a collection, then count it by tapping, grouping as
// you go. Feedback explains the structure (tens and ones, groups, arrays).
import { mountShell, setting, feedbackEl, button, keypad, talkPrompts, el, params } from '../shared.js';
import { makeRng, randomSeed } from '../logic/rng.js';
import { chooseScene, layoutScene, estimateMessage, describeCount, tally, countGroups, addGroup, checkTotal } from '../logic/howmany.js';
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
  scene: null, layout: null, originalLayout: null, marked: [], estimate: null, order: [],
  showGroups: false, answerOpen: false, history: [], completion: null,
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
  state.originalLayout = state.layout;
  state.order = state.layout.items.slice().sort((a, b) => (a.y - b.y) || (a.x - b.x)).map((i) => i.id);
  state.marked = [];
  state.estimate = null;
  state.showGroups = false;
  state.answerOpen = false;
  state.history = [];
  state.completion = null;
  state.phase = 'estimate';
  renderScene();
  renderPanel();
  renderTally();
  talkBox.innerHTML = '';
}

function restartRound() {
  state.marked = [];
  state.estimate = null;
  state.showGroups = false;
  state.layout = state.originalLayout;
  state.answerOpen = false;
  state.history = [];
  state.completion = null;
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
  state.history.push(state.marked.slice());
  const idx = state.marked.indexOf(id);
  if (idx >= 0) {
    state.marked.splice(idx, 1);
  } else {
    state.marked.push(id);
  }
  refreshMarks();
  renderTally();
  refreshGroupButtons();
  if (state.marked.length === state.scene.n) finishCount();
}

function countNext() {
  if (state.phase === 'estimate') { state.phase = 'count'; renderPanel(); sceneWrap.querySelector('.cover')?.remove(); }
  const next = state.order.find((id) => !state.marked.includes(id));
  if (next !== undefined) tapItem(next);
}

function renderTally() {
  const gs = state.scene.groupSize || 10;
  const n = state.phase === 'done' ? state.scene.n : state.marked.length;
  const t = tally(n, gs);
  tallyBox.innerHTML = '';
  for (let i = 0; i < t.groups; i++) tallyBox.append(el('div', { class: `rod${gs === 5 ? ' five' : ''}`, 'data-n': gs }));
  for (let i = 0; i < t.rest; i++) tallyBox.append(el('div', { class: 'dot' }));
  if (state.phase !== 'count' && state.phase !== 'done') { tallyText.textContent = ''; return; }
  if (n === 0) { tallyText.textContent = ''; return; }
  if (state.support === 'light') { tallyText.textContent = String(n); return; }
  const plural = t.groups > 1;
  let unit;
  // A running count of six objects is not necessarily a completed row of six.
  // Row structure is described separately once the total is checked.
  if (state.scene.arrangement === 'rows') unit = `group${plural ? 's' : ''} of ${gs}`;
  else if (gs === 10) unit = plural ? 'tens' : 'ten';
  else if (gs === 5) unit = plural ? 'fives' : 'five';
  else unit = `group${plural ? 's' : ''} of ${gs}`;
  if (t.groups === 0) tallyText.textContent = `${n}`;
  else tallyText.textContent = `${t.groups} ${unit}${t.rest ? ` and ${t.rest}` : ''} = ${n}`;
}

function currentArrangement() {
  return state.showGroups ? 'groups' : state.scene.arrangement;
}

function toggleGrouping() {
  state.showGroups = !state.showGroups;
  if (state.showGroups) {
    const groupSize = state.scene.groupSize || 10;
    const grouped = { n: state.scene.n, arrangement: 'groups', groupSize,
      groups: Math.floor(state.scene.n / groupSize), remainder: state.scene.n % groupSize };
    state.layout = layoutScene(grouped, makeRng(state.seed + state.round * 7919 + 1), isPortrait() ? 1.35 : 1.6);
  } else state.layout = state.originalLayout;
  renderScene();
  renderPanel();
  if (state.phase === 'done') showFinishFeedback();
}

function groupControls() {
  const groups = countGroups(state.layout, currentArrangement());
  if (!groups.length) return null;
  const controls = el('div', { class: 'actions', id: 'count-groups', 'aria-label': 'Count a whole row or group' });
  for (const group of groups) {
    const b = button('', { onClick: () => {
      const next = addGroup(state.marked, group.ids);
      if (next.length === state.marked.length) return;
      state.history.push(state.marked.slice());
      state.marked = next;
      refreshMarks(); renderTally(); refreshGroupButtons();
      if (state.marked.length === state.scene.n) finishCount();
    } });
    b.dataset.group = String(group.id);
    controls.append(b);
  }
  return controls;
}

function refreshGroupButtons() {
  for (const group of countGroups(state.layout, currentArrangement())) {
    const b = panel.querySelector(`[data-group="${group.id}"]`);
    if (!b) continue;
    const remaining = group.ids.filter((id) => !state.marked.includes(id)).length;
    const name = `${currentArrangement() === 'rows' ? 'Row' : 'Group'} ${group.id + 1}`;
    b.textContent = remaining ? `${name}: +${remaining}` : `${name}: counted`;
    b.disabled = remaining === 0;
  }
}

function showAnswerEntry() {
  state.answerOpen = true;
  renderPanel();
  pad.el.focus();
}

function submitTotal(value) {
  const result = checkTotal(value, state.scene.n);
  if (!result.correct) {
    feedback.set('try', result.message);
    pad.clear();
    pad.el.focus();
    return;
  }
  finishCount('total');
}

function renderPanel() {
  panel.innerHTML = '';
  if (state.phase === 'estimate') {
    panel.append(el('p', { class: 'prompt', text: 'How many?' }));
    panel.append(el('p', { class: 'hint-text', text: 'Make your best estimate. Then find the total.' }));
    pad = keypad({ onDone: (v) => { state.estimate = v; state.phase = 'count'; renderPanel(); sceneWrap.querySelector('.cover')?.remove(); renderTally(); }, maxDigits: 3, doneLabel: 'That is my estimate' });
    panel.append(pad.el);
    const actions = el('div', { class: 'actions' });
    actions.append(button('Skip the estimate', { quiet: true, onClick: () => { state.phase = 'count'; renderPanel(); sceneWrap.querySelector('.cover')?.remove(); } }));
    panel.append(actions);
    feedback = feedbackEl(panel);
    setTimeout(() => pad.el.focus(), 50);
  } else if (state.phase === 'count') {
    panel.append(el('p', { class: 'prompt', text: state.answerOpen ? 'What is the total?' : 'Find the total.' }));
    panel.append(el('p', { class: 'hint-text', text: state.answerOpen
      ? 'Enter your total. You can count or use groups to check.'
      : currentArrangement() === 'scatter'
        ? `Tap each ${state.context.noun[0]}, make groups, or enter a total you worked out.`
        : 'Count whole groups, tap one at a time, or enter a total you worked out.' }));
    if (state.estimate !== null) panel.append(el('p', { class: 'muted', text: `Your estimate: ${state.estimate}` }));
    if (state.answerOpen) {
      pad = keypad({ onDone: submitTotal, maxDigits: 3, doneLabel: 'Check total' });
      panel.append(pad.el);
    }
    const actions = el('div', { class: 'actions' });
    if (!state.answerOpen) actions.append(button('I know the total', { primary: true, onClick: showAnswerEntry }));
    else actions.append(button('Back to counting', { quiet: true, onClick: () => { state.answerOpen = false; renderPanel(); } }));
    if (state.scene.arrangement === 'scatter') {
      actions.append(button(state.showGroups ? 'See original layout' : `Make groups of ${state.scene.groupSize || 10}`, { onClick: toggleGrouping }));
    }
    actions.append(button('Count one', { quiet: true, onClick: countNext }));
    actions.append(button('Undo', { quiet: true, onClick: () => {
      if (!state.history.length) return;
      state.marked = state.history.pop(); refreshMarks(); renderTally(); refreshGroupButtons();
    } }));
    panel.append(actions);
    const groups = groupControls();
    if (groups) panel.append(groups);
    feedback = feedbackEl(panel);
    refreshGroupButtons();
  } else {
    panel.append(el('p', { class: 'prompt', text: `There are ${state.scene.n}.` }));
    feedback = feedbackEl(panel);
    const actions = el('div', { class: 'actions' });
    actions.append(button('Next', { primary: true, onClick: newRound }));
    actions.append(button('Try this collection again', { quiet: true, onClick: restartRound }));
    if (state.scene.arrangement === 'scatter') actions.append(button(state.showGroups ? 'See original layout' : `See groups of ${state.scene.groupSize || 10}`, { onClick: toggleGrouping }));
    panel.append(actions);
  }
}

function finishCount(method = 'count') {
  const n = state.scene.n;
  if (method !== 'total' && state.marked.length < n) {
    const missing = n - state.marked.length;
    state.layout.items.forEach((it) => {
      if (!state.marked.includes(it.id)) sceneWrap.querySelector(`.item[data-id="${it.id}"]`).classList.add('missed');
    });
    feedback.set('try', `You counted ${state.marked.length}. ${missing} ${missing === 1 ? 'has' : 'have'} not been counted yet. ${missing === 1 ? 'It is' : 'They are'} marked with a dashed ring.`);
    return;
  }
  state.completion = method;
  state.phase = 'done';
  renderPanel();
  renderTally();
  showFinishFeedback();
}

function showFinishFeedback() {
  const n = state.scene.n;
  const parts = [];
  if (state.completion === 'reveal') parts.push('Teacher reveal.');
  if (state.estimate !== null) parts.push(estimateMessage(state.estimate, n));
  else parts.push(`There are ${n}.`);
  const groupedScene = state.showGroups ? { ...state.scene, arrangement: 'groups', groups: Math.floor(n / state.scene.groupSize), remainder: n % state.scene.groupSize } : state.scene;
  feedback.set(state.completion === 'reveal' ? 'info' : 'ok', parts.join(' '), `One way to check: ${describeCount(groupedScene)}`);
  talkBox.innerHTML = '';
  talkBox.append(talkPrompts([
    state.estimate !== null ? 'How did your estimate compare with the total?' : 'How did you work out the total?',
    state.scene.arrangement === 'rows' ? 'How could you use the rows to check without counting every one?' : `Can you check the total using ${state.scene.groupSize === 5 ? 'fives' : 'tens'}?`,
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
    const group = countGroups(state.layout, currentArrangement()).find((g) => g.ids.some((id) => !state.marked.includes(id)));
    if (group) {
      group.ids.forEach((id) => sceneWrap.querySelector(`.item[data-id="${id}"]`).classList.add('hinted'));
      feedback?.set('info', `The dotted rings show ${group.ids.length} in one ${currentArrangement() === 'rows' ? 'row' : 'group'}. Use the group button or count these one at a time.`);
      return;
    }
    const next = state.order.find((id) => !state.marked.includes(id));
    if (next !== undefined) sceneWrap.querySelector(`.item[data-id="${next}"]`).classList.add('hinted');
    feedback?.set('info', `The dotted ring shows one that has not been counted yet.`);
  }
}

function reveal() {
  state.marked = state.order.slice();
  state.phase = 'count';
  refreshMarks();
  finishCount('reveal');
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
window.render_game_to_text = () => JSON.stringify({
  activity: 'how-many', phase: state.phase, arrangement: currentArrangement(),
  total: state.phase === 'done' ? state.scene.n : null,
  counted: state.marked.length, estimate: state.estimate,
  answerEntry: state.answerOpen, completion: state.completion,
  groups: countGroups(state.layout, currentArrangement()).map((g) => ({
    id: g.id, size: g.ids.length, uncounted: g.ids.filter((id) => !state.marked.includes(id)).length,
  })),
});
newRound();
