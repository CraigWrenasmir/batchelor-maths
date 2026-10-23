import { DIRECTIONS, sameCell, shortestPath, simulateRoute, stepFrom, makeRouteSession } from './route-content.js';

const ICONS = {
  start: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="4 3"/></svg>',
  goal: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M12 34V7m1 1h19l-5 7 5 7H13" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M14 9h15l-4 6 4 5H14z" fill="currentColor" opacity=".22"/></svg>',
  block: '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="m7 15 12-7 14 7v15l-13 5L7 28z" fill="currentColor" opacity=".2"/><path d="m7 15 12-7 14 7v15l-13 5L7 28zm0 0 13 6 13-6M20 21v14" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/></svg>',
  stop: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="none" stroke="currentColor" stroke-width="2.7"/><circle cx="20" cy="20" r="5" fill="currentColor"/></svg>',
  mover: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="8" r="5" fill="currentColor"/><path d="M20 17v9m-9-7 9-3 9 3m-9 7-7 9m7-9 7 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  dot: '<svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="12" fill="currentColor"/><circle cx="17" cy="16" r="3" fill="white" opacity=".6"/></svg>'
};

const positionText = p => `row ${p.row + 1}, column ${p.col + 1}`;

export function mountRoute(container, config = {}, api = {}) {
  const options = { routeLevel: 'short', support: 'guided', context: 'equipment', mode: 'practice', ...config };
  let variant = Number.isSafeInteger(config.initialVariant) && config.initialVariant >= 0 ? config.initialVariant : 0;
  let stages = makeRouteSession(options, variant);
  let stageIndex = 0;
  let map;
  let commands = [];
  let player;
  let visitedStop = false;
  let trace = [];
  let status = 'planning';
  let running = false;
  let supported = false;
  let pickingGoal = false;
  let activeCommand = -1;
  let message = '';
  let messageTone = 'neutral';
  let exampleOpen = false;
  let exampleReturnFocus = null;
  let timer = null;
  let generation = 0;
  let destroyed = false;
  const maxCommands = options.routeLevel === 'short' ? 18 : 28;
  const moverName = options.context === 'shapes' ? 'counter' : 'person';
  const moverIcon = options.context === 'shapes' ? ICONS.dot : ICONS.mover;
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  container.innerHTML = `
    <section class="route-activity" aria-label="Find the way activity">
      <div class="route-stage-top"><span class="route-eyebrow" data-route="stage-label"></span><span class="route-support-badge" data-route="support" hidden>Support used</span></div>
      <h2 class="route-heading" data-route="title" tabindex="-1"></h2>
      <p class="route-instruction" data-route="instruction"></p>
      <div class="route-layout">
        <section class="route-map-panel" aria-label="Route map">

          <div class="route-board" data-route="board" role="group" aria-label="Map. Rows go down; columns go right."></div>
          <div class="route-legend"><span class="route-legend-mover">${moverIcon}Move me</span><span class="route-legend-goal">${ICONS.goal}Finish</span><span class="route-legend-block">${ICONS.block}Block</span><span class="route-legend-stop" data-route="stop-legend" hidden>${ICONS.stop}Visit here</span></div>
          <button class="route-secondary route-pick" data-action="pick" hidden>Move flag</button>
          <p class="route-map-note" data-route="map-note"></p>
        </section>
        <section class="route-plan-panel" aria-label="Route controls">
          <div class="route-plan-header"><h3>Your arrows</h3><span data-route="queue-count"></span></div>

          <div class="route-command-pad" aria-label="Add a direction">
            ${Object.entries(DIRECTIONS).map(([key, d]) => `<button class="route-direction" data-direction="${key}" aria-label="Add ${d.label.toLowerCase()} arrow"><span aria-hidden="true">${d.glyph}</span><small>${d.label}</small></button>`).join('')}
          </div>
          <div class="route-queue-wrap"><ol class="route-queue" data-route="queue" aria-label="Planned directions"></ol><p class="route-queue-empty" data-route="queue-empty">Tap arrows. Then tap Go.</p></div>
          <p class="route-queue-help" data-route="queue-help" hidden>Tap an arrow here to remove it.</p>
          <div class="route-edit-controls"><button class="route-secondary" data-action="undo">Undo</button><button class="route-secondary" data-action="clear">Clear</button></div>
          <button class="route-test" data-action="test"><span aria-hidden="true">▶</span> Go</button>
          <button class="route-secondary route-stop" data-action="stop" hidden>Stop</button>
          <div class="route-message" data-route="message" tabindex="-1"></div>
          <p class="route-reflection" data-route="reflection" hidden></p>
          <button class="route-next" data-action="next" hidden>Next <span aria-hidden="true">→</span></button>
        </section>
      </div>
      <div class="route-example" data-route="example" hidden></div>
    </section>`;

  const root = container.querySelector('.route-activity');
  const el = name => root.querySelector(`[data-route="${name}"]`);
  const button = action => root.querySelector(`[data-action="${action}"]`);
  const announce = text => { if (!destroyed && typeof api.announce === 'function') api.announce(text); };
  const notify = () => { if (!destroyed && typeof api.onStateChange === 'function') api.onStateChange(); };
  const say = (text, tone = 'neutral', speak = true) => {
    message = text;
    messageTone = tone;
    if (speak) announce(text);
  };

  function cancelRun() {
    generation += 1;
    clearTimeout(timer);
    timer = null;
    running = false;
    activeCommand = -1;
  }

  function resetPosition() {
    player = { ...map.start };
    trace = [{ ...player }];
    visitedStop = !map.waypoint || sameCell(player, map.waypoint);
    activeCommand = -1;
  }

  function instruction() {
    const stop = map.waypoint ? ' Visit the round stop on your way.' : '';
    return `${map.kind === 'plan' ? `Move the ${moverName} from Start to Finish.` : map.prompt}${stop}`;
  }

  function initialMessage() {
    if (map.kind === 'repair') return '';
    if (map.kind === 'partner') return '';
    if (options.support === 'guided') return '';
    return '';
  }

  function loadStage(index, focus = false) {
    cancelRun();
    stageIndex = index;
    map = structuredClone(stages[stageIndex]);
    commands = [...map.commands];
    supported = false;
    pickingGoal = false;
    status = 'planning';
    resetPosition();
    say(initialMessage(), 'neutral', false);
    buildGrid();
    render();
    if (focus) el('title').focus({ preventScroll: true });
    notify();
  }

  function buildGrid() {
    const board = el('board');
    board.style.setProperty('--route-size', map.size);
    board.replaceChildren();
    for (let row = 0; row < map.size; row += 1) {
      for (let col = 0; col < map.size; col += 1) {
        const tile = document.createElement('div');
        tile.className = 'route-cell';
        tile.dataset.row = row;
        tile.dataset.col = col;
        tile.dataset.cell = `${row},${col}`;
        tile.setAttribute('role', 'img');
        board.append(tile);
      }
    }
  }

  function renderGrid() {
    for (const tile of el('board').children) {
      const p = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
      const start = sameCell(p, map.start);
      const goal = sameCell(p, map.goal);
      const stop = sameCell(p, map.waypoint);
      const blocked = map.obstacles.some(other => sameCell(p, other));
      const current = sameCell(p, player);
      const travelled = trace.some(other => sameCell(p, other));
      const canPick = pickingGoal && !blocked && !start && !stop;
      tile.className = `route-cell${start ? ' is-start' : ''}${goal ? ' is-goal' : ''}${stop ? ' is-stop' : ''}${blocked ? ' is-block' : ''}${current ? ' is-player' : ''}${travelled ? ' is-travelled' : ''}${canPick ? ' is-pickable' : ''}`;
      tile.setAttribute('role', canPick ? 'button' : 'img');
      if (canPick) tile.tabIndex = 0;
      else tile.removeAttribute('tabindex');
      const items = [start && 'Start square', goal && 'Finish flag', stop && `stop${visitedStop ? ', visited' : ''}`, blocked && 'block', current && moverName].filter(Boolean);
      tile.setAttribute('aria-label', `${canPick ? 'Put the flag at ' : ''}${positionText(p)}: ${items.length ? items.join(', ') : 'open'}`);
      let icon = blocked ? ICONS.block : goal ? ICONS.goal : stop ? ICONS.stop : start ? ICONS.start : '';
      if (current) icon = `<span class="route-cell-mover">${moverIcon}</span>${(goal || stop) ? `<span class="route-cell-corner">${goal ? ICONS.goal : ICONS.stop}</span>` : ''}`;
      tile.innerHTML = `${!start && !goal ? `<span class="route-cell-coordinate" aria-hidden="true">${p.row + 1}·${p.col + 1}</span>` : ''}${icon}${start || goal ? `<span class="route-cell-label" aria-hidden="true">${start ? 'Start' : 'Finish'}</span>` : ''}${travelled && !current && !blocked && !start && !goal ? '<span class="route-trace-dot" aria-hidden="true"></span>' : ''}`;
    }
    el('board').classList.toggle('is-choosing', pickingGoal);
  }

  function renderQueue() {
    const list = el('queue');
    const focussed = document.activeElement?.dataset?.removeIndex;
    list.replaceChildren();
    commands.forEach((direction, index) => {
      const li = document.createElement('li');
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = `route-command${activeCommand === index ? ' is-active' : ''}${status === 'blocked' && activeCommand === index ? ' is-blocked' : ''}`;
      remove.dataset.removeIndex = index;
      remove.disabled = running;
      remove.setAttribute('aria-label', `Step ${index + 1}, ${DIRECTIONS[direction].label.toLowerCase()}. Remove this arrow`);
      remove.innerHTML = `<small aria-hidden="true">${index + 1}</small><span aria-hidden="true">${DIRECTIONS[direction].glyph}</span>`;
      if (activeCommand === index) remove.setAttribute('aria-current', 'step');
      li.append(remove);
      list.append(li);
    });
    if (focussed !== undefined && !running) {
      const target = list.querySelector(`[data-remove-index="${Math.min(Number(focussed), commands.length - 1)}"]`);
      (target || root.querySelector('[data-direction="up"]')).focus({ preventScroll: true });
    }
    el('queue-empty').hidden = commands.length > 0;
    el('queue-help').hidden = commands.length === 0;
    el('queue-count').textContent = `${commands.length} ${commands.length === 1 ? 'step' : 'steps'}`;
  }

  function render() {
    if (destroyed) return;
    el('stage-label').textContent = `Challenge ${stageIndex + 1} of ${stages.length}`;
    el('title').textContent = map.title;
    el('instruction').textContent = instruction();
    el('support').hidden = !supported;
    el('stop-legend').hidden = !map.waypoint;
    el('map-note').textContent = pickingGoal ? 'Tap an empty square.' : '1 arrow = 1 square.';
    el('message').textContent = message;
    el('message').hidden = !message;
    el('message').className = `route-message is-${messageTone}`;
    el('reflection').hidden = status !== 'success';
    el('reflection').textContent = map.reflection;
    button('pick').hidden = map.kind !== 'partner';
    button('pick').disabled = running;
    button('pick').textContent = pickingGoal ? 'Keep flag here' : 'Move flag';
    button('test').hidden = running;
    button('test').disabled = !commands.length || pickingGoal;
    button('stop').hidden = !running;
    button('undo').disabled = running || !commands.length;
    button('clear').disabled = running || !commands.length;
    button('next').hidden = status !== 'success';
    button('next').innerHTML = stageIndex === stages.length - 1 ? 'New map <span aria-hidden="true">↗</span>' : 'Next <span aria-hidden="true">→</span>';
    root.querySelectorAll('[data-direction]').forEach(b => { b.disabled = running || commands.length >= maxCommands || pickingGoal; });
    renderGrid();
    renderQueue();
  }

  function changedPlan(text) {
    cancelRun();
    resetPosition();
    status = 'planning';
    pickingGoal = false;
    say(text, 'neutral');
    render();
    notify();
  }

  function addDirection(direction) {
    if (running || pickingGoal || commands.length >= maxCommands) return;
    commands.push(direction);
    const count = commands.length;
    changedPlan(count === maxCommands ? `You have ${count} arrows. Tap Go. Or remove an arrow.` : `${DIRECTIONS[direction].label} added.`);
  }

  function finishRun(result) {
    running = false;
    status = result.status;
    const step = activeCommand + 1;
    if (result.status === 'blocked') {
      say(result.blocked === 'edge' ? `Arrow ${step} goes off the map. Change that arrow. Try again.` : `Arrow ${step} hits a block. Go around it. Try again.`, 'notice');
    } else if (result.status === 'success') {
      say(`You reached Finish${map.waypoint ? ' and visited the stop' : ''}.`, 'success');
    } else if (result.status === 'missing-stop') {
      say('You reached Finish. Visit the round stop too. Change your arrows.', 'notice');
    } else {
      say(`You have not reached Finish yet. Add or change arrows. Try again from Start.`, 'notice');
    }
    render();
    if (document.activeElement === document.body || document.activeElement === button('stop')) button('test').focus({ preventScroll: true });
    notify();
  }

  function testRoute() {
    if (running || pickingGoal || commands.length === 0) return;
    cancelRun();
    resetPosition();
    running = true;
    status = 'running';
    say('Watch. One arrow moves one square.', 'neutral', false);
    const currentGeneration = generation;
    let index = 0;
    const delay = reducedMotion() ? 0 : (config.mode || options.mode) === 'classroom' ? 800 : 550;
    render();
    notify();
    function advance() {
      if (destroyed || currentGeneration !== generation) return;
      if (index >= commands.length) {
        const status = sameCell(player, map.goal) ? (visitedStop ? 'success' : 'missing-stop') : 'unfinished';
        finishRun({ status });
        return;
      }
      activeCommand = index;
      const step = stepFrom(player, commands[index], map.size, map.obstacles);
      if (step.blocked) { finishRun({ status: 'blocked', blocked: step.blocked }); return; }
      player = step.position;
      trace.push({ ...player });
      visitedStop = visitedStop || sameCell(player, map.waypoint);
      index += 1;
      render();
      notify();
      if (delay === 0) advance();
      else timer = setTimeout(advance, delay);
    }
    if (delay === 0) advance();
    else timer = setTimeout(advance, delay);
  }

  function stopTest() {
    if (!running) return;
    cancelRun();
    status = 'paused';
    say('Stopped. Tap Go to try again from Start.');
    render();
    button('test').focus({ preventScroll: true });
    notify();
  }

  function chooseGoal(tile) {
    if (!pickingGoal || running || tile.getAttribute('role') !== 'button') return;
    const goal = { row: Number(tile.dataset.row), col: Number(tile.dataset.col) };
    const path = shortestPath({ ...map, goal });
    if (!path) { say('You cannot get there. Choose another square.', 'notice'); render(); return; }
    map.goal = goal;
    commands = [];
    supported = false;
    changedPlan('The flag has moved. Ask someone to find a way.');
    root.querySelector('[data-direction="up"]').focus({ preventScroll: true });
  }

  function hint() {
    if (running) stopTest();
    const result = simulateRoute(map, commands);
    supported = true;
    if (result.status === 'success' && commands.length) {
      say('Your arrows reach Finish. Tap Go. Show how it works.', 'help');
    } else if (result.status === 'blocked') {
      const bad = result.blockedAt;
      const remaining = shortestPath({ ...map, start: result.position, waypoint: result.visitedStop ? null : map.waypoint });
      const suggestion = remaining?.length ? ` Try ${DIRECTIONS[remaining[0]].label.toLowerCase()} from there.` : '';
      say(`Arrow ${bad + 1} hits ${result.blocked === 'edge' ? 'the edge' : 'a block'}.${suggestion} Tap that arrow to remove it.`, 'help');
    } else {
      const remaining = shortestPath({ ...map, start: result.position, waypoint: result.visitedStop ? null : map.waypoint });
      const first = remaining?.[0];
      say(first ? `${commands.length ? 'Next, try' : 'Start with'} ${DIRECTIONS[first].label.toLowerCase()} ${DIRECTIONS[first].glyph}. ${map.waypoint && !result.visitedStop ? 'Visit the round stop. Then go to Finish.' : 'Trace the way with your finger.'}` : 'Look where the arrows stop. You need to reach Finish.', 'help');
    }
    render();
    notify();
  }

  function reveal() {
    cancelRun();
    supported = true;
    pickingGoal = false;
    commands = shortestPath(map) || [];
    resetPosition();
    status = 'planning';
    say('Here is one way. Follow it with your finger. Then tap Go.', 'help');
    render();
    notify();
  }

  function example() {
    if (!exampleOpen) exampleReturnFocus = document.activeElement;
    exampleOpen = !exampleOpen;
    const panel = el('example');
    panel.hidden = !exampleOpen;
    if (!exampleOpen) { if (exampleReturnFocus?.isConnected) exampleReturnFocus.focus({ preventScroll: true }); notify(); return; }
    panel.innerHTML = `<div class="route-example-heading"><h3 tabindex="-1">Watch this example</h3><button class="route-secondary" data-action="close-example">Close</button></div><p>Start on the left. Go right twice.</p><div class="route-example-board" role="img" aria-label="Three open squares in a row. Start at square one. Flag at square three."><span>${moverIcon}</span><span>·</span><span>${ICONS.goal}</span></div><p class="route-example-arrows"><strong>→ &nbsp; →</strong><span>Right. Then right. You reached Finish.</span></p><p>One arrow stops in the middle. Two arrows reach the flag.</p>`;
    panel.querySelector('h3').focus({ preventScroll: true });
    panel.scrollIntoView({ behavior: reducedMotion() ? 'instant' : 'smooth', block: 'nearest' });
    announce('Watch this example. Go right twice to reach the flag. Your map has not changed.');
    notify();
  }

  function reset() { loadStage(stageIndex); announce('Try this map again.'); }
  function newSession() { variant += 1; stages = makeRouteSession(options, variant); exampleOpen = false; el('example').hidden = true; loadStage(0, true); announce('A fresh map is ready.'); }
  function next() {
    if (running) return;
    if (stageIndex < stages.length - 1) {
      if (stageIndex === 0) stages[1].commands = [...commands];
      loadStage(stageIndex + 1, true);
      if (map.kind === 'change' && commands.length) { say('Your arrows are still here. Will they work? Tap Go.', 'neutral', false); render(); }
      announce(instruction());
    }
    else newSession();
  }

  function onClick(event) {
    const direction = event.target.closest('[data-direction]');
    if (direction) { addDirection(direction.dataset.direction); return; }
    const remove = event.target.closest('[data-remove-index]');
    if (remove && !running) {
      const index = Number(remove.dataset.removeIndex);
      commands.splice(index, 1);
      changedPlan(`Arrow ${index + 1} removed.`);
      return;
    }
    const tile = event.target.closest('[data-cell]');
    if (tile) { chooseGoal(tile); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'test') testRoute();
    if (action === 'stop') stopTest();
    if (action === 'undo' && !running && commands.length) { commands.pop(); changedPlan('Last arrow removed.'); }
    if (action === 'clear' && !running) { commands = []; changedPlan('Arrows cleared. Try a new way.'); }
    if (action === 'next') next();
    if (action === 'pick' && !running) {
      pickingGoal = !pickingGoal;
      say(pickingGoal ? 'Tap an empty square for the flag.' : 'The flag stays here. Choose your arrows.');
      render();
      if (pickingGoal) el('board').querySelector('[role="button"]')?.focus({ preventScroll: true });
      notify();
    }
    if (action === 'close-example') { exampleOpen = false; el('example').hidden = true; (exampleReturnFocus?.isConnected ? exampleReturnFocus : el('title')).focus({ preventScroll: true }); notify(); }
  }

  function onKeydown(event) {
    const tile = event.target.closest('[data-cell]');
    if (tile && tile.getAttribute('role') === 'button' && ['Enter', ' '].includes(event.key)) {
      event.preventDefault();
      chooseGoal(tile);
    }
    if (event.key === 'Escape' && pickingGoal) {
      pickingGoal = false;
      render();
      button('pick').focus({ preventScroll: true });
      notify();
    }
  }

  function getState() {
    return {
      activity: 'route', variant, coordinateSystem: 'zero-based row down, column right', config: { ...options, mode: config.mode || options.mode },
      stage: stageIndex + 1, stageCount: stages.length, stageKind: map.kind, title: map.title,
      instruction: instruction(), size: map.size, start: { ...map.start }, goal: { ...map.goal },
      player: { ...player }, obstacles: map.obstacles.map(p => ({ ...p })), waypoint: map.waypoint ? { ...map.waypoint } : null,
      visitedStop, commands: [...commands], trace: trace.map(p => ({ ...p })), activeCommand, status, running,
      supported, pickingGoal, exampleOpen, message
    };
  }

  function destroy() {
    cancelRun();
    destroyed = true;
    root.removeEventListener('click', onClick);
    root.removeEventListener('keydown', onKeydown);
    container.replaceChildren();
  }

  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeydown);
  loadStage(0);
  function setMode(mode) { config.mode = mode === 'classroom' ? 'classroom' : 'practice'; options.mode = config.mode; }
  return { reset, newSession, hint, example, reveal, next, getState, destroy, setMode };
}
