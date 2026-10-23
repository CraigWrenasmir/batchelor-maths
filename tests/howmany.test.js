import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/logic/rng.js';
import { chooseScene, layoutScene, judgeEstimate, describeCount, placeValueText, tally, estimateMessage } from '../src/logic/howmany.js';
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
