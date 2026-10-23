// Where does it go?  Place numbers on an empty number line, or find a
// mystery number using "bigger / smaller" clues.
import { mountShell, setting, feedbackEl, button, talkPrompts, el, params } from '../shared.js';
import { makeRng, randomSeed } from '../logic/rng.js';
import { lineFor, generateCards, toFrac, fromFrac, snapValue, formatValue, judgePlacement, placementMessage, mysteryJudge, mysteryMessage, narrow, benchmarkText } from '../logic/numberline.js';
import { LINE_PRESETS, linePreset } from '../../content/number-line.js';
import { svgEl } from './scenes.js';

const state = {
  preset: linePreset(setting('preset', 'to100')),
  game: setting('game', 'place') === 'mystery' ? 'mystery' : 'place',
  support: setting('support', 'full'),
  seed: parseInt(setting('seed', ''), 10) || randomSeed(),
  round: 0,
  cards: [], placed: {}, current: null, checked: 0,
  secret: null, interval: null, guesses: [], pending: null,
};

const shell = mountShell({
  title: 'Where does it go?',
  activity: 'where-does-it-go',
  onNewLearner: () => { state.seed = randomSeed(); state.round = 0; newRound(); },
  teacherControls: [
    { key: 'h', label: 'Hint', onClick: () => hint() },
    { key: 'r', label: 'Reveal', onClick: () => reveal() },
    { key: 'n', label: 'Next', onClick: () => newRound() },
    { key: 's', label: 'Start again', onClick: () => newRound(true) },
  ],
});
shell.setDrawer(drawerContent);
const stage = shell.stage;
stage.innerHTML = `
  <div class="panel">
    <p class="prompt" id="prompt"></p>
    <p class="hint-text" id="sub"></p>
    <div class="cards" id="cards"></div>
    <div class="line-wrap"><svg class="line-svg" id="line" tabindex="0" role="application" aria-label="Number line. Use left and right arrow keys to move, Enter to place."></svg></div>
    <div class="actions" id="actions"></div>
    <div id="fb"></div>
  </div>
  <div id="talk"></div>
`;
const promptEl = stage.querySelector('#prompt');
const subEl = stage.querySelector('#sub');
const cardsEl = stage.querySelector('#cards');
const lineSvg = stage.querySelector('#line');
const actionsEl = stage.querySelector('#actions');
const talkBox = stage.querySelector('#talk');
const feedback = feedbackEl(stage.querySelector('#fb'));

const W = 1200, H = 230, X0 = 90, X1 = 1110, Y = 150;
const line = () => lineFor(state.preset);
const xOf = (v) => X0 + toFrac(v, state.preset.min, state.preset.max) * (X1 - X0);
const vOf = (x) => snapValue(fromFrac((x - X0) / (X1 - X0), state.preset.min, state.preset.max), state.preset);

function newRound(sameSeed = false) {
  if (!sameSeed) state.round += 1;
  const rng = makeRng(state.seed + state.round * 104729);
  state.placed = {}; state.checked = 0; state.guesses = []; state.pending = null;
  feedback.clear(); talkBox.innerHTML = '';
  if (state.game === 'mystery') {
    const p = state.preset;
    const steps = Math.round((p.max - p.min) / (p.resolution ?? 1));
    state.secret = +(p.min + rng.int(1, steps - 1) * (p.resolution ?? 1)).toFixed(6);
    state.interval = [p.min, p.max];
    promptEl.textContent = 'Find the mystery number.';
    subEl.textContent = `It is somewhere between ${formatValue(p.min, p)} and ${formatValue(p.max, p)}. Tap the line to guess.`;
  } else {
    state.cards = generateCards(state.preset, state.preset.cards, rng);
    state.current = state.cards[0].id;
    promptEl.textContent = 'Where does it go?';
    subEl.textContent = 'Choose a card, then tap the line where it belongs. Check when they are all placed.';
  }
  renderCards();
  renderLine();
  renderActions();
}

function cardFace(card) {
  if (card.kind === 'dots') {
    const n = Math.round(card.value);
    const cols = n > 10 ? 10 : 5, rows = Math.ceil(n / cols) || 1;
    let dots = '';
    for (let i = 0; i < n; i++) dots += `<circle cx="${(i % cols) * 12 + 7}" cy="${Math.floor(i / cols) * 12 + 7}" r="4.5" fill="#2f6f8a"/>`;
    return `<svg viewBox="0 0 ${cols * 12 + 2} ${rows * 12 + 2}" aria-hidden="true">${dots}</svg><span class="visually-hidden">${n} dots</span>`;
  }
  if (card.kind === 'label') return `<span>${card.display}</span><span class="sub">${card.detail}</span>`;
  if (state.preset.kind === 'fraction' && card.display.includes('/')) {
    const [a, b] = card.display.split('/');
    return `<span class="frac" aria-label="${a} over ${b}"><span>${a}</span><span>${b}</span></span>`;
  }
  return `<span>${card.display}</span>`;
}

function renderCards() {
  cardsEl.innerHTML = '';
  if (state.game === 'mystery') {
    const g = state.guesses.length;
    cardsEl.append(el('span', { class: 'muted', text: g ? `Guesses: ${g}` : '' }));
    return;
  }
  for (const c of state.cards) {
    const b = el('button', { class: `card${state.placed[c.id] !== undefined ? ' placed' : ''}`, type: 'button', 'aria-pressed': String(state.current === c.id) });
    b.innerHTML = cardFace(c);
    b.addEventListener('click', () => { state.current = c.id; renderCards(); renderLine(); renderActions(); });
    cardsEl.append(b);
  }
}

function renderLine() {
  const p = state.preset;
  const L = line();
  lineSvg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  lineSvg.innerHTML = '';
  const big = document.documentElement.dataset.mode === 'class';
  const fs = big ? 40 : 30;
  lineSvg.append(svgEl('line', { class: 'track-bg', x1: X0, y1: Y, x2: X1, y2: Y }));
  // Ruled-out zones for mystery mode
  if (state.game === 'mystery') {
    const [lo, hi] = state.interval;
    if (lo > p.min) lineSvg.append(svgEl('rect', { class: 'ruled-out', x: X0, y: Y - 20, width: xOf(lo) - X0, height: 40, rx: 8 }));
    if (hi < p.max) lineSvg.append(svgEl('rect', { class: 'ruled-out', x: xOf(hi), y: Y - 20, width: X1 - xOf(hi), height: 40, rx: 8 }));
  }
  lineSvg.append(svgEl('line', { class: 'track', x1: X0, y1: Y, x2: X1, y2: Y }));
  for (const t of L.ticks) {
    const major = L.labelled.includes(t);
    lineSvg.append(svgEl('line', { class: `tick${major ? '' : ' minor'}`, x1: xOf(t), y1: Y - (major ? 22 : 12), x2: xOf(t), y2: Y + (major ? 22 : 12) }));
  }
  const labels = state.support === 'light' ? [p.min, p.max] : L.labelled;
  for (const t of labels) {
    if (!L.ticks.includes(t)) lineSvg.append(svgEl('line', { class: 'tick', x1: xOf(t), y1: Y - 22, x2: xOf(t), y2: Y + 22 }));
    const txt = svgEl('text', { class: 'tick-label', x: xOf(t), y: Y + 60, 'font-size': fs });
    txt.textContent = formatValue(t, p);
    lineSvg.append(txt);
  }
  // Mystery guesses
  if (state.game === 'mystery') {
    for (const g of state.guesses) {
      const x = xOf(g.value);
      const m = svgEl('g', { class: 'marker' });
      m.append(svgEl('line', { x1: x, y1: Y - 10, x2: x, y2: Y - 48, stroke: '#4b5b53', 'stroke-width': 3 }));
      const t = svgEl('text', { class: 'pin-text', x, y: Y - 70, 'font-size': fs * 0.8, fill: '#4b5b53' });
      t.textContent = formatValue(g.value, p);
      m.append(t);
      lineSvg.append(m);
    }
    if (state.pending !== null) drawPin(state.pending, formatValue(state.pending, p), 'current');
    if (state.guesses.some((g) => g.verdict === 'found')) drawTruth(state.secret);
    return;
  }
  // Placement markers
  for (const c of state.cards) {
    if (state.placed[c.id] === undefined) continue;
    const grade = c.grade || '';
    drawPin(state.placed[c.id], c.revealed || grade === 'spot' || grade === 'close' ? c.display : (c.kind === 'dots' ? '•' : c.kind === 'label' ? c.display.split(' ')[0] : c.display), `${state.current === c.id ? 'current ' : ''}${grade}`, c.id);
    if (c.showTruth) drawTruth(c.value);
  }
}

function drawPin(value, label, cls, id) {
  const x = xOf(value);
  const big = document.documentElement.dataset.mode === 'class';
  const r = big ? 38 : 30;
  const m = svgEl('g', { class: `marker ${cls}`, 'data-id': id ?? '' });
  m.append(svgEl('line', { x1: x, y1: Y, x2: x, y2: Y - 44, stroke: '#2f5f3f', 'stroke-width': 4 }));
  m.append(svgEl('circle', { class: 'pin', cx: x, cy: Y - 48 - r, r }));
  const t = svgEl('text', { class: 'pin-text', x, y: Y - 48 - r, 'font-size': String(label).length > 3 ? r * 0.7 : r * 0.95 });
  t.textContent = label;
  m.append(t);
  lineSvg.append(m);
}

function drawTruth(value) {
  const x = xOf(value);
  lineSvg.append(svgEl('path', { class: 'truth', d: `M${x - 16} ${Y + 32} L${x + 16} ${Y + 32} L${x} ${Y + 6} Z` }));
}

function pointerValue(e) {
  const pt = lineSvg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  const loc = pt.matrixTransform(lineSvg.getScreenCTM().inverse());
  return vOf(Math.min(X1, Math.max(X0, loc.x)));
}

let dragging = false;
lineSvg.addEventListener('pointerdown', (e) => {
  dragging = true;
  lineSvg.setPointerCapture(e.pointerId);
  setPosition(pointerValue(e));
});
lineSvg.addEventListener('pointermove', (e) => { if (dragging) setPosition(pointerValue(e)); });
lineSvg.addEventListener('pointerup', () => { dragging = false; });
lineSvg.addEventListener('pointercancel', () => { dragging = false; });
lineSvg.addEventListener('keydown', (e) => {
  const p = state.preset;
  const step = (p.resolution ?? 1) * (e.shiftKey ? 10 : 1);
  let v = state.game === 'mystery' ? state.pending : state.placed[state.current];
  if (v === undefined || v === null) v = snapValue((p.min + p.max) / 2, p);
  if (e.key === 'ArrowLeft') { setPosition(snapValue(v - step, p)); e.preventDefault(); }
  else if (e.key === 'ArrowRight') { setPosition(snapValue(v + step, p)); e.preventDefault(); }
  else if (e.key === 'Home') { setPosition(p.min); e.preventDefault(); }
  else if (e.key === 'End') { setPosition(p.max); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (state.game === 'mystery') guess();
    else { const next = state.cards.find((c) => state.placed[c.id] === undefined); if (next) { state.current = next.id; renderCards(); renderLine(); renderActions(); } }
  }
});

function setPosition(v) {
  if (state.game === 'mystery') {
    state.pending = v;
  } else {
    if (state.current === null) return;
    const c = state.cards.find((x) => x.id === state.current);
    if (c.grade === 'spot' || c.revealed) return; // only exact or explicitly revealed answers lock
    state.placed[state.current] = v;
    c.grade = '';
  }
  renderLine();
  renderCards();
  renderActions();
}

function renderActions() {
  actionsEl.innerHTML = '';
  const current = state.game === 'mystery' ? state.pending : state.placed[state.current];
  const locked = state.game === 'mystery' ? state.guesses.some(g => g.verdict === 'found') : state.cards.find(c => c.id === state.current)?.grade === 'spot';
  const adjust = el('div', { class: 'line-adjust' });
  const shift = direction => {
    const start = current ?? snapValue((state.preset.min + state.preset.max) / 2, state.preset);
    setPosition(snapValue(start + direction * (state.preset.resolution ?? 1), state.preset));
    // Re-rendering the controls must not strand keyboard users.
    actionsEl.querySelector(direction < 0 ? '[data-adjust="left"]' : '[data-adjust="right"]')?.focus();
  };
  for (const [direction, name] of [[-1, 'left'], [1, 'right']]) {
    const b = button(`Move ${name}`, { quiet: true, onClick: () => shift(direction) });
    b.dataset.adjust = name; b.disabled = locked; adjust.append(b);
  }
  adjust.append(el('span', { class: 'small', text: current == null ? 'Tap the line, or use Move left / right.' : `Marker at ${formatValue(current, state.preset)}` }));
  actionsEl.append(adjust);
  if (state.game === 'mystery') {
    const g = button(state.pending === null ? 'Tap the line to choose a guess' : `Guess ${formatValue(state.pending, state.preset)}`, { primary: true, onClick: guess });
    g.disabled = state.pending === null || state.guesses.some((x) => x.verdict === 'found');
    actionsEl.append(g);
    actionsEl.append(button('New mystery', { quiet: true, onClick: () => newRound() }));
    return;
  }
  const allPlaced = state.cards.every((c) => state.placed[c.id] !== undefined);
  const check = button(state.checked === 0 ? 'Check' : 'Check again', { primary: true, onClick: check_ });
  check.disabled = !allPlaced || state.cards.every((c) => c.grade === 'spot');
  actionsEl.append(check);
  actionsEl.append(button('Next', { quiet: true, onClick: () => newRound() }));
}

function check_() {
  state.checked += 1;
  const p = state.preset;
  const results = state.cards.map((c) => ({ c, j: judgePlacement(c.value, state.placed[c.id], p) }));
  let good = 0;
  for (const { c, j } of results) {
    c.grade = j.grade;
    c.showTruth = j.grade === 'spot' || state.checked >= 2;
    if (j.grade === 'spot') good += 1;
  }
  renderLine(); renderCards(); renderActions();
  const worst = results.slice().sort((a, b) => b.j.errorFrac - a.j.errorFrac)[0];
  const close = results.filter(({j}) => j.grade === 'close').length;
  const summary = good === state.cards.length ? `All ${good} exactly placed.` : `${good} of ${state.cards.length} exactly placed.${close ? ` ${close} close: keep adjusting.` : ''}`;
  if (good === state.cards.length) {
    feedback.set('ok', summary, benchmarkText(worst.c.value, p));
  } else if (state.checked < 2) {
    feedback.set('try', `${summary} ${placementMessage(worst.c, state.placed[worst.c.id], p)} Choose an unfinished card. Move it and check again.`);
  } else {
    feedback.set('info', `${summary} The green triangles show the exact positions. You can move the unfinished cards and check again.`, placementMessage(worst.c, state.placed[worst.c.id], p));
  }
  if (good === state.cards.length || state.checked >= 2) {
    talkBox.innerHTML = '';
    talkBox.append(talkPrompts([
      'Which number was hardest to place? Why?',
      'What did you use as a landmark on the line?',
      p.kind === 'fraction' ? 'Where would 1 whole and a half go if the line kept going?' : 'If the line went to double this, where would these numbers be?',
    ]));
  }
}

function guess() {
  if (state.pending === null) return;
  const verdict = mysteryJudge(state.pending, state.secret);
  state.guesses.push({ value: state.pending, verdict });
  state.interval = narrow(state.interval, state.pending, verdict);
  const msg = mysteryMessage(state.pending, state.secret, state.preset);
  state.pending = null;
  renderLine(); renderCards(); renderActions();
  if (verdict === 'found') {
    feedback.set('ok', `${msg} You found it in ${state.guesses.length} ${state.guesses.length === 1 ? 'guess' : 'guesses'}.`);
    talkBox.innerHTML = '';
    talkBox.append(talkPrompts(['Which guess helped the most? Why?', 'What is the fewest guesses that would always work?', 'Where is halfway between your last two guesses?']));
  } else {
    const [lo, hi] = state.interval;
    feedback.set('try', msg, `It is now between ${formatValue(lo, state.preset)} and ${formatValue(hi, state.preset)}. The grey parts are ruled out.`);
  }
}

function hint() {
  const p = state.preset;
  if (state.game === 'mystery') {
    const [lo, hi] = state.interval;
    const mid = snapValue((lo + hi) / 2, p);
    feedback.set('info', `Try halfway between ${formatValue(lo, p)} and ${formatValue(hi, p)}: that is ${formatValue(mid, p)}. A halfway guess rules out the most.`);
    return;
  }
  const c = state.cards.find((x) => x.id === state.current) || state.cards[0];
  feedback.set('info', benchmarkText(c.value, p));
}

function reveal() {
  if (state.game === 'mystery') {
    state.guesses.push({ value: state.secret, verdict: 'found' });
    state.interval = [state.secret, state.secret];
    renderLine(); renderCards(); renderActions();
    feedback.set('info', `The mystery number was ${formatValue(state.secret, state.preset)}.`);
    return;
  }
  for (const c of state.cards) { state.placed[c.id] = c.value; c.grade = 'spot'; c.showTruth = true; c.revealed = true; }
  state.checked = 2;
  renderLine(); renderCards(); renderActions();
  feedback.set('info', 'Here is where each number belongs.', state.cards.map((c) => benchmarkText(c.value, state.preset)).join(' '));
}

function drawerContent() {
  const sheet = el('div');
  sheet.append(el('h2', { id: 'drawer-title', text: 'Set up: Where does it go?' }));
  sheet.append(el('p', { class: 'small muted', text: 'These choices are for the teacher. The student screen only shows the activity.' }));
  const presetSel = el('select', { id: 'sel-preset' });
  LINE_PRESETS.forEach((p) => presetSel.append(el('option', { value: p.id, text: p.label, ...(p.id === state.preset.id ? { selected: '' } : {}) })));
  const note = el('p', { class: 'codes' });
  const showNote = () => { const p = linePreset(presetSel.value); note.textContent = `Curriculum: ${p.codes.join(', ')}.`; };
  presetSel.addEventListener('change', showNote); showNote();
  const gameSel = el('select', { id: 'sel-game' });
  [['place', 'Place the cards on the line'], ['mystery', 'Mystery number (bigger or smaller clues)']].forEach(([v, t]) => gameSel.append(el('option', { value: v, text: t, ...(v === state.game ? { selected: '' } : {}) })));
  const supSel = el('select', { id: 'sel-support' });
  [['full', 'Full: landmark labels shown'], ['light', 'Light: only the ends are labelled']].forEach(([v, t]) => supSel.append(el('option', { value: v, text: t, ...(v === state.support ? { selected: '' } : {}) })));
  const seedIn = el('input', { type: 'number', id: 'in-seed', value: String(state.seed), min: '1' });
  sheet.append(el('label', { for: 'sel-preset', text: 'Number line' }), presetSel, note);
  sheet.append(el('label', { for: 'sel-game', text: 'Game' }), gameSel);
  sheet.append(el('label', { for: 'sel-support', text: 'Support' }), supSel);
  sheet.append(el('label', { for: 'in-seed', text: 'Round code (same code gives the same rounds on every device)' }), seedIn);
  const actions = el('div', { class: 'actions' });
  actions.append(button('Apply', { primary: true, onClick: () => {
    const p = new URLSearchParams(params);
    p.set('preset', presetSel.value); p.set('game', gameSel.value); p.set('support', supSel.value); p.set('seed', seedIn.value || String(randomSeed()));
    location.search = p.toString();
  } }));
  actions.append(button('Cancel', { quiet: true, onClick: shell.closeDrawer }));
  actions.append(el('a', { class: 'btn btn-quiet', href: `../teacher.html?activity=where-does-it-go&${params.toString()}`, text: 'Teacher page' }));
  sheet.append(actions);
  return sheet;
}

window.addEventListener('resize', renderLine);
window.render_game_to_text = () => JSON.stringify({activity:'where-does-it-go', preset:state.preset.id, game:state.game, cards:state.cards.map(c=>({id:c.id,value:c.value,placed:state.placed[c.id],grade:c.grade||null,revealed:!!c.revealed})), current:state.current, checked:state.checked, pending:state.pending, interval:state.interval, guesses:state.guesses, instruction:promptEl.textContent+' '+subEl.textContent});
newRound();
