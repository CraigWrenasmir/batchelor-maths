import { normalisePackConfig, createPackPlan, validatePack, packSolution, packInstruction, packFeedback, packHint } from './pack-content.js';

let mountId = 0;

export function mountPack(container, incomingConfig = {}, incomingApi = {}) {
  const config = normalisePackConfig(incomingConfig);
  const api = { announce() {}, onStateChange() {}, ...incomingApi };
  const id = `pack-${++mountId}`;
  const noun = config.context === 'shapes' ? 'tiles' : 'markers';
  let variant = Number.isSafeInteger(incomingConfig.initialVariant) && incomingConfig.initialVariant >= 0 ? incomingConfig.initialVariant : 0;
  let plan = createPackPlan(config.packRange, variant);
  let stageIndex = 0;
  let a = 0;
  let b = 0;
  let prior = null;
  let checked = false;
  let status = 'working';
  let helpUsed = false;
  let revealUsed = false;
  let feedback = '';
  let stageStart = [0, 0];
  let stageTarget = plan.stages[0].target;
  let destroyed = false;
  let elements = {};
  let helpReturnFocus = null;

  function stage() { return { ...plan.stages[stageIndex], target: stageTarget }; }
  function node(tag, className = '', text = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  function button(text, className, action, label = null) {
    const element = node('button', className, text);
    element.type = 'button';
    if (label) element.setAttribute('aria-label', label);
    element.addEventListener('click', action);
    return element;
  }
  function getState() {
    return {
      activity: 'pack', variant, round: stageIndex + 1, roundIndex: stageIndex,
      stageIndex, stageCount: plan.stages.length, kind: stage().kind,
      instruction: packInstruction(stage(), config),
      target: stageTarget, a, b, total: a + b, checked, status,
      helpUsed, revealUsed, prior: prior ? [...prior] : null,
      complete: stageIndex === plan.stages.length - 1 && ['correct', 'revealed'].includes(status),
      config: { ...config },
    };
  }
  function notify() { if (!destroyed) api.onStateChange(getState()); }
  function speak(text) { api.announce(text); }
  function clearCheck() {
    checked = false;
    status = 'working';
    feedback = '';
  }

  function build() {
    const root = node('section', `pack-activity pack-support-${config.support}`);
    root.setAttribute('aria-label', 'Pack the gear activity');
    const head = node('div', 'pack-heading');
    const step = node('p', 'pack-step');
    const title = node('h2', 'pack-title');
    title.id = `${id}-title`;
    title.tabIndex = -1;
    const instruction = node('p', 'pack-instruction');
    head.append(step, title, instruction);

    const targetPanel = node('div', 'pack-request');
    const targetLabel = node('div', 'pack-request-label', 'REQUEST');
    const targetValue = node('div', 'pack-request-number');
    const targetWord = node('span', 'pack-request-word', noun);
    const targetDots = node('div', 'pack-target-dots');
    targetDots.setAttribute('aria-hidden', 'true');
    targetPanel.append(targetLabel, targetValue, targetWord, targetDots);

    const creator = node('div', 'pack-creator');
    const creatorLabel = node('span', '', 'Choose the request');
    const targetMinus = button('−', 'pack-step-button', () => changeTarget(-1), 'Make the request one smaller');
    const targetDisplay = node('output', 'pack-create-value');
    const targetPlus = button('+', 'pack-step-button', () => changeTarget(1), 'Make the request one larger');
    creator.append(creatorLabel, targetMinus, targetDisplay, targetPlus);

    const previous = node('p', 'pack-previous');
    const taskLayout = node('div', 'pack-workspace');
    const trays = node('div', 'pack-trays');
    const trayA = buildTray('A');
    const trayB = buildTray('B');
    trays.append(trayA.root, trayB.root);
    taskLayout.append(targetPanel, trays);

    const transfers = node('div', 'pack-transfers');
    const transferLabel = node('span', 'pack-transfer-label', 'Keep the same total');
    const moveAB = button('A → B', 'pack-move-button', () => move('a'), 'Move one object from Tray A to Tray B');
    const moveBA = button('B → A', 'pack-move-button', () => move('b'), 'Move one object from Tray B to Tray A');
    transfers.append(transferLabel, moveAB, moveBA);

    const equation = node('p', 'pack-equation');
    const note = node('p', 'pack-limit-note');
    const response = node('div', 'pack-feedback');
    response.setAttribute('role', 'status');
    response.setAttribute('aria-live', 'polite');
    response.setAttribute('aria-atomic', 'true');

    const actions = node('div', 'pack-actions');
    const checkButton = button('Check my pack', 'pack-primary', check);
    const nextButton = button('Continue →', 'pack-next', next);
    const moreButton = button('Another session', 'pack-next', newSession);
    actions.append(checkButton, nextButton, moreButton);

    const helpPanel = node('aside', 'pack-help-panel');
    helpPanel.hidden = true;
    const helpTitle = node('h3', 'pack-help-title');
    helpTitle.tabIndex = -1;
    const helpBody = node('div', 'pack-help-body');
    const closeHelp = button('Close', 'pack-help-close', () => {
      helpPanel.hidden = true;
      const destination = helpReturnFocus?.isConnected ? helpReturnFocus : elements.title;
      destination.focus();
    });
    helpPanel.append(helpTitle, helpBody, closeHelp);

    root.append(head, creator, previous, taskLayout, transfers, equation, note, response, actions, helpPanel);
    container.replaceChildren(root);
    elements = { root, step, title, instruction, targetPanel, targetValue, targetDots, creator, targetMinus, targetPlus, targetDisplay, previous, trayA, trayB, moveAB, moveBA, equation, note, response, checkButton, nextButton, moreButton, helpPanel, helpTitle, helpBody };
    update();
  }

  function buildTray(label) {
    const lower = label.toLowerCase();
    const root = node('section', `pack-tray pack-tray-${lower}`);
    const header = node('div', 'pack-tray-header');
    const heading = node('h3', '', `Tray ${label}`);
    heading.id = `${id}-tray-${lower}`;
    const count = node('output', 'pack-tray-count');
    count.setAttribute('aria-label', `Number in Tray ${label}`);
    header.append(heading, count);
    const objects = node('div', 'pack-objects');
    objects.setAttribute('role', 'group');
    objects.setAttribute('aria-labelledby', heading.id);
    const empty = node('span', 'pack-empty', 'Ready to pack');
    const controls = node('div', 'pack-tray-controls');
    const minus = button('−', 'pack-step-button', () => changeCount(lower, -1), `Remove one ${config.context === 'shapes' ? 'tile' : 'marker'} from Tray ${label}`);
    const labelText = node('span', '', 'one at a time');
    const plus = button('+', 'pack-step-button', () => changeCount(lower, 1), `Add one ${config.context === 'shapes' ? 'tile' : 'marker'} to Tray ${label}`);
    controls.append(minus, labelText, plus);
    root.append(header, objects, controls);
    return { root, count, objects, empty, minus, plus };
  }

  function updateTray(tray, value, name) {
    tray.count.textContent = String(value);
    tray.minus.disabled = value === 0;
    tray.plus.disabled = a + b >= config.packRange;
    // Objects are visual manipulatives; stable +/- and move buttons hold keyboard focus.
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < value; i++) {
      const token = node('span', `pack-object pack-object-${config.context}`);
      token.setAttribute('aria-hidden', 'true');
      if (config.support === 'guided') token.textContent = String(i + 1);
      fragment.append(token);
    }
    if (value === 0) fragment.append(node('span', 'pack-empty', 'Empty tray'));
    tray.objects.replaceChildren(fragment);
    tray.objects.setAttribute('aria-label', `${value} ${noun} in Tray ${name}`);
  }

  function update() {
    if (destroyed) return;
    const current = stage();
    const success = status === 'correct' || status === 'revealed';
    elements.step.textContent = `PART ${stageIndex + 1} OF ${plan.stages.length}`;
    elements.title.textContent = current.title;
    elements.instruction.textContent = packInstruction(current, config);
    elements.targetValue.textContent = String(stageTarget);
    elements.targetPanel.setAttribute('aria-label', `Request: ${stageTarget} ${noun}`);
    elements.targetDots.hidden = config.support !== 'guided';
    if (config.support === 'guided') {
      elements.targetDots.replaceChildren(...Array.from({ length: stageTarget }, () => node('span', 'pack-target-dot')));
    }
    elements.creator.hidden = current.kind !== 'create';
    elements.targetDisplay.textContent = String(stageTarget);
    elements.targetMinus.disabled = stageTarget <= 1;
    elements.targetPlus.disabled = stageTarget >= config.packRange;
    elements.previous.hidden = current.kind !== 'different';
    elements.previous.textContent = prior ? `Your first pack: ${prior[0]} in A + ${prior[1]} in B = ${prior[0] + prior[1]}. Find another split.` : '';
    updateTray(elements.trayA, a, 'A');
    updateTray(elements.trayB, b, 'B');
    elements.moveAB.disabled = a === 0;
    elements.moveBA.disabled = b === 0;
    elements.equation.hidden = config.support === 'independent' && !checked;
    elements.equation.textContent = `${a} + ${b} = ${a + b} altogether`;
    elements.note.textContent = a + b >= config.packRange
      ? `All ${config.packRange} available ${noun} are out. Move one between trays, or take one away.`
      : `Tap + to add, − to take away, or an arrow to move one between trays.`;
    elements.response.textContent = feedback;
    elements.response.hidden = !feedback;
    elements.response.classList.toggle('is-success', success);
    elements.response.classList.toggle('is-revealed', status === 'revealed');
    elements.checkButton.textContent = success ? 'Check again' : 'Check my pack';
    elements.nextButton.hidden = stageIndex === plan.stages.length - 1;
    elements.nextButton.disabled = !success;
    elements.moreButton.hidden = !(stageIndex === plan.stages.length - 1 && success);
    elements.root.dataset.status = status;
    notify();
  }

  function changeCount(tray, delta) {
    if (destroyed) return;
    if (delta > 0 && a + b >= config.packRange) return;
    if (tray === 'a') a = Math.max(0, a + delta);
    else b = Math.max(0, b + delta);
    clearCheck();
    update();
  }
  function move(from) {
    if (destroyed || (from === 'a' && a === 0) || (from === 'b' && b === 0)) return;
    if (from === 'a') { a--; b++; } else { b--; a++; }
    clearCheck();
    update();
    speak(`Tray A: ${a}. Tray B: ${b}. The total is still ${a + b}.`);
  }
  function changeTarget(delta) {
    stageTarget = Math.min(config.packRange, Math.max(1, stageTarget + delta));
    clearCheck();
    update();
    speak(`New request: ${stageTarget} ${noun}.`);
  }
  function check() {
    const result = validatePack(stage(), a, b, prior);
    checked = true;
    status = result.correct ? 'correct' : 'working';
    feedback = packFeedback(stage(), result, a, b, config);
    update();
  }
  function next() {
    if (!['correct', 'revealed'].includes(status) || stageIndex >= plan.stages.length - 1) return false;
    if (stageIndex === 0) prior = [a, b];
    stageIndex++;
    const nextStage = plan.stages[stageIndex];
    stageTarget = nextStage.target;
    if (nextStage.initial) [a, b] = nextStage.initial;
    stageStart = [a, b];
    clearCheck();
    elements.helpPanel.hidden = true;
    update();
    elements.title.focus({ preventScroll: true });
    speak(packInstruction(stage(), config));
    return true;
  }
  function reset() {
    [a, b] = stageStart;
    if (stage().kind === 'create') stageTarget = plan.stages[stageIndex].target;
    clearCheck();
    elements.helpPanel.hidden = true;
    update();
    speak('This part has been reset.');
  }
  function newSession() {
    variant++;
    plan = createPackPlan(config.packRange, variant);
    stageIndex = 0;
    stageTarget = plan.stages[0].target;
    [a, b] = plan.stages[0].initial;
    stageStart = [a, b];
    prior = null;
    helpUsed = false;
    revealUsed = false;
    clearCheck();
    elements.helpPanel.hidden = true;
    update();
    elements.title.focus({ preventScroll: true });
    speak('A new packing session is ready.');
  }
  function showHelp(title, text, exampleValues = null) {
    helpReturnFocus = document.activeElement;
    elements.helpTitle.textContent = title;
    elements.helpBody.replaceChildren(node('p', '', text));
    if (exampleValues) {
      const mini = node('div', 'pack-mini-example');
      mini.setAttribute('aria-label', `${exampleValues[0]} plus ${exampleValues[1]} makes ${exampleValues[0] + exampleValues[1]}`);
      exampleValues.forEach((amount, index) => {
        const miniTray = node('div', 'pack-mini-tray');
        const label = node('strong', '', `Tray ${index ? 'B' : 'A'}: ${amount}`);
        const pieces = node('div', 'pack-mini-pieces');
        for (let i = 0; i < amount; i++) pieces.append(node('span', `pack-object pack-object-${config.context}`));
        miniTray.append(label, pieces);
        mini.append(miniTray);
      });
      elements.helpBody.append(mini);
    }
    elements.helpPanel.hidden = false;
    elements.helpTitle.focus({ preventScroll: true });
    elements.helpPanel.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    speak(`${title}. ${text}`);
  }
  function hint() {
    helpUsed = true;
    showHelp('A way to think about it', packHint(stage(), a, b, config, prior));
    notify();
  }
  function example() {
    // A separate worked example; the learner's target, trays and progress are untouched.
    showHelp('Worked example · a separate pack', `Here is a request for 3 ${noun}. Put 1 in Tray A and 2 in Tray B. 1 + 2 = 3. Move one from B to A: now 2 + 1 = 3. The split changed; the total stayed the same. Your pack is still above.`, [1, 2]);
  }
  function reveal() {
    [a, b] = packSolution(stage(), prior);
    checked = true;
    status = 'revealed';
    helpUsed = true;
    revealUsed = true;
    feedback = `Solution shown together: ${a} + ${b} = ${stageTarget}. This is one possible pack. Talk about how it works, or change the trays and try your own way.`;
    update();
    speak(feedback);
  }
  function destroy() {
    destroyed = true;
    container.replaceChildren();
    elements = {};
  }

  build();
  function setMode(mode) { config.mode = mode === 'classroom' ? 'classroom' : 'practice'; }
  return { reset, newSession, hint, example, reveal, next, getState, destroy, setMode };
}
