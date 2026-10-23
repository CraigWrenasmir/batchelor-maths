// Shared shell: URL settings, delivery mode, optional sound, feedback,
// fullscreen and the "new learner" reset. No performance data is stored.
import { school } from './config.js';

export const params = new URLSearchParams(location.search);

export function setting(name, fallback) {
  const v = params.get(name);
  return v === null || v === '' ? fallback : v;
}

const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage unavailable: ignore */ } },
};

// Delivery mode: 'ipad' (individual or paired) or 'class' (big screen).
export function currentMode() {
  return setting('mode', store.get('bas-mode') || 'ipad') === 'class' ? 'class' : 'ipad';
}
export function applyMode(mode) {
  document.documentElement.dataset.mode = mode;
  store.set('bas-mode', mode);
}

// Sound: off unless the user turns it on. Uses the device's speech voice for
// numbers and instructions only. Never used to reveal a hidden answer.
let soundOn = setting('sound', store.get('bas-sound') || 'off') === 'on';
export function speak(text) {
  if (!soundOn) return;
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-AU';
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  } catch { /* audio blocked or unavailable: visible text remains */ }
}
export function soundAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

let liveRegion;
export function announce(text) {
  if (!liveRegion) return;
  liveRegion.textContent = '';
  setTimeout(() => { liveRegion.textContent = text; }, 30);
}

export function mountShell({ title, activity, onNewLearner, teacherControls = [] }) {
  document.title = `${title} · ${school.name}`;
  const mode = currentMode();
  applyMode(mode);
  const root = document.getElementById('app');
  root.className = 'app';
  root.innerHTML = `
    <header class="app-bar">
      <a class="bar-btn" href="../index.html" aria-label="Home">⌂ <span>Home</span></a>
      <h1 class="title">${title}</h1>
      <div class="tools">
        <button class="bar-btn" id="btn-sound" aria-pressed="${soundOn}" ${soundAvailable() ? '' : 'disabled title="Speech is not available on this device"'}>🔈 <span>Sound</span></button>
        <button class="bar-btn" id="btn-mode" aria-pressed="${mode === 'class'}">▭ <span>Big screen</span></button>
        <button class="bar-btn" id="btn-full">⤢ <span>Full screen</span></button>
        <button class="bar-btn" id="btn-setup">⚙ <span>Set up</span></button>
        <button class="bar-btn" id="btn-new">↺ <span>New learner</span></button>
      </div>
    </header>
    <main class="stage" id="stage"></main>
    <footer class="teacher-bar" id="teacher-bar" hidden></footer>
    <div class="visually-hidden" aria-live="polite" id="live"></div>
    <div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title"><div class="sheet" id="sheet"></div></div>
  `;
  liveRegion = root.querySelector('#live');

  root.querySelector('#btn-sound').addEventListener('click', (e) => {
    soundOn = !soundOn;
    e.currentTarget.setAttribute('aria-pressed', String(soundOn));
    store.set('bas-sound', soundOn ? 'on' : 'off');
    if (soundOn) speak('Sound is on.');
  });
  root.querySelector('#btn-mode').addEventListener('click', (e) => {
    const next = document.documentElement.dataset.mode === 'class' ? 'ipad' : 'class';
    applyMode(next);
    e.currentTarget.setAttribute('aria-pressed', String(next === 'class'));
    renderTeacherBar();
    window.dispatchEvent(new Event('resize'));
  });
  root.querySelector('#btn-full').addEventListener('click', toggleFullscreen);
  root.querySelector('#btn-new').addEventListener('click', () => {
    if (onNewLearner) onNewLearner();
    announce('Ready for the next learner.');
  });

  const bar = root.querySelector('#teacher-bar');
  function renderTeacherBar() {
    const isClass = document.documentElement.dataset.mode === 'class';
    bar.hidden = !isClass || teacherControls.length === 0;
    if (bar.hidden) return;
    bar.innerHTML = `<span class="label">Teacher controls</span>` + teacherControls.map((c) =>
      `<button class="btn" data-key="${c.key}">${c.label}<kbd>${c.key.toUpperCase()}</kbd></button>`).join('');
    bar.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => teacherControls.find((c) => c.key === b.dataset.key).onClick());
    });
  }
  renderTeacherBar();
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, select, textarea')) return;
    if (document.documentElement.dataset.mode !== 'class') return;
    const c = teacherControls.find((x) => x.key === e.key.toLowerCase());
    if (c && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); c.onClick(); }
  });

  const drawer = root.querySelector('#drawer');
  root.querySelector('#btn-setup').addEventListener('click', () => openDrawer());
  drawer.addEventListener('click', (e) => { if (e.target === drawer) closeDrawer(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawer.open) closeDrawer(); });

  let drawerContent = null;
  function openDrawer() {
    if (!drawerContent) return;
    drawer.querySelector('#sheet').innerHTML = '';
    drawer.querySelector('#sheet').append(drawerContent());
    drawer.setAttribute('open', '');
    drawer.open = true;
    const first = drawer.querySelector('select, input, button');
    if (first) first.focus();
  }
  function closeDrawer() { drawer.removeAttribute('open'); drawer.open = false; }

  return {
    stage: root.querySelector('#stage'),
    setDrawer(fn) { drawerContent = fn; },
    closeDrawer,
    activity,
  };
}

export function toggleFullscreen() {
  try {
    const el = document.documentElement;
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
    }
  } catch { /* fullscreen unavailable (iPad Safari page): normal window works */ }
}

export function feedbackEl(container) {
  const el = document.createElement('div');
  el.className = 'feedback';
  el.setAttribute('role', 'status');
  container.append(el);
  return {
    el,
    set(kind, text, maths) {
      el.dataset.kind = kind;
      const icon = kind === 'ok' ? '✓' : kind === 'try' ? '→' : 'i';
      el.innerHTML = `<span class="icon" aria-hidden="true">${icon}</span><p>${text}${maths ? `<span class="maths">${maths}</span>` : ''}</p>`;
      announce(`${text} ${maths || ''}`);
      speak(`${text} ${maths || ''}`);
    },
    clear() { el.innerHTML = ''; delete el.dataset.kind; },
  };
}

export function button(label, { primary = false, quiet = false, onClick, id } = {}) {
  const b = document.createElement('button');
  b.className = `btn${primary ? ' btn-primary' : ''}${quiet ? ' btn-quiet' : ''}`;
  b.type = 'button';
  b.textContent = label;
  if (id) b.id = id;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

// Simple numeric keypad: digits, backspace, done. Returns the element and a
// way to read/clear the entry. No reading required beyond digits.
export function keypad({ onDone, maxDigits = 4, allowNegative = false, doneLabel = 'Done' }) {
  const wrap = document.createElement('div');
  wrap.className = 'keypad-wrap';
  const entry = document.createElement('div');
  entry.className = 'entry empty';
  entry.setAttribute('aria-live', 'polite');
  entry.textContent = 'Type a number';
  wrap.append(entry);
  const grid = document.createElement('div');
  grid.className = 'keypad';
  let value = '';
  const show = () => {
    entry.textContent = value || 'Type a number';
    entry.classList.toggle('empty', !value);
  };
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', allowNegative ? '−' : '', '0', '⌫'];
  keys.forEach((k) => {
    if (k === '') { const sp = document.createElement('span'); grid.append(sp); return; }
    const b = button(k, { quiet: k === '⌫' || k === '−' });
    b.setAttribute('aria-label', k === '⌫' ? 'Delete' : k === '−' ? 'Minus' : k);
    b.addEventListener('click', () => {
      if (k === '⌫') value = value.slice(0, -1);
      else if (k === '−') value = value.startsWith('-') ? value.slice(1) : '-' + value;
      else if (value.replace('-', '').length < maxDigits) value += k;
      show();
    });
    grid.append(b);
  });
  const done = button(doneLabel, { primary: true });
  done.classList.add('wide');
  done.addEventListener('click', () => {
    if (value === '' || value === '-') return;
    onDone(parseInt(value, 10));
  });
  grid.append(done);
  wrap.append(grid);
  // Physical keyboard support
  wrap.tabIndex = -1;
  wrap.addEventListener('keydown', (e) => {
    if (/^[0-9]$/.test(e.key) && value.replace('-', '').length < maxDigits) { value += e.key; show(); e.preventDefault(); }
    else if (e.key === 'Backspace') { value = value.slice(0, -1); show(); e.preventDefault(); }
    else if (e.key === 'Enter') { done.click(); e.preventDefault(); }
  });
  return { el: wrap, clear() { value = ''; show(); }, get value() { return value; } };
}

export function talkPrompts(items, heading = 'Talk about it') {
  const d = document.createElement('div');
  d.className = 'talk';
  d.innerHTML = `<h3>${heading}</h3><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  return d;
}

export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.append(c);
  return e;
}

export function setupLink(activity, extra = {}) {
  const p = new URLSearchParams(params);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return `../teacher.html?activity=${activity}&${p.toString()}`;
}
