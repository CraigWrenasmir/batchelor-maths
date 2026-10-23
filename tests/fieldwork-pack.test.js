import test from 'node:test';
import assert from 'node:assert/strict';
import { normalisePackConfig, createPackPlan, validatePack, packSolution, packFeedback } from '../src/fieldwork/pack-content.js';

test('all content variants remain within the selected number range', () => {
  for (const range of [5, 10, 20]) for (let variant = 0; variant < 9; variant++) {
    const plan = createPackPlan(range, variant);
    assert.equal(plan.stages.length, 5);
    assert.equal(plan.stages[0].target, plan.stages[1].target);
    assert.notEqual(plan.stages[0].target, plan.stages[2].target);
    for (const stage of plan.stages) {
      assert(stage.target >= 1 && stage.target <= range);
      if (stage.initial) assert(stage.initial.every(v => v >= 0) && stage.initial[0] + stage.initial[1] <= range);
    }
    const repair = plan.stages[3];
    assert.notEqual(repair.initial[0] + repair.initial[1], repair.target);
  }
});

test('every split, including zero in one tray, is a valid pack', () => {
  for (let target = 1; target <= 20; target++) for (let a = 0; a <= target; a++) {
    assert.equal(validatePack({ kind: 'make', target }, a, target - a).correct, true);
  }
});

test('another split must change the arrangement and may swap named trays', () => {
  const stage = { kind: 'different', target: 7 };
  assert.equal(validatePack(stage, 3, 4, [3, 4]).reason, 'same-split');
  assert.equal(validatePack(stage, 4, 3, [3, 4]).correct, true);
  assert.equal(validatePack(stage, 4, 3, [3, 4]).swapped, true);
  assert.equal(validatePack(stage, 0, 7, [3, 4]).correct, true);
  assert.equal(validatePack(stage, 4, 4, [3, 4]).correct, false);
});

test('feedback distinguishes too many from too few with accurate difference', () => {
  const stage = { kind: 'make', target: 7 };
  const low = validatePack(stage, 2, 3);
  const high = validatePack(stage, 4, 5);
  assert.equal(low.reason, 'too-few');
  assert.equal(high.reason, 'too-many');
  assert.equal(low.difference, 2);
  assert.equal(high.difference, 2);
  assert.match(packFeedback(stage, low, 2, 3, { context: 'equipment', support: 'guided' }), /2 more/);
  assert.match(packFeedback(stage, high, 4, 5, { context: 'equipment', support: 'guided' }), /2 fewer/);
});

test('revealed solution always meets target and differs from prior split', () => {
  for (let target = 1; target <= 20; target++) for (let a = 0; a <= target; a++) {
    const stage = { kind: 'different', target };
    const prior = [a, target - a];
    const solution = packSolution(stage, prior);
    assert.equal(validatePack(stage, ...solution, prior).correct, true);
  }
});

test('configuration normalises unsupported inputs and numeric ranges', () => {
  assert.equal(normalisePackConfig({ packRange: '20' }).packRange, 20);
  assert.deepEqual(normalisePackConfig({ packRange: -1, context: 'unknown', support: 'mystery' }), {
    packRange: 10, support: 'guided', context: 'equipment', mode: 'practice',
  });
});
