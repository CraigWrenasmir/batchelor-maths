/** Pure route content and movement logic. Coordinates: row down, column right. */
export const DIRECTIONS = Object.freeze({
  up: { row: -1, col: 0, glyph: '↑', label: 'Up' },
  right: { row: 0, col: 1, glyph: '→', label: 'Right' },
  down: { row: 1, col: 0, glyph: '↓', label: 'Down' },
  left: { row: 0, col: -1, glyph: '←', label: 'Left' }
});

export const sameCell = (a, b) => Boolean(a && b && a.row === b.row && a.col === b.col);
export const cellKey = p => `${p.row},${p.col}`;
export const inBounds = (p, size) => p.row >= 0 && p.col >= 0 && p.row < size && p.col < size;

export function stepFrom(position, direction, size, obstacles = []) {
  const d = DIRECTIONS[direction];
  if (!d) return { position: { ...position }, blocked: 'unknown' };
  const next = { row: position.row + d.row, col: position.col + d.col };
  if (!inBounds(next, size)) return { position: { ...position }, blocked: 'edge' };
  if (obstacles.some(p => sameCell(p, next))) return { position: { ...position }, blocked: 'obstacle' };
  return { position: next, blocked: null };
}

/** Breadth-first search includes the visit-stop state, so the whole route is valid. */
export function shortestPath({ size, start, goal, obstacles = [], waypoint = null }) {
  if (!inBounds(start, size) || !inBounds(goal, size)) return null;
  if (obstacles.some(p => sameCell(p, start) || sameCell(p, goal))) return null;
  if (waypoint && (!inBounds(waypoint, size) || obstacles.some(p => sameCell(p, waypoint)))) return null;
  const visitedStop = !waypoint || sameCell(start, waypoint);
  const queue = [{ position: { ...start }, visitedStop, path: [] }];
  const seen = new Set([`${cellKey(start)}|${visitedStop}`]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (sameCell(current.position, goal) && current.visitedStop) return current.path;
    for (const direction of Object.keys(DIRECTIONS)) {
      const step = stepFrom(current.position, direction, size, obstacles);
      if (step.blocked) continue;
      const nextVisited = current.visitedStop || sameCell(step.position, waypoint);
      const key = `${cellKey(step.position)}|${nextVisited}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ position: step.position, visitedStop: nextVisited, path: [...current.path, direction] });
    }
  }
  return null;
}

export function simulateRoute(map, commands) {
  let position = { ...map.start };
  let visitedStop = !map.waypoint || sameCell(position, map.waypoint);
  const trace = [{ ...position }];
  for (let index = 0; index < commands.length; index += 1) {
    const step = stepFrom(position, commands[index], map.size, map.obstacles);
    if (step.blocked) return { status: 'blocked', blocked: step.blocked, blockedAt: index, position, visitedStop, trace };
    position = step.position;
    visitedStop = visitedStop || sameCell(position, map.waypoint);
    trace.push({ ...position });
  }
  const status = sameCell(position, map.goal) ? (visitedStop ? 'success' : 'missing-stop') : 'unfinished';
  return { status, blocked: null, blockedAt: null, position, visitedStop, trace };
}

const cell = (row, col) => ({ row, col });
const LEVELS = {
  short: {
    size: 4,
    start: cell(3, 0), goal: cell(3, 2), obstacles: [cell(1, 1)],
    change: { obstacles: [cell(1, 1), cell(3, 1)] },
    repair: { goal: cell(2, 1), obstacles: [cell(3, 1)], commands: ['right', 'up'] },
    partner: { goal: cell(1, 1), obstacles: [cell(2, 2)] }
  },
  turns: {
    size: 5,
    start: cell(4, 0), goal: cell(1, 3), obstacles: [cell(3, 1), cell(3, 2), cell(1, 1)],
    change: { obstacles: [cell(3, 1), cell(3, 2), cell(1, 1), cell(2, 0)] },
    repair: {
      obstacles: [cell(3, 1), cell(3, 2), cell(1, 1), cell(2, 0)],
      commands: ['up', 'up', 'right', 'right', 'right', 'up']
    },
    partner: { goal: cell(0, 4), obstacles: [cell(3, 1), cell(3, 2), cell(1, 1)] }
  },
  detour: {
    size: 5,
    start: cell(4, 0), goal: cell(0, 4), waypoint: cell(2, 2),
    obstacles: [cell(3, 1), cell(1, 2), cell(1, 3), cell(3, 3)],
    change: { obstacles: [cell(3, 1), cell(1, 2), cell(1, 3), cell(3, 3), cell(2, 3)] },
    repair: { commands: ['up', 'up', 'up', 'up', 'right', 'right', 'right', 'right'] },
    partner: { goal: cell(0, 3), obstacles: [cell(3, 1), cell(1, 2), cell(2, 3)] }
  }
};

/** Four connected stages; reflection provides fresh arrangements without unsafe random mazes. */
export function makeRouteSession(config = {}, variant = 0) {
  const level = LEVELS[config.routeLevel] ? config.routeLevel : 'short';
  const source = LEVELS[level];
  const base = { size: source.size, start: source.start, goal: source.goal, waypoint: source.waypoint || null, obstacles: source.obstacles, commands: [] };
  const definitions = [
    { ...base, kind: 'plan', title: 'Plan a route', prompt: 'Make a route from the start to the flag.', reflection: 'Show someone how your arrows match the route. Could another route work?' },
    { ...base, ...source.change, kind: 'change', title: 'A path is blocked', prompt: 'A new block is in the way. Make a route around it.', reflection: 'Which part of your route changed? Which part could stay the same?' },
    { ...base, ...source.repair, kind: 'repair', title: 'Repair a route', prompt: 'These arrows need a change. Predict what will happen, then test them.', reflection: 'Point to the change you made. Why does the route work now?' },
    { ...base, ...source.partner, kind: 'partner', title: 'Make a challenge', prompt: 'Choose a flag position, then let a partner make the route.', reflection: 'Can your partner find another route to the same flag?' }
  ];
  const reflectX = Math.abs(variant) % 2 === 1;
  const reflectY = Math.floor(Math.abs(variant) / 2) % 2 === 1;
  const transform = p => p ? ({ row: reflectY ? base.size - 1 - p.row : p.row, col: reflectX ? base.size - 1 - p.col : p.col }) : null;
  const transformDirection = direction => {
    if (reflectX && (direction === 'left' || direction === 'right')) return direction === 'left' ? 'right' : 'left';
    if (reflectY && (direction === 'up' || direction === 'down')) return direction === 'up' ? 'down' : 'up';
    return direction;
  };
  return definitions.map((stage, index) => ({
    ...stage, index, level,
    start: transform(stage.start), goal: transform(stage.goal), waypoint: transform(stage.waypoint),
    obstacles: stage.obstacles.map(transform), commands: stage.commands.map(transformDirection)
  }));
}
