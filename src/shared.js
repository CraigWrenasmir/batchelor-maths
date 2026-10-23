// Shared shell: URL settings, delivery mode, optional sound, feedback,
// fullscreen and the "new learner" reset. No performance data is stored.
import { school } from './config.js';
import { demoFor } from './demos.js';

const icons = {
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 11 9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>',
  listen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/></svg>',
  show: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><path d="m10 8 6 4-6 4z"/></svg>',
  hint: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 16c0-2-3-3-3-7a7 7 0 0 1 14 0c0 4-3 5-3 7zm1 4h6m-5 3h4"/></svg>'
};

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
  window.dispatchEvent(new CustomEvent('sampler-mode-change',{detail:{mode}}));
}

// Sound: off unless the user turns it on. Uses the device's speech voice for
// numbers and instructions only. Never used to reveal a hidden answer.
let soundOn = setting('sound', store.get('bas-sound') || 'off') === 'on';
export function speak(text, { force = false, onError = () => {} } = {}) {
  if (!force && !soundOn) return;
  try {
    if (!soundAvailable()) { onError(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-AU'; u.rate = 0.9;
    u.onerror = e => { if (!['canceled', 'interrupted'].includes(e.error)) onError(); };
    window.speechSynthesis.speak(u);
  } catch { onError(); }
}
export function soundAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
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
  let instructionReader = null, exampleAction = null, drawerContent = null;
  const root = document.getElementById('app');
  root.className = 'app';
  root.innerHTML = `
    <header class="app-bar">
      <a class="bar-btn" href="../index.html" aria-label="Home">${icons.home}<span>Home</span></a>
      <h1 class="title">${title}</h1>
      <button class="bar-btn teacher-button" id="btn-setup">Teacher</button>
    </header>
    <nav class="help-bar" aria-label="Help">
      <button class="btn btn-quiet" id="btn-listen">${icons.listen}<span>Listen</span></button>
      <button class="btn btn-quiet" id="btn-example">${icons.show}<span>Show me</span></button>
      <button class="btn btn-quiet" id="btn-hint">${icons.hint}<span>Hint</span></button>
      <span class="small muted" id="audio-status" role="status"></span>
    </nav>
    <main class="stage" id="stage"></main>
    <footer class="teacher-bar" id="teacher-bar" hidden></footer>
    <div class="visually-hidden" aria-live="polite" id="live"></div>
    <dialog class="drawer" id="drawer" aria-labelledby="drawer-title"><div class="sheet" id="sheet">
      <div class="teacher-options" id="teacher-options" aria-label="Teacher tools">
        <div class="teacher-switches">
          <button class="btn btn-quiet" id="btn-mode" aria-pressed="${mode === 'class'}">Big screen</button>
          <button class="btn btn-quiet" id="btn-sound" aria-pressed="${soundOn}">Read feedback</button>
          <button class="btn btn-quiet" id="btn-full">Full screen</button>
          <button class="btn btn-quiet" id="btn-new">New learner</button>
        </div>
        <a class="teacher-guide-link" href="../docs/teacher-guides.html#${activity}">Teacher guide</a>
      </div>
    </div></dialog>
    <dialog class="example-dialog" id="example-dialog" aria-labelledby="example-title"></dialog>
  `;
  liveRegion = root.querySelector('#live');
  const stage = root.querySelector('#stage');
  const teacherOptions = root.querySelector('#teacher-options');
  const hintControl = teacherControls.find(c => c.key === 'h');
  const hintButton = root.querySelector('#btn-hint');
  hintButton.hidden = !hintControl;
  hintButton.onclick = () => { stopSpeech(); hintControl?.onClick(); };
  const stopSpeech = () => { try { window.speechSynthesis?.cancel(); } catch {} };
  const audioStatus = root.querySelector('#audio-status');
  const audioError = () => { audioStatus.textContent = 'No voice is available. Use Show me.'; };
  const visibleText = selectors => [...stage.querySelectorAll(selectors)].filter(e => e.getClientRects().length && !e.closest('[hidden]')).map(e=>e.textContent.trim()).filter(Boolean).join(' ');
  const readInstruction = () => instructionReader?.() || visibleText('.prompt, .hint-text') || title;
  root.querySelector('#btn-listen').onclick = () => {
    audioStatus.textContent = '';
    speak(readInstruction(), {force:true, onError:audioError});
  };
  root.querySelector('#btn-sound').onclick = e => {
    soundOn = !soundOn; e.currentTarget.setAttribute('aria-pressed', String(soundOn));
    store.set('bas-sound', soundOn ? 'on' : 'off');
    if (soundOn) speak('Feedback will be read aloud.', {onError:audioError}); else stopSpeech();
  };
  if (!soundAvailable()) audioError();
  const exampleDialog = root.querySelector('#example-dialog');
  root.querySelector('#btn-example').onclick = () => {
    stopSpeech();
    if (exampleAction) { exampleAction(); return; }
    exampleDialog.innerHTML = `<h2 id="example-title">Show me</h2>${demoFor(activity)}<div class="actions"><button class="btn" id="demo-listen">Listen</button><button class="btn btn-primary" id="demo-close">Back</button></div><p class="small" id="demo-audio-status" role="status"></p>`;
    exampleDialog.querySelector('#demo-close').onclick = () => exampleDialog.close();
    exampleDialog.querySelector('#demo-listen').onclick = () => speak([...exampleDialog.querySelectorAll('.demo-step')].map(e=>e.textContent).join(' '), {force:true,onError:()=>{exampleDialog.querySelector('#demo-audio-status').textContent='Voice is unavailable. Follow the pictures and words.';}});
    exampleDialog.showModal();
  };
  exampleDialog.addEventListener('close', () => {stopSpeech();requestAnimationFrame(()=>root.querySelector('#btn-example').focus());});
  root.querySelector('#btn-mode').onclick = e => {
    const next = document.documentElement.dataset.mode === 'class' ? 'ipad' : 'class';
    applyMode(next); params.set('mode',next);
    history.replaceState(null,'',`${location.pathname}?${params}`);
    e.currentTarget.setAttribute('aria-pressed', String(next === 'class'));
    renderTeacherBar();
    window.dispatchEvent(new Event('resize'));
  };
  root.querySelector('#btn-full').onclick = toggleFullscreen;
  root.querySelector('#btn-new').onclick = () => {
    stopSpeech(); onNewLearner?.(); drawer.close(); announce('Ready for the next learner.');
    root.querySelector('.title').tabIndex = -1; root.querySelector('.title').focus();
  };
  const bar = root.querySelector('#teacher-bar');
  function renderTeacherBar() {
    bar.hidden = document.documentElement.dataset.mode !== 'class' || teacherControls.length === 0;
    bar.innerHTML = '';
    if (bar.hidden) return;
    bar.append(el('span',{class:'label',text:'Teacher controls'}));
    teacherControls.forEach(c => bar.append(button(c.label,{onClick:c.onClick})));
  }
  renderTeacherBar();
  window.addEventListener('sampler-mode-change',e=>{root.querySelector('#btn-mode').setAttribute('aria-pressed',String(e.detail.mode==='class'));renderTeacherBar();});
  const drawer = root.querySelector('#drawer');
  const closeDrawer = () => drawer.close();
  drawer.addEventListener('close',()=>requestAnimationFrame(()=>{ if (!drawer.open) root.querySelector('#btn-setup').focus(); }));
  root.querySelector('#btn-setup').onclick = () => {
    if (!drawerContent) return;
    stopSpeech(); const sheet = drawer.querySelector('#sheet'); sheet.replaceChildren(drawerContent(), teacherOptions);
    drawer.showModal();
  };
  drawer.addEventListener('click',e=>{if(e.target===drawer) {const r=drawer.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDrawer();}});
  document.addEventListener('keydown', e => {
    if(e.target.matches('input,select,textarea') || document.querySelector('dialog[open]') || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    if(e.key.toLowerCase()==='f'){e.preventDefault();toggleFullscreen();return;}
    if(document.documentElement.dataset.mode !== 'class') return;
    const c = teacherControls.find(x=>x.key===e.key.toLowerCase());
    if(c){e.preventDefault();c.onClick();}
  });
  window.addEventListener('pagehide',stopSpeech);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopSpeech();});
  window.advanceTime = ms => new Promise(resolve=>setTimeout(resolve,Math.min(Math.max(ms,0),1000)));
  window.render_game_to_text = () => JSON.stringify({activity,instruction:readInstruction(),mode:document.documentElement.dataset.mode});
  return {stage,setDrawer(fn){drawerContent=fn;},setInstruction(fn){instructionReader=fn;},setExample(fn){exampleAction=fn;},closeDrawer,activity};
}

export async function toggleFullscreen() {
  try {
    const el = document.documentElement;
    if(document.fullscreenElement || document.webkitFullscreenElement) await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else await (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
  } catch { announce('Full screen is unavailable here. You can keep using this view.'); }
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
  entry.textContent = 'Tap a number';
  wrap.append(entry);
  const grid = document.createElement('div');
  grid.className = 'keypad';
  let value = '';
  const show = () => {
    entry.textContent = value || 'Tap a number';
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
  const d = document.createElement('details');
  d.className = 'talk';
  d.innerHTML = `<summary>${heading}</summary><ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  const listen = button('Listen', {quiet:true, onClick:()=>speak(items.join(' '), {force:true,onError:()=>announce('Voice is unavailable. The questions are shown on screen.')})});
  d.append(listen);
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
