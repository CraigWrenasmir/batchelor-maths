// Grow the pattern.  Build the next step of a visual growing pattern, then
// predict a far step and explain the rule. Also continues repeating patterns.
import { mountShell, setting, feedbackEl, button, keypad, talkPrompts, el, params } from '../shared.js';
import { makeRng, randomSeed } from '../logic/rng.js';
import { GROWING, countAt, judgeArrangement, predictMessage, bounds, repeatingSequence, nextInRepeating } from '../logic/patterns.js';
import { PATTERN_PRESETS, patternPreset } from '../../content/patterns.js';
import { svgEl } from './scenes.js';

const SHAPES = {
  A: { name: 'green circle', svg: '<circle cx="50" cy="50" r="40" fill="#2f5f3f"/>' },
  B: { name: 'orange triangle', svg: '<path d="M50 10 L92 88 L8 88 Z" fill="#b65a2e"/>' },
  C: { name: 'blue square', svg: '<rect x="12" y="12" width="76" height="76" rx="8" fill="#2f6f8a"/>' },
  D: { name: 'brown diamond', svg: '<path d="M50 6 L94 50 L50 94 L6 50 Z" fill="#b8956a"/>' },
};

const state = {
  preset: patternPreset(setting('preset', 'grow')),
  support: setting('support', 'full'),
  seed: parseInt(setting('seed', ''), 10) || randomSeed(),
  round: 0,
  pattern: null, buildStep: 4, built: new Set(), stage: 'build', predictIdx: 0, partsShown: false,
  compared: false, alternateKept: false, revealed: false,
  unit: '', shown: [], slots: [], currentSlot: 0,
};

const shell = mountShell({
  title: 'Grow the pattern',
  activity: 'grow-the-pattern',
  onNewLearner: () => { state.seed = randomSeed(); state.round = 0; newRound(); },
  teacherControls: [
    { key: 'h', label: 'Hint', onClick: () => hint() },
    { key: 'r', label: 'Reveal', onClick: () => reveal() },
    { key: 'n', label: 'Next', onClick: () => newRound() },
    { key: 's', label: 'Start again', onClick: () => newRound(true) },
  ],
});
shell.setDrawer(drawerContent);
const stageEl = shell.stage;
stageEl.classList.add('pattern-activity');
stageEl.classList.toggle('growing-pattern', state.preset.mode !== 'repeat');
stageEl.innerHTML = `
  <div class="two-col">
    <div class="panel"><p class="prompt" id="prompt"></p><p class="hint-text" id="sub"></p><div id="board"></div></div>
    <div class="panel" id="side"></div>
  </div>
  <div id="talk"></div>
`;
const promptEl = stageEl.querySelector('#prompt');
const subEl = stageEl.querySelector('#sub');
const board = stageEl.querySelector('#board');
const side = stageEl.querySelector('#side');
const talkBox = stageEl.querySelector('#talk');
let feedback;

function newRound(sameSeed = false) {
  if (!sameSeed) state.round += 1;
  const rng = makeRng(state.seed + state.round * 15485863);
  talkBox.innerHTML = '';
  if (state.preset.mode === 'repeat') {
    state.unit = rng.pick(state.preset.units);
    // Show two full repeats plus a bit, then ask for the next three.
    const shownLen = state.unit.length * 2 + (state.unit.length > 2 ? 1 : 0);
    state.shown = repeatingSequence(state.unit, shownLen);
    state.slots = [null, null, null];
    state.currentSlot = 0;
    state.stage = 'repeat';
    promptEl.textContent = 'What comes next?';
    subEl.textContent = 'Tap a shape for the empty box.';
    renderRepeat();
    return;
  }
  const id = rng.pick(state.preset.patterns);
  state.pattern = GROWING.find((p) => p.id === id);
  state.buildStep = 4;
  state.built = new Set();
  state.stage = 'build';
  state.predictIdx = 0;
  state.partsShown = false;
  state.compared = false;
  state.alternateKept = false;
  state.revealed = false;
  promptEl.textContent = `Build step ${state.buildStep}.`;
  subEl.textContent = 'Tap squares to make the next shape.';
  renderGrow();
}

// ----- Growing patterns -----
function tileSvg(cells, { showParts = false, interactive = false, gridBounds = null } = {}) {
  const b = gridBounds || bounds(cells);
  const size = interactive ? 48 : 24, pad = 4;
  const w = b.w * size + pad * 2, h = b.h * size + pad * 2;
  const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, width: w, height: h, style: interactive ? `--grid-cols:${b.w};--grid-rows:${b.h}` : `width:calc(${b.w + pad * 2 / size} * var(--preview-tile-size, 1.4em));height:auto` });
  if (interactive) {
    for (let x = b.minX; x <= b.maxX; x++) for (let y = b.minY; y <= b.maxY; y++) {
      const k = `${x},${y}`;
      const r = svgEl('rect', { class: `cell${state.built.has(k) ? ' on' : ''}`, x: pad + (x - b.minX) * size, y: pad + (b.maxY - y) * size, width: size, height: size, rx: 3, role: 'button', tabindex: '0', 'aria-pressed': String(state.built.has(k)), 'aria-label': `column ${x - b.minX + 1}, row ${b.maxY - y + 1}`, 'data-cell': k });
      const toggle = () => { if (state.built.has(k)) state.built.delete(k); else state.built.add(k); r.classList.toggle('on'); r.setAttribute('aria-pressed', String(state.built.has(k))); updateBuildCount(); };
      r.addEventListener('click', toggle);
      r.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
      svg.append(r);
    }
    return svg;
  }
  for (const c of cells) {
    svg.append(svgEl('rect', { class: `tile ${showParts ? c.part : 'plain'}`, x: pad + (c.x - b.minX) * size, y: pad + (b.maxY - c.y) * size, width: size, height: size, rx: 3 }));
  }
  return svg;
}

function learnerCells() {
  return [...state.built].map((key) => {
    const [x, y] = key.split(',').map(Number);
    return { x, y, part: 'plain' };
  });
}

function comparisonShape(label, cells, showParts = false) {
  const box = el('div', { class: 'step comparison-shape' });
  box.append(el('div', { class: 'step-label', text: label }));
  if (cells.length) box.append(tileSvg(cells, { showParts }));
  else box.append(el('p', { text: 'No tiles yet.' }));
  box.append(el('div', { class: 'muted small', text: `${cells.length} tiles` }));
  return box;
}

function renderGrow() {
  board.innerHTML = '';
  board.classList.add('pattern-board');
  board.parentElement.classList.toggle('pattern-main-building', state.stage === 'build');
  stageEl.querySelector('.two-col').classList.toggle('building-layout', state.stage === 'build');
  const steps = el('div', { class: 'steps' });
  const p = state.pattern;
  // A shared scale keeps the growth visible across all three examples.
  steps.style.setProperty('--max-preview-cols', Math.max(...Array.from({ length: state.buildStep - 1 }, (_, i) => bounds(p.cells(i + 1)).w)));
  for (let n = 1; n < state.buildStep; n++) {
    const s = el('div', { class: 'step' });
    s.append(el('div', { class: 'step-label', text: `Step ${n}` }));
    s.append(tileSvg(p.cells(n), { showParts: state.partsShown }));
    s.append(el('div', { class: 'muted small', text: `${countAt(p, n)} tiles` }));
    steps.append(s);
  }
  const buildCells = p.cells(state.buildStep);
  const b = bounds(buildCells);
  const gridBounds = { ...b };
  if (state.stage === 'build') {
    // Give one spare row/column of space on growing sides so the answer is not given away by grid size.
    gridBounds.maxX += 1; gridBounds.maxY += 1; gridBounds.w += 1; gridBounds.h += 1;
    if (b.minX < 0) { gridBounds.minX -= 1; gridBounds.w += 1; }
    if (b.minY < 0) { gridBounds.minY -= 1; gridBounds.h += 1; }
  }
  board.append(steps);
  if (state.stage === 'build') {
    const s = el('div', { class: 'step build' });
    s.append(el('div', { class: 'step-label', text: `Your step ${state.buildStep}` }));
    s.append(el('p', { class: 'small muted grid-scroll-hint', text: 'Tap again to remove a tile.' }));
    const scroll = el('div', { class: 'pattern-grid', role: 'region', 'aria-label': 'Tile building grid. Scroll sideways if needed.', tabindex: '0' });
    scroll.append(tileSvg(buildCells, { interactive: true, gridBounds }));
    s.append(scroll);
    s.append(el('div', { class: 'muted small', id: 'build-count', text: `Tiles: ${state.built.size}` }));
    board.append(s);
  } else {
    const comparison = el('div', { class: 'pattern-comparison' });
    comparison.append(comparisonShape('Your shape', learnerCells()));
    comparison.append(comparisonShape(`Step ${state.buildStep}`, buildCells, state.partsShown));
    board.append(comparison);
    if (state.alternateKept) board.append(el('p', { class: 'small', text: 'Keep your shape. Use the other pattern for the next question.' }));
    if (state.revealed) board.append(el('p', { class: 'small', text: 'The teacher has shown step 4.' }));
  }
  renderGrowSide();
}

function updateBuildCount() {
  const c = board.querySelector('#build-count');
  if (c) c.textContent = `Tiles: ${state.built.size}`;
}

function valuesTable(askStep) {
  const p = state.pattern;
  const steps = [1, 2, 3, 4, ...state.preset.predict];
  const t = el('table', { class: 'values' });
  t.innerHTML = `<caption class="visually-hidden">Table of values</caption><tr><th scope="row">Step</th>${steps.map((n) => `<th scope="col">${n}</th>`).join('')}</tr>` +
    `<tr><th scope="row">Tiles</th>${steps.map((n) => {
      if (n <= 4) return `<td>${countAt(p, n)}</td>`;
      const i = state.preset.predict.indexOf(n);
      if (i < state.predictIdx) return `<td>${countAt(p, n)}</td>`;
      return `<td class="${n === askStep ? 'ask' : ''}">?</td>`;
    }).join('')}</tr>`;
  const wrap = el('div', { class: 'values-wrap', role: 'region', 'aria-label': 'Table of values. Scroll sideways if needed.', tabindex: '0' });
  wrap.append(t);
  return wrap;
}

function renderGrowSide() {
  side.innerHTML = '';
  side.hidden = state.stage === 'build';
  const p = state.pattern;
  if (state.stage === 'compare') {
    promptEl.textContent = 'Compare the shapes.';
    subEl.textContent = 'Same number of tiles. Different shape.';
    side.append(el('p', { class: 'prompt', text: 'Change your shape?' }));
    const actions = el('div', { class: 'actions' });
    actions.append(button('Change it', { primary: true, onClick: () => {
      state.stage = 'build';
      promptEl.textContent = `Build step ${state.buildStep}.`;
      subEl.textContent = 'Tap squares to change your shape.';
      renderGrow();
    } }));
    actions.append(button('Keep it', { onClick: () => {
      state.alternateKept = true;
      startPredictions();
      feedback.set('info', 'Your shape is saved. Look at the other pattern.');
    } }));
    side.append(actions);
    feedback = feedbackEl(side);
    return;
  }
  if (state.stage === 'build') {
    const controls = el('div', { class: 'pattern-build-controls' });
    const actions = el('div', { class: 'actions' });
    actions.append(button('Check', { primary: true, onClick: checkBuild }));
    actions.append(button('Clear', { quiet: true, onClick: () => { state.built.clear(); renderGrow(); } }));
    controls.append(actions);
    feedback = feedbackEl(controls);
    board.append(controls);
    return;
  }
  const askStep = state.preset.predict[state.predictIdx];
  if (state.stage === 'predict' && askStep !== undefined) {
    promptEl.textContent = 'How does the pattern grow?';
    subEl.textContent = 'Use step 4 to help.';
    side.append(el('p', { class: 'prompt', text: `How many at step ${askStep}?` }));
    side.append(valuesTable(askStep));
    const pad = keypad({ onDone: (v) => checkPredict(v), maxDigits: 4, doneLabel: 'Check' });
    side.append(pad.el);
    feedback = feedbackEl(side);
    setTimeout(() => pad.el.focus(), 50);
    return;
  }
  side.append(el('p', { class: 'prompt', text: 'The rule' }));
  promptEl.textContent = 'How does it grow?';
  subEl.textContent = 'Tell someone what changes.';
  side.append(valuesTable());
  if (state.preset.showRule || state.support === 'full') side.append(el('p', { text: p.ruleWords }));
  const actions = el('div', { class: 'actions' });
  actions.append(button('Next', { primary: true, onClick: () => newRound() }));
  side.append(actions);
  feedback = feedbackEl(side);
}

function checkBuild() {
  const p = state.pattern;
  const j = judgeArrangement(p, state.buildStep, learnerCells());
  if (j.correct) {
    state.alternateKept = false;
    startPredictions();
    feedback.set('ok', `Your shape matches. ${j.expected} tiles.`, p.nonlinear ? 'Each new column is one taller.' : `Each step adds ${p.a} tiles.`);
  } else if (j.countCorrect) {
    state.stage = 'compare';
    state.compared = true;
    state.partsShown = true;
    renderGrow();
    feedback.set('info', 'The number is right. Look at the shapes.');
  } else {
    feedback.set('try', state.built.size < j.expected ? 'Add more tiles.' : 'Remove some tiles.', `Look at step ${state.buildStep - 1}. How does it grow?`);
  }
}

function startPredictions() {
  state.stage = 'predict';
  state.partsShown = true;
  renderGrow();
}

function checkPredict(v) {
  const p = state.pattern;
  const askStep = state.preset.predict[state.predictIdx];
  const ok = v === countAt(p, askStep);
  if (ok) {
    state.predictIdx += 1;
    if (state.predictIdx >= state.preset.predict.length) { state.stage = 'rule'; addTalk(); }
    renderGrowSide();
    feedback.set('ok', predictMessage(p, askStep, v));
  } else {
    feedback.set('try', `Try again. ${p.nonlinear ? 'Each new column is one taller.' : `Each step adds ${p.a} tiles.`}`);
  }
}

function addTalk() {
  talkBox.innerHTML = '';
  talkBox.append(talkPrompts([
    state.pattern.nonlinear ? 'How tall is the next column?' : 'Which tiles stay? Which are new?',
    'How many tiles at step 100?',
    'Can you make a different pattern with these totals?',
  ]));
}

// ----- Repeating patterns -----
function shapeEl(letter, size = 'shape') {
  const d = el('span', { class: size, role: 'img', 'aria-label': SHAPES[letter].name });
  d.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true">${SHAPES[letter].svg}</svg>`;
  return d;
}

function renderRepeat() {
  board.innerHTML = '';
  const row = el('div', { class: 'shape-row', role: 'list', 'aria-label': 'The pattern so far' });
  state.shown.forEach((l) => { const s = shapeEl(l); s.setAttribute('role', 'listitem'); row.append(s); });
  state.slots.forEach((l, i) => {
    const slot = el('button', { class: `slot${l ? ' filled' : ''}${state.currentSlot === i ? ' current' : ''}`, type: 'button', 'aria-label': `Box ${i + 1}${l ? `: ${SHAPES[l].name}` : ', empty'}` });
    if (l) slot.append(shapeEl(l));
    slot.addEventListener('click', () => { state.currentSlot = i; renderRepeat(); });
    row.append(slot);
  });
  board.append(row);
  side.innerHTML = '';
  side.append(el('p', { class: 'prompt', text: 'Tap a shape' }));
  const pal = el('div', { class: 'shape-row palette' });
  const letters = [...new Set(state.unit.split(''))].concat(state.unit.length < 3 ? ['C'] : []);
  letters.forEach((l) => {
    const b = button('', { onClick: () => {
      state.slots[state.currentSlot] = l;
      const nextEmpty = state.slots.findIndex((x) => x === null);
      state.currentSlot = nextEmpty >= 0 ? nextEmpty : state.currentSlot;
      renderRepeat();
    } });
    b.setAttribute('aria-label', SHAPES[l].name);
    b.append(shapeEl(l));
    pal.append(b);
  });
  side.append(pal);
  const actions = el('div', { class: 'actions' });
  const check = button('Check', { primary: true, onClick: checkRepeat });
  check.disabled = state.slots.some((x) => x === null);
  actions.append(check);
  actions.append(button('Next', { quiet: true, onClick: () => newRound() }));
  side.append(actions);
  feedback = feedbackEl(side);
}

function unitWords() {
  return state.unit.split('').map((l) => SHAPES[l].name).join(', ');
}

function checkRepeat() {
  const start = state.shown.length;
  const wrong = state.slots.map((l, i) => l === nextInRepeating(state.unit, start + i) ? null : i).filter((x) => x !== null);
  if (wrong.length === 0) {
    feedback.set('ok', `The pattern matches. ${unitWords()} repeats.`);
    talkBox.innerHTML = '';
    talkBox.append(talkPrompts(['Clap the pattern.', 'What is the 20th shape?', 'Show the pattern with actions.']));
  } else {
    feedback.set('try', `${wrong.length === 1 ? 'One box needs' : `${wrong.length} boxes need`} a change. Say the pattern out loud.`);
  }
}

function hint() {
  if (state.stage === 'repeat') {
    feedback.set('info', `The pattern repeats every ${state.unit.length} shapes: ${unitWords()}.`);
    return;
  }
  state.partsShown = true;
  renderGrow();
  const p = state.pattern;
  feedback.set('info', p.nonlinear ? 'Look at the new orange column. Each new column is one taller.' : `${p.b > 0 ? 'Blue stays the same. ' : ''}Orange grows. Each step adds ${p.a} tiles.`);
}

function reveal() {
  if (state.stage === 'repeat') {
    const start = state.shown.length;
    state.slots = state.slots.map((_, i) => nextInRepeating(state.unit, start + i));
    renderRepeat();
    feedback.set('info', `The next three are: ${state.slots.map((l) => SHAPES[l].name).join(', ')}.`);
    return;
  }
  const p = state.pattern;
  state.stage = 'rule';
  state.revealed = true;
  state.predictIdx = state.preset.predict.length;
  state.partsShown = true;
  renderGrow();
  feedback.set('info', `Step ${state.buildStep} has ${countAt(p, state.buildStep)} tiles. ${p.ruleWords}`);
  addTalk();
}

function drawerContent() {
  const sheet = el('div');
  sheet.append(el('h2', { id: 'drawer-title', text: 'Set up: Grow the pattern' }));
  sheet.append(el('p', { class: 'small muted', text: 'These choices are for the teacher. The student screen only shows the activity.' }));
  const presetSel = el('select', { id: 'sel-preset' });
  PATTERN_PRESETS.forEach((p) => presetSel.append(el('option', { value: p.id, text: p.label, ...(p.id === state.preset.id ? { selected: '' } : {}) })));
  const note = el('p', { class: 'codes' });
  const showNote = () => { const p = patternPreset(presetSel.value); note.textContent = `Curriculum: ${p.codes.join(', ')}.`; };
  presetSel.addEventListener('change', showNote); showNote();
  const supSel = el('select', { id: 'sel-support' });
  [['full', 'Full: rule in words at the end'], ['light', 'Light: table of values only']].forEach(([v, t]) => supSel.append(el('option', { value: v, text: t, ...(v === state.support ? { selected: '' } : {}) })));
  const seedIn = el('input', { type: 'number', id: 'in-seed', value: String(state.seed), min: '1' });
  sheet.append(el('label', { for: 'sel-preset', text: 'Patterns' }), presetSel, note);
  sheet.append(el('label', { for: 'sel-support', text: 'Support' }), supSel);
  sheet.append(el('label', { for: 'in-seed', text: 'Round code (same code gives the same rounds on every device)' }), seedIn);
  const actions = el('div', { class: 'actions' });
  actions.append(button('Apply', { primary: true, onClick: () => {
    const p = new URLSearchParams(params);
    p.set('preset', presetSel.value); p.set('support', supSel.value); p.set('seed', seedIn.value || String(randomSeed()));
    location.search = p.toString();
  } }));
  actions.append(button('Cancel', { quiet: true, onClick: shell.closeDrawer }));
  actions.append(el('a', { class: 'btn btn-quiet', href: `../teacher.html?activity=grow-the-pattern&${params.toString()}`, text: 'Teacher page' }));
  sheet.append(actions);
  return sheet;
}

newRound();

window.render_game_to_text = () => JSON.stringify({
  activity: 'grow-the-pattern',
  preset: state.preset.id,
  stage: state.stage,
  pattern: state.pattern?.id || null,
  buildStep: state.buildStep,
  coordinateSystem: 'x increases right; y increases up',
  built: learnerCells(),
  expectedCells: state.pattern?.cells(state.buildStep) || [],
  compared: state.compared,
  alternateKept: state.alternateKept,
  revealed: state.revealed,
  predictStep: state.preset.predict?.[state.predictIdx] || null,
  shown: state.shown,
  slots: state.slots,
  feedback: feedback?.el.textContent || '',
});
