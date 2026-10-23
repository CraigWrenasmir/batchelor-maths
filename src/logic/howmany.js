// Pure logic for "How many?" (estimate, then count by grouping).
// No DOM here so it can be tested with node --test.

export const ARRANGEMENTS = ['scatter', 'groups', 'rows'];

// Pick the quantity and structure for one scene from a preset.
export function chooseScene(preset, rng) {
  const { min, max, arrangement } = preset;
  if (arrangement === 'rows') {
    const rows = rng.int(preset.rowsMin ?? 2, preset.rowsMax ?? 6);
    const colsMin = Math.max(preset.colsMin ?? 2, Math.ceil(min / rows));
    const colsMax = Math.min(preset.colsMax ?? 10, Math.floor(max / rows));
    const cols = colsMax >= colsMin ? rng.int(colsMin, colsMax) : colsMin;
    return { n: rows * cols, arrangement, rows, cols, groupSize: cols };
  }
  const n = rng.int(min, max);
  if (arrangement === 'groups') {
    const groupSize = preset.groupSize ?? 5;
    return {
      n, arrangement, groupSize,
      groups: Math.floor(n / groupSize),
      remainder: n % groupSize,
    };
  }
  return { n, arrangement: 'scatter', groupSize: preset.groupSize ?? 10 };
}

// Lay items out in a unit box (0..1 x 0..1). Returns {items, radius}.
// Items never overlap because each lives in its own grid cell with jitter.
export function layoutScene(scene, rng, aspect = 1.6) {
  const { n, arrangement } = scene;
  if (arrangement === 'rows') return layoutRows(scene);
  if (arrangement === 'groups') return layoutGroups(scene, rng, aspect);
  return layoutScatter(n, rng, aspect);
}

function gridFor(count, aspect) {
  let cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)));
  let rows = Math.max(1, Math.ceil(count / cols));
  while (cols * rows < count) rows++;
  return { cols, rows };
}

function layoutScatter(n, rng, aspect) {
  const { cols, rows } = gridFor(Math.max(n, 1), aspect);
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  const chosen = rng.shuffle(cells).slice(0, n);
  const cw = 1 / cols, ch = 1 / rows;
  const items = chosen.map(([c, r], i) => ({
    id: i,
    x: (c + 0.5 + (rng.next() - 0.5) * 0.5) * cw,
    y: (r + 0.5 + (rng.next() - 0.5) * 0.5) * ch,
  }));
  const radius = Math.min(cw * aspect, ch) * 0.28;
  return { items, radius, cols, rows };
}

function layoutRows({ rows, cols }) {
  const items = [];
  const cw = 1 / cols, ch = 1 / rows;
  let id = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    items.push({ id: id++, x: (c + 0.5) * cw, y: (r + 0.5) * ch, row: r, col: c });
  }
  const radius = Math.min(cw * 1.6, ch) * 0.3;
  return { items, radius, cols, rows };
}

function layoutGroups(scene, rng, aspect) {
  const { groupSize, groups, remainder } = scene;
  const clusterCount = groups + (remainder > 0 ? 1 : 0);
  const { cols, rows } = gridFor(Math.max(clusterCount, 1), aspect);
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push([c, r]);
  const chosen = rng.shuffle(cells).slice(0, clusterCount);
  const cw = 1 / cols, ch = 1 / rows;
  // Members sit in a mini grid of 2 columns (5 -> 2x3, 10 -> 2x5).
  const miniCols = groupSize <= 4 ? groupSize : 2;
  const miniRows = Math.ceil(groupSize / miniCols);
  const items = [];
  let id = 0;
  chosen.forEach(([c, r], g) => {
    const size = g < groups ? groupSize : remainder;
    for (let k = 0; k < size; k++) {
      const mc = k % miniCols, mr = Math.floor(k / miniCols);
      items.push({
        id: id++,
        group: g,
        x: (c + 0.5 + ((mc + 0.5) / miniCols - 0.5) * 0.8) * cw,
        y: (r + 0.5 + ((mr + 0.5) / miniRows - 0.5) * 0.8) * ch,
      });
    }
  });
  const radius = Math.min((cw * 0.8) / miniCols * aspect, (ch * 0.8) / miniRows) * 0.42;
  return { items, radius, cols, rows };
}

// How good was the estimate? Thresholds scale with the quantity so that
// "close" means the same thing at 12 and at 112.
export function judgeEstimate(estimate, n) {
  const diff = estimate - n;
  const abs = Math.abs(diff);
  const tolClose = Math.max(2, Math.round(n * 0.1));
  const tolNear = Math.max(4, Math.round(n * 0.25));
  let grade;
  if (abs === 0) grade = 'spot';
  else if (abs <= tolClose) grade = 'close';
  else if (abs <= tolNear) grade = 'near';
  else grade = 'far';
  return {
    diff, abs, grade,
    direction: diff === 0 ? 'same' : diff > 0 ? 'over' : 'under',
  };
}

export function estimateMessage(estimate, n) {
  const j = judgeEstimate(estimate, n);
  if (j.grade === 'spot') return `Spot on. There are ${n}.`;
  // direction describes the estimate; the sentence describes the real count.
  const dir = j.direction === 'under' ? 'more than' : 'fewer than';
  const lead = j.grade === 'close' ? 'Very close.' : j.grade === 'near' ? 'Close.' : 'Good try.';
  return `${lead} You estimated ${estimate}. There are ${n}, which is ${j.abs} ${dir} your estimate.`;
}

// Describe the structure of the count in mathematical language.
export function describeCount(scene) {
  const { n, arrangement } = scene;
  if (arrangement === 'rows') {
    return `${scene.rows} rows of ${scene.cols} is ${scene.rows} × ${scene.cols} = ${n}.`;
  }
  if (arrangement === 'groups') {
    const g = scene.groups, s = scene.groupSize, r = scene.remainder;
    if (r === 0) return `${g} groups of ${s} is ${g} × ${s} = ${n}.`;
    return `${g} groups of ${s} and ${r} more is ${g * s} + ${r} = ${n}.`;
  }
  return placeValueText(n);
}

export function placeValueText(n) {
  const hundreds = Math.floor(n / 100), tens = Math.floor((n % 100) / 10), ones = n % 10;
  const parts = [];
  if (hundreds) parts.push(`${hundreds} hundred${hundreds > 1 ? 's' : ''}`);
  if (tens) parts.push(`${tens} ten${tens > 1 ? 's' : ''}`);
  if (ones || parts.length === 0) parts.push(`${ones} one${ones !== 1 ? 's' : ''}`);
  return `${parts.join(' and ')} is ${n}.`;
}

// Running tally while counting: how many full groups and leftovers so far.
export function tally(countSoFar, groupSize) {
  return { groups: Math.floor(countSoFar / groupSize), rest: countSoFar % groupSize };
}
