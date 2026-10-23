import test from 'node:test';
import assert from 'node:assert/strict';
import { makeRouteSession, shortestPath, simulateRoute, stepFrom, sameCell } from '../src/fieldwork/route-content.js';

test('every preset, stage and reflected map has a route that succeeds', () => {
  for (const routeLevel of ['short', 'turns', 'detour']) {
    for (let variant = 0; variant < 8; variant += 1) {
      const stages = makeRouteSession({ routeLevel }, variant);
      assert.equal(stages.length, 4);
      for (const map of stages) {
        const path = shortestPath(map);
        assert.ok(Array.isArray(path), `${routeLevel}/${variant}/${map.kind} must be reachable`);
        assert.ok(path.length > 0 && path.length <= 18, 'paths remain manageable');
        assert.equal(simulateRoute(map, path).status, 'success');
      }
    }
  }
});

test('repair presets are intentionally wrong in all orientations', () => {
  for (const routeLevel of ['short', 'turns', 'detour']) {
    for (let variant = 0; variant < 4; variant += 1) {
      const repair = makeRouteSession({ routeLevel }, variant)[2];
      const result = simulateRoute(repair, repair.commands);
      assert.notEqual(result.status, 'success');
      assert.equal(result.status, routeLevel === 'detour' ? 'missing-stop' : 'blocked');
    }
  }
});

test('the changed map actually blocks the first shortest route', () => {
  for (const routeLevel of ['short', 'turns', 'detour']) {
    const [initial, changed] = makeRouteSession({ routeLevel });
    assert.equal(simulateRoute(changed, shortestPath(initial)).status, 'blocked');
    assert.equal(simulateRoute(changed, shortestPath(changed)).status, 'success');
  }
});

test('a block or edge stops before entering it and records the failing arrow', () => {
  const map = { size: 3, start: { row: 2, col: 0 }, goal: { row: 0, col: 2 }, obstacles: [{ row: 1, col: 0 }] };
  const wall = simulateRoute(map, ['up', 'right']);
  assert.equal(wall.status, 'blocked');
  assert.equal(wall.blockedAt, 0);
  assert.deepEqual(wall.position, map.start);
  assert.equal(wall.trace.length, 1);
  const edge = simulateRoute(map, ['right', 'down']);
  assert.equal(edge.blocked, 'edge');
  assert.equal(edge.blockedAt, 1);
  assert.deepEqual(edge.position, { row: 2, col: 1 });
  assert.equal(stepFrom(map.start, 'invalid', map.size).blocked, 'unknown');
});

test('the flag alone does not satisfy a required visit stop', () => {
  const map = { size: 3, start: { row: 2, col: 0 }, goal: { row: 2, col: 2 }, obstacles: [], waypoint: { row: 0, col: 1 } };
  assert.equal(simulateRoute(map, ['right', 'right']).status, 'missing-stop');
  const path = shortestPath(map);
  const result = simulateRoute(map, path);
  assert.equal(result.status, 'success');
  assert.ok(result.trace.some(p => sameCell(p, map.waypoint)));
});

test('BFS rejects unreachable and invalid destinations', () => {
  const map = { size: 3, start: { row: 2, col: 0 }, goal: { row: 0, col: 2 }, obstacles: [{ row: 1, col: 0 }, { row: 2, col: 1 }] };
  assert.equal(shortestPath(map), null);
  assert.equal(shortestPath({ ...map, obstacles: [], goal: { row: -1, col: 0 } }), null);
  assert.equal(shortestPath({ ...map, obstacles: [], waypoint: { row: 3, col: 0 } }), null);
});

test('every offered partner destination is reachable within the queue capacity', () => {
  for (const routeLevel of ['short', 'turns', 'detour']) {
    const map = makeRouteSession({ routeLevel })[3];
    for (let row = 0; row < map.size; row += 1) {
      for (let col = 0; col < map.size; col += 1) {
        const goal = { row, col };
        if (sameCell(goal, map.start) || sameCell(goal, map.waypoint) || map.obstacles.some(p => sameCell(p, goal))) continue;
        const path = shortestPath({ ...map, goal });
        assert.ok(path, 'every visibly selectable destination is reachable');
        assert.ok(path.length < (routeLevel === 'short' ? 18 : 28));
        assert.equal(simulateRoute({ ...map, goal }, path).status, 'success');
      }
    }
  }
});

test('session data is fresh: changing one map does not mutate another session', () => {
  const a = makeRouteSession({ routeLevel: 'short' });
  const b = makeRouteSession({ routeLevel: 'short' });
  a[0].start.row = 0;
  a[0].obstacles.push({ row: 3, col: 3 });
  a[2].commands.push('left');
  assert.equal(b[0].start.row, 3);
  assert.equal(b[0].obstacles.length, 1);
  assert.equal(b[2].commands.length, 2);
});
