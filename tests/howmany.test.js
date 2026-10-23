import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/logic/rng.js';
import { chooseScene, layoutScene, judgeEstimate, describeCount, placeValueText, tally, estimateMessage, countGroups, addGroup, checkTotal } from '../src/logic/howmany.js';
import { HOW_MANY_PRESETS } from '../content/how-many.js';

test('every preset generates quantities inside its range for many seeds', () => {
  for (const preset of HOW_MANY_PRESETS) {
    for (let seed = 1; seed < 300; seed++) {
      const scene = chooseScene(preset, makeRng(seed));
      assert.ok(scene.n >= preset.min && scene.n <= preset.max, `${preset.id} seed ${seed} gave ${scene.n}`);
      const layout = layoutScene(scene, makeRng(seed + 1000));
      assert.equal(layout.items.length, scene.n, `${preset.id}: items must equal n`);
      for (const it of layout.items) {
        assert.ok(it.x >= 0 && it.x <= 1 && it.y >= 0 && it.y <= 1, 'items inside the unit box');
      }
    }
  }
});

test('scattered items never overlap', () => {
  const preset = HOW_MANY_PRESETS.find((p) => p.id === 'to120');
  for (let seed = 1; seed < 50; seed++) {
    const scene = chooseScene(preset, makeRng(seed));
    const { items, radius } = layoutScene(scene, makeRng(seed));
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const dx = (items[i].x - items[j].x) * 1.6, dy = items[i].y - items[j].y;
      assert.ok(Math.hypot(dx, dy) > radius * 1.2, `overlap at seed ${seed}`);
    }
  }
});

test('rows arrangement is a true array', () => {
  const preset = HOW_MANY_PRESETS.find((p) => p.id === 'arrays');
  for (let seed = 1; seed < 100; seed++) {
    const scene = chooseScene(preset, makeRng(seed));
    assert.equal(scene.n, scene.rows * scene.cols);
    assert.equal(describeCount(scene), `${scene.rows} rows of ${scene.cols} is ${scene.rows} × ${scene.cols} = ${scene.n}.`);
  }
});

test('groups arrangement reports groups and remainder correctly', () => {
  const preset = HOW_MANY_PRESETS.find((p) => p.id === 'fives');
  for (let seed = 1; seed < 100; seed++) {
    const scene = chooseScene(preset, makeRng(seed));
    assert.equal(scene.groups * 5 + scene.remainder, scene.n);
    const layout = layoutScene(scene, makeRng(seed));
    const groupIds = new Set(layout.items.map((i) => i.group));
    assert.equal(groupIds.size, scene.groups + (scene.remainder ? 1 : 0));
  }
});

test('estimate judgement scales with quantity', () => {
  assert.equal(judgeEstimate(23, 23).grade, 'spot');
  assert.equal(judgeEstimate(21, 23).grade, 'close');
  assert.equal(judgeEstimate(18, 23).grade, 'near');
  assert.equal(judgeEstimate(5, 23).grade, 'far');
  assert.equal(judgeEstimate(100, 110).grade, 'close');
  assert.equal(judgeEstimate(30, 23).direction, 'over');
  assert.match(estimateMessage(20, 23), /There are 23, which is 3 more than your estimate/);
  assert.match(estimateMessage(30, 23), /There are 23, which is 7 fewer than your estimate/);
});

test('place value text and tally', () => {
  assert.equal(placeValueText(23), '2 tens and 3 ones is 23.');
  assert.equal(placeValueText(100), '1 hundred is 100.');
  assert.equal(placeValueText(7), '7 ones is 7.');
  assert.equal(placeValueText(110), '1 hundred and 1 ten is 110.');
  assert.deepEqual(tally(23, 10), { groups: 2, rest: 3 });
});

test('whole-group counting covers arrays and partial groups without double counting', () => {
  const scene = { n: 23, arrangement: 'groups', groupSize: 5, groups: 4, remainder: 3 };
  const groups = countGroups(layoutScene(scene, makeRng(7)), 'groups');
  assert.deepEqual(groups.map((g) => g.ids.length), [5, 5, 5, 5, 3]);
  let marked = [groups[0].ids[0], groups[0].ids[1]];
  marked = addGroup(marked, groups[0].ids);
  assert.equal(marked.length, 5, 'only three objects remain in this partially counted group');
  assert.deepEqual(addGroup(marked, groups[0].ids), marked, 'tapping a counted group cannot inflate the total');
  for (const group of groups) marked = addGroup(marked, group.ids);
  assert.equal(marked.length, 23);

  const arrayGroups = countGroups(layoutScene({ n: 24, arrangement: 'rows', rows: 4, cols: 6 }, makeRng(1)), 'rows');
  assert.deepEqual(arrayGroups.map((g) => g.ids.length), [6, 6, 6, 6]);
  assert.equal(new Set(arrayGroups.flatMap((g) => g.ids)).size, 24);
  assert.deepEqual(countGroups(layoutScene({ n: 9, arrangement: 'scatter' }, makeRng(2)), 'scatter'), []);
});

test('exact-total answers stay retryable and do not reveal a hidden total', () => {
  assert.equal(checkTotal(87, 87).correct, true);
  for (const answer of [0, 86, 88, 999]) {
    const result = checkTotal(answer, 87);
    assert.equal(result.correct, false);
    assert.ok(!result.message.includes('87'), 'a wrong answer does not reveal the correct total');
  }
  assert.match(checkTotal(86, 87).message, /more/);
  assert.match(checkTotal(88, 87).message, /fewer/);
  assert.equal(checkTotal(NaN, 87).correct, false);
  assert.equal(checkTotal(-1, 87).correct, false);
});

test('regrouping a scattered collection preserves every object identity', () => {
  for (const n of [3, 10, 21, 53, 120]) {
    const original = layoutScene({ n, arrangement: 'scatter' }, makeRng(n));
    const grouped = layoutScene({ n, arrangement: 'groups', groupSize: 10, groups: Math.floor(n / 10), remainder: n % 10 }, makeRng(n));
    assert.deepEqual(grouped.items.map((i) => i.id), original.items.map((i) => i.id));
    assert.equal(countGroups(grouped, 'groups').flatMap((g) => g.ids).length, n);
  }
});
