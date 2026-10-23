import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GROWING, countAt, judgeBuild, repeatingSequence, nextInRepeating, bounds, predictMessage } from '../src/logic/patterns.js';

test('linear patterns: cell count matches a × n + b for steps 1 to 12', () => {
  for (const p of GROWING.filter((x) => !x.nonlinear)) {
    for (let n = 1; n <= 12; n++) {
      assert.equal(countAt(p, n), p.a * n + p.b, `${p.id} step ${n}`);
      assert.match(p.rule(n), new RegExp(`= ${p.a * n + p.b}$`), `${p.id} rule text`);
    }
  }
});

test('each step adds the same amount for linear patterns', () => {
  for (const p of GROWING.filter((x) => !x.nonlinear)) {
    for (let n = 2; n <= 12; n++) assert.equal(countAt(p, n) - countAt(p, n - 1), p.a);
  }
});

test('stairs pattern is triangular', () => {
  const p = GROWING.find((x) => x.id === 'stairs');
  for (let n = 1; n <= 10; n++) assert.equal(countAt(p, n), (n * (n + 1)) / 2);
});

test('cells never duplicate a position', () => {
  for (const p of GROWING) for (let n = 1; n <= 8; n++) {
    const keys = new Set(p.cells(n).map((c) => `${c.x},${c.y}`));
    assert.equal(keys.size, p.cells(n).length, `${p.id} step ${n}`);
  }
});

test('build judgement and messages', () => {
  const p = GROWING.find((x) => x.id === 'lshape');
  assert.equal(judgeBuild(p, 4, 9).correct, true);
  assert.equal(judgeBuild(p, 4, 8).diff, -1);
  assert.equal(predictMessage(p, 10, 21), 'Yes. Step 10 has 21 tiles. 2 × 10 + 1 = 21.');
  assert.equal(predictMessage(p, 10, 20), 'Not 20. Step 10 has 21 tiles. 2 × 10 + 1 = 21.');
});

test('repeating patterns', () => {
  assert.deepEqual(repeatingSequence('ABB', 7), ['A', 'B', 'B', 'A', 'B', 'B', 'A']);
  assert.equal(nextInRepeating('ABC', 7), 'B');
  const b = bounds([{ x: -2, y: 0 }, { x: 3, y: 4 }]);
  assert.deepEqual(b, { minX: -2, maxX: 3, minY: 0, maxY: 4, w: 6, h: 5 });
});
