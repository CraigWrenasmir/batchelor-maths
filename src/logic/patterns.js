// Pure logic for "Grow the pattern".
// A growing pattern is defined by cells(n): the tiles at step n, each tagged
// with the part it belongs to ('base' stays the same, 'grow' is added each
// step). count(n) must equal cells(n).length; tests check this.

export const GROWING = [
  {
    id: 'rows2', label: 'Two rows', a: 2, b: 0,
    cells: (n) => {
      const out = [];
      for (let i = 0; i < n; i++) { out.push({ x: i, y: 1, part: 'grow' }); out.push({ x: i, y: 0, part: 'grow' }); }
      return out;
    },
    ruleWords: 'Each step adds 2. Step n has 2 × n tiles.',
    rule: (n) => `2 × ${n} = ${2 * n}`,
  },
  {
    id: 'tower1', label: 'Tower on a base', a: 1, b: 2,
    cells: (n) => {
      const out = [{ x: 0, y: 0, part: 'base' }, { x: 1, y: 0, part: 'base' }];
      for (let i = 0; i < n; i++) out.push({ x: 0, y: i + 1, part: 'grow' });
      return out;
    },
    ruleWords: 'The base of 2 stays. Each step adds 1 on top. Step n has n + 2 tiles.',
    rule: (n) => `${n} + 2 = ${n + 2}`,
  },
  {
    id: 'lshape', label: 'L shape', a: 2, b: 1,
    cells: (n) => {
      const out = [{ x: 0, y: 0, part: 'base' }];
      for (let i = 1; i <= n; i++) { out.push({ x: i, y: 0, part: 'grow' }); out.push({ x: 0, y: i, part: 'grow' }); }
      return out;
    },
    ruleWords: 'The corner tile stays. Each step adds 1 across and 1 up. Step n has 2 × n + 1 tiles.',
    rule: (n) => `2 × ${n} + 1 = ${2 * n + 1}`,
  },
  {
    id: 'fence', label: 'Fence', a: 3, b: 1,
    cells: (n) => {
      const out = [{ x: 0, y: 0, part: 'base' }, { x: 0, y: 1, part: 'base' }, { x: 0, y: 2, part: 'base' }];
      // each new section: a post (3 tall) is shared; add 2 rails + 1 post => 3 per step
      for (let i = 1; i <= n; i++) {
        out.push({ x: 2 * i - 1, y: 1, part: 'grow' });
        out.push({ x: 2 * i, y: 0, part: 'grow' });
        out.push({ x: 2 * i, y: 2, part: 'grow' });
      }
      return out;
    },
    ruleWords: 'The first post of 3 stays. Each step adds 3 more tiles. Step n has 3 × n + 1 tiles. (Count carefully: the base is 3 but the rule shows the shared post as 1 and each new section as 3.)',
    rule: (n) => `3 × ${n} + 3 = ${3 * n + 3}`,
  },
  {
    id: 'cross', label: 'Cross', a: 4, b: 1,
    cells: (n) => {
      const out = [{ x: 0, y: 0, part: 'base' }];
      for (let i = 1; i <= n; i++) {
        out.push({ x: i, y: 0, part: 'grow' }); out.push({ x: -i, y: 0, part: 'grow' });
        out.push({ x: 0, y: i, part: 'grow' }); out.push({ x: 0, y: -i, part: 'grow' });
      }
      return out;
    },
    ruleWords: 'The middle tile stays. Each step adds 4 arms of 1. Step n has 4 × n + 1 tiles.',
    rule: (n) => `4 × ${n} + 1 = ${4 * n + 1}`,
  },
  {
    id: 'stairs', label: 'Stairs (challenge)', a: null, b: null, nonlinear: true,
    cells: (n) => {
      const out = [];
      for (let c = 0; c < n; c++) for (let r = 0; r <= c; r++) out.push({ x: c, y: r, part: c === n - 1 ? 'grow' : 'base' });
      return out;
    },
    ruleWords: 'Each step adds a new column that is one taller. Step n has 1 + 2 + ... + n tiles, which is n × (n + 1) ÷ 2.',
    rule: (n) => `${n} × ${n + 1} ÷ 2 = ${(n * (n + 1)) / 2}`,
  },
];

// Fix the fence: define its count from its cells so the rule text is honest.
const fence = GROWING.find((p) => p.id === 'fence');
fence.a = 3; fence.b = 3;
fence.ruleWords = 'The first post of 3 stays. Each step adds a rail, a rail and a post: 3 tiles. Step n has 3 × n + 3 tiles.';

export function countAt(pattern, n) {
  return pattern.cells(n).length;
}

export function tableRows(pattern, steps) {
  return steps.map((n) => ({ step: n, count: countAt(pattern, n) }));
}

export function bounds(cells) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.x); maxX = Math.max(maxX, c.x);
    minY = Math.min(minY, c.y); maxY = Math.max(maxY, c.y);
  }
  return { minX, maxX, minY, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function judgeBuild(pattern, n, builtCount) {
  const expected = countAt(pattern, n);
  const diff = builtCount - expected;
  return { expected, diff, correct: diff === 0 };
}

// Moving the same arrangement on the board is still the same pattern. Turning
// it or merely using the same number of tiles does not match the shown shape.
export function sameShape(left, right) {
  if (left.length !== right.length) return false;
  if (left.length === 0) return true;
  const normalise = (cells) => {
    const b = bounds(cells);
    return cells.map(({ x, y }) => `${x - b.minX},${y - b.minY}`).sort().join(';');
  };
  return normalise(left) === normalise(right);
}

export function judgeArrangement(pattern, n, builtCells) {
  const count = judgeBuild(pattern, n, builtCells.length);
  const shapeMatches = count.correct && sameShape(builtCells, pattern.cells(n));
  return { ...count, countCorrect: count.correct, shapeMatches, correct: shapeMatches };
}

export function buildMessage(pattern, n, builtCount) {
  const j = judgeBuild(pattern, n, builtCount);
  if (j.correct) return `The total matches: ${j.expected} tiles. Compare how the tiles are arranged.`;
  const prev = countAt(pattern, n - 1);
  const add = j.expected - prev;
  const growth = pattern.nonlinear
    ? `Moving from step ${n - 1} to step ${n} adds ${add}. The next new column will be one taller.`
    : `Each step adds ${add}.`;
  return `You used ${builtCount}. Step ${n} has ${j.expected}. Step ${n - 1} had ${prev}. ${growth}`;
}

export function predictMessage(pattern, n, answer) {
  const expected = countAt(pattern, n);
  if (answer === expected) return `Yes. Step ${n} has ${expected} tiles. ${pattern.rule(n)}.`;
  return `Not ${answer}. Step ${n} has ${expected} tiles. ${pattern.rule(n)}.`;
}

// Repeating patterns (Foundation): units like AB, ABB, ABC drawn with shapes.
export const REPEATING_UNITS = ['AB', 'ABB', 'AAB', 'ABC', 'ABCC', 'ABAC'];

export function repeatingSequence(unit, length) {
  const out = [];
  for (let i = 0; i < length; i++) out.push(unit[i % unit.length]);
  return out;
}

export function nextInRepeating(unit, position) {
  return unit[position % unit.length];
}
