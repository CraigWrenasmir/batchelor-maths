import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng } from '../src/logic/rng.js';
import { lineFor, generateCards, judgePlacement, benchmarkText, formatValue, snapValue, mysteryJudge, narrow, placementMessage } from '../src/logic/numberline.js';
import { LINE_PRESETS } from '../content/number-line.js';

test('cards stay inside every preset range and are unique', () => {
  for (const preset of LINE_PRESETS) {
    for (let seed = 1; seed < 100; seed++) {
      const cards = generateCards(preset, preset.cards, makeRng(seed));
      assert.equal(cards.length, preset.cards, `${preset.id} seed ${seed}`);
      const vals = cards.map((c) => c.value);
      assert.equal(new Set(vals).size, vals.length, 'unique values');
      for (const v of vals) assert.ok(v >= preset.min && v <= preset.max, `${preset.id}: ${v}`);
    }
  }
});

test('fraction formatting', () => {
  const p = LINE_PRESETS.find((x) => x.id === 'eighths');
  assert.equal(formatValue(0.125, p), '1/8');
  assert.equal(formatValue(0.5, p), '4/8');
  assert.equal(formatValue(1, p), '1');
  const q = LINE_PRESETS.find((x) => x.id === 'halves');
  assert.equal(formatValue(0.5, q), '2/4');
});

test('snap respects resolution and bounds', () => {
  const p = LINE_PRESETS.find((x) => x.id === 'to1000');
  assert.equal(snapValue(347, p), 350);
  assert.equal(snapValue(-20, p), 0);
  assert.equal(snapValue(5000, p), 1000);
});

test('exact positions are distinct from approximate positions', () => {
  const p = LINE_PRESETS.find((x) => x.id === 'to100');
  assert.equal(judgePlacement(50, 50, p).grade, 'spot');
  assert.equal(judgePlacement(50, 51, p).grade, 'close');
  assert.equal(judgePlacement(50, 54, p).grade, 'close');
  assert.equal(judgePlacement(50, 70, p).grade, 'off');
  assert.equal(judgePlacement(50, 70, p).direction, 'right');
  for (const preset of LINE_PRESETS) {
    const centre = snapValue((preset.min + preset.max) / 2, preset);
    assert.equal(judgePlacement(centre, centre, preset).grade, 'spot');
    assert.notEqual(judgePlacement(centre, centre + preset.resolution, preset).grade, 'spot');
  }
  const small = LINE_PRESETS.find(x => x.id === 'to20');
  assert.equal(judgePlacement(9, 8, small).grade, 'close');
  assert.match(placementMessage({value:9,kind:'numeral'},8,small), /^Nearly/);
});

test('benchmark text uses the ticks', () => {
  const p = LINE_PRESETS.find((x) => x.id === 'to100');
  assert.equal(benchmarkText(17, p), '17 is between 10 and 20, closer to 20.');
  assert.equal(benchmarkText(15, p), '15 is halfway between 10 and 20.');
  assert.equal(benchmarkText(30, p), '30 is exactly on 30.');
  const blank = LINE_PRESETS.find((x) => x.id === 'to100-blank');
  assert.equal(benchmarkText(80, blank), '80 is between 50 and 100, closer to 100.');
  const roads = LINE_PRESETS.find((x) => x.id === 'roads');
  assert.match(placementMessage({ value: 46, kind: 'label', display: 'Florence Falls' }, 60, roads), /Florence Falls \(46\) was placed too far right/);
});

test('mystery number narrows the interval', () => {
  assert.equal(mysteryJudge(40, 63), 'low');
  assert.equal(mysteryJudge(80, 63), 'high');
  assert.equal(mysteryJudge(63, 63), 'found');
  let iv = [0, 100];
  iv = narrow(iv, 40, 'low'); assert.deepEqual(iv, [40, 100]);
  iv = narrow(iv, 80, 'high'); assert.deepEqual(iv, [40, 80]);
});

test('line ticks are generated for the preset', () => {
  const p = LINE_PRESETS.find((x) => x.id === 'to100');
  assert.deepEqual(lineFor(p).ticks, [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  assert.deepEqual(lineFor(p).labelled, [0, 50, 100]);
});
