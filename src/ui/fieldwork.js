import { mountShell, currentMode, applyMode, announce, speak, button, el, params, setupLink } from '../shared.js';
import { mountPack } from '../fieldwork/pack.js';
import { mountRoute } from '../fieldwork/route.js';

const isPack = document.body.dataset.fieldwork === 'pack';
const activity = isPack ? 'pack-the-gear' : 'find-the-way';
const title = isPack ? 'Pack the gear' : 'Find the way';
// Old two-activity links used these delivery names. Preserve their meaning.
if (params.get('mode') === 'classroom') params.set('mode', 'class');
if (params.get('mode') === 'practice') params.set('mode', 'ipad');
const choices = {
  packRange: [['5', 'Amounts up to 5'], ['10', 'Amounts up to 10'], ['20', 'Amounts up to 20']],
  routeLevel: [['short', 'Short routes'], ['turns', 'More steps'], ['detour', 'Changing routes']],
  support: [['guided', 'Visible prompts'], ['some', 'Hints on request'], ['independent', 'Try independently']],
  context: [['equipment', isPack ? 'Equipment' : 'Person'], ['shapes', 'Plain counters']],
  mode: [['ipad', 'Individual / pairs'], ['class', 'Big screen']],
};

function allowed(name, fallback) {
  const value = params.get(name);
  return choices[name].some(([key]) => key === value) ? value : fallback;
}
const legacySupport = { full: 'guided', light: 'some' }[params.get('support')];
const seedValue = Number(params.get('seed'));
const config = {
  packRange: Number(allowed('packRange', '10')),
  routeLevel: allowed('routeLevel', 'short'),
  support: allowed('support', legacySupport || 'guided'),
  context: allowed('context', 'equipment'),
  mode: currentMode() === 'class' ? 'classroom' : 'practice',
  initialVariant: Number.isSafeInteger(seedValue) && seedValue >= 0 && seedValue <= 999999 ? seedValue : 0,
};
let controller;
let roundCode = config.initialVariant;

const shell = mountShell({
  title, activity,
  onNewLearner: () => freshSession(),
  teacherControls: [
    { key: 'h', label: 'Hint', onClick: () => showHint() },
    { key: 'r', label: 'Show one solution', onClick: () => controller?.reveal() },
  ],
});
const container = el('div', { class: 'fieldwork-root' });
const footer = el('div', { class: 'fieldwork-footer' }, [
  button('Start again', { quiet: true, onClick: () => { stopSpeech(); controller?.reset(); } }),
]);
shell.stage.append(container, footer);

function stopSpeech() { try { window.speechSynthesis?.cancel(); } catch { /* optional speech */ } }
function reflectMode() {
  config.mode = currentMode() === 'class' ? 'classroom' : 'practice';
  document.body.classList.toggle('classroom', config.mode === 'classroom');
  controller?.setMode(config.mode);
}
function showRoundCode() {
  params.set('seed', String(roundCode));
  const url = new URL(location.href);
  url.search = params.toString();
  try { history.replaceState(null, '', url); } catch { /* round selection still works */ }
}
function mount() {
  controller?.destroy();
  reflectMode();
  config.initialVariant = roundCode;
  controller = (isPack ? mountPack : mountRoute)(container, config, {
    announce: text => { announce(text); speak(text); },
    onStateChange: state => {
      const next = state || controller?.getState();
      if (Number.isSafeInteger(next?.variant)) {
        roundCode = next.variant;
        showRoundCode();
      }
    },
  });
  showRoundCode();
}
function freshSession() {
  stopSpeech();
  controller?.newSession();
  showRoundCode();
}
function clearExampleAudio() {
  container.querySelectorAll('[data-example-audio]').forEach(node => node.remove());
}
function showHint() {
  stopSpeech();
  clearExampleAudio();
  controller?.hint();
}
function showExample() {
  controller?.example();
  clearExampleAudio();
  const panel = container.querySelector(isPack ? '.pack-help-panel' : '.route-example');
  if (!panel || panel.hidden) return;
  const status = el('p', { 'data-example-audio': '', role: 'status', class: 'fieldwork-example-status' });
  const listen = button('Listen', { onClick: () => {
    status.textContent = '';
    const readable = panel.cloneNode(true);
    readable.querySelectorAll('button,[data-example-audio]').forEach(node => node.remove());
    speak(readable.textContent.replace(/\s+/g, ' ').trim(), {
      force: true,
      onError: () => { status.textContent = 'No voice is available. Follow the pictures.'; },
    });
  } });
  listen.dataset.exampleAudio = '';
  panel.append(listen, status);
}
shell.setInstruction(() => controller?.getState().instruction || title);
shell.setExample(showExample);
container.addEventListener('click', event => {
  if (event.target.closest('.pack-help-close,[data-action="close-example"]')) stopSpeech();
});
shell.setDrawer(() => {
  const form = el('form', { class: 'fieldwork-setup' });
  form.append(el('h2', { id: 'drawer-title', text: `Set up ${title.toLowerCase()}` }));
  form.append(el('p', { class: 'fieldwork-note', text: 'Change the challenge and support separately. Applying these choices starts a fresh session.' }));
  function select(name, label, value) {
    const field = el('label', { text: label });
    const input = el('select', { name });
    for (const [key, text] of choices[name]) input.append(el('option', { value: key, text }));
    input.value = String(value);
    field.append(input);
    form.append(field);
  }
  if (isPack) select('packRange', 'Amounts', config.packRange);
  else select('routeLevel', 'Routes', config.routeLevel);
  select('support', 'Support', config.support);
  select('context', 'Materials', config.context);
  select('mode', 'Delivery', config.mode === 'classroom' ? 'class' : 'ipad');
  const seedLabel = el('label', { text: 'Round code' });
  seedLabel.append(el('input', { name: 'seed', type: 'number', min: '0', max: '999999', step: '1', value: String(roundCode) }));
  form.append(seedLabel, el('p', { class: 'fieldwork-note', text: 'Use the same choices and round code on each device to start together. Codes repeat a small collection of packs or maps.' }));
  const apply = button('Apply and start fresh', { primary: true });
  apply.type = 'submit';
  const close = button('Close', { onClick: () => shell.closeDrawer() });
  form.append(el('div', { class: 'fieldwork-setup-actions' }, [apply, close]));
  form.append(el('a', { href: setupLink(activity), text: 'Teacher setup and links →' }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    stopSpeech();
    const data = new FormData(form);
    for (const key of ['packRange', 'routeLevel', 'support', 'context']) {
      if (data.has(key)) config[key] = key === 'packRange' ? Number(data.get(key)) : data.get(key);
    }
    roundCode = Number(data.get('seed'));
    const mode = data.get('mode');
    params.set('mode', mode);
    applyMode(mode);
    reflectMode();
    for (const key of ['packRange', 'routeLevel', 'support', 'context']) params.set(key, String(config[key]));
    params.set('seed', String(roundCode));
    const url = new URL(location.href);
    url.search = params.toString();
    history.replaceState(null, '', url);
    mount();
    shell.closeDrawer();
    announce('Your choices are ready. A fresh session has started.');
  });
  return form;
});
window.addEventListener('sampler-mode-change', event => {
  params.set('mode', event.detail.mode === 'class' ? 'class' : 'ipad');
  config.mode = event.detail.mode === 'class' ? 'classroom' : 'practice';
  document.body.classList.toggle('classroom', config.mode === 'classroom');
  controller?.setMode(config.mode);
});
window.addEventListener('pagehide', () => { stopSpeech(); controller?.destroy(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) stopSpeech(); });
window.render_game_to_text = () => JSON.stringify({ ...controller?.getState(), roundCode });
window.advanceTime = ms => new Promise(resolve => setTimeout(resolve, Math.min(Math.max(ms, 0), 1000)));
mount();
