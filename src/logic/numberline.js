// Pure logic for "Where does it go?" (number line placement and mystery number).

export function lineFor(preset) {
  const { min, max } = preset;
  const ticks = [];
  const step = preset.tickStep ?? 0;
  if (step > 0) {
    for (let v = min; v <= max + 1e-9; v = +(v + step).toFixed(10)) ticks.push(+v.toFixed(10));
  }
  const labelled = preset.labelTicks === 'all' ? ticks
    : preset.labelTicks === 'ends' ? [min, max]
    : preset.labelTicks === 'mid' ? [min, (min + max) / 2, max]
    : [min, max];
  return { min, max, ticks, labelled };
}

export function toFrac(value, min, max) {
  return (value - min) / (max - min);
}

export function fromFrac(frac, min, max) {
  return min + frac * (max - min);
}

// Snap a raw line value to the preset's resolution (e.g. whole numbers, tenths, eighths).
export function snapValue(raw, preset) {
  const res = preset.resolution ?? 1;
  const v = Math.round(raw / res) * res;
  return +Math.min(preset.max, Math.max(preset.min, v)).toFixed(6);
}

export function formatValue(v, preset) {
  if (preset.kind === 'fraction') {
    const den = preset.denominator;
    const num = Math.round(v * den);
    if (num === 0) return '0';
    if (num === den) return '1';
    if (num % den === 0) return String(num / den);
    return `${num}/${den}`;
  }
  if (preset.kind === 'decimal') return v.toFixed(preset.decimals ?? 1);
  return String(Math.round(v));
}

// Generate a round of cards to place.
export function generateCards(preset, count, rng) {
  const cards = [];
  const used = new Set();
  if (preset.kind === 'places') {
    return rng.shuffle(preset.places).slice(0, count).map((p, i) => ({
      id: i, value: p.value, kind: 'label', display: p.label, detail: `${p.value} km`,
    }));
  }
  const res = preset.resolution ?? 1;
  const steps = Math.round((preset.max - preset.min) / res);
  let guard = 0;
  while (cards.length < count && guard++ < 500) {
    let k = rng.int(preset.avoidEnds ? 1 : 0, preset.avoidEnds ? steps - 1 : steps);
    const value = +(preset.min + k * res).toFixed(6);
    if (used.has(value)) continue;
    used.add(value);
    const repr = pickRepresentation(preset, rng);
    cards.push({ id: cards.length, value, kind: repr, display: formatValue(value, preset) });
  }
  return cards;
}

function pickRepresentation(preset, rng) {
  const reps = preset.representations ?? ['numeral'];
  return rng.pick(reps);
}

// Judge a placement. Error is measured as a fraction of the line length so
// the same tolerance works on 0-10 and 0-10 000.
export function judgePlacement(value, placed, preset) {
  const range = preset.max - preset.min;
  const errorFrac = Math.abs(placed - value) / range;
  let grade;
  // Input already snaps to the preset resolution. Only the actual value is exact.
  if (Math.abs(placed - value) < 0.000001) grade = 'spot';
  else if (errorFrac <= 0.05) grade = 'close';
  else grade = 'off';
  const direction = placed === value ? 'same' : placed > value ? 'right' : 'left';
  return { errorFrac, grade, direction };
}

// Explain where a value sits relative to benchmarks (the labelled ticks or
// the line's quarter points when there are no ticks).
export function benchmarkText(value, preset) {
  const line = lineFor(preset);
  const marks = line.ticks.length > 2 ? line.ticks : [preset.min, (preset.min + preset.max) / 2, preset.max];
  let lower = marks[0], upper = marks[marks.length - 1];
  for (const m of marks) {
    if (m <= value) lower = m;
    if (m >= value) { upper = m; break; }
  }
  const f = (x) => formatValue(x, preset);
  if (lower === upper) return `${f(value)} is exactly on ${f(lower)}.`;
  const mid = (lower + upper) / 2;
  if (Math.abs(value - mid) < 1e-9) return `${f(value)} is halfway between ${f(lower)} and ${f(upper)}.`;
  const nearer = value < mid ? lower : upper;
  return `${f(value)} is between ${f(lower)} and ${f(upper)}, closer to ${f(nearer)}.`;
}

export function placementMessage(card, placed, preset) {
  const j = judgePlacement(card.value, placed, preset);
  const f = (x) => formatValue(x, preset);
  const name = card.kind === 'label' ? `${card.display} (${f(card.value)})` : f(card.value);
  if (j.grade === 'spot') return `Yes. ${benchmarkText(card.value, preset)}`;
  const side = j.direction === 'right' ? 'too far right' : 'too far left';
  if (j.grade === 'close') return `Nearly. ${name} was placed a little ${side}. ${benchmarkText(card.value, preset)}`;
  return `Not yet. ${name} was placed ${side}. ${benchmarkText(card.value, preset)}`;
}

// Mystery number: returns which part of the line is ruled out.
export function mysteryJudge(guess, secret) {
  if (guess === secret) return 'found';
  return guess < secret ? 'low' : 'high';
}

export function mysteryMessage(guess, secret, preset) {
  const f = (x) => formatValue(x, preset);
  const r = mysteryJudge(guess, secret);
  if (r === 'found') return `Found it. The mystery number is ${f(secret)}.`;
  return r === 'low' ? `${f(guess)} is too small. The mystery number is bigger.` : `${f(guess)} is too big. The mystery number is smaller.`;
}

// Keep track of the interval that is still possible after each guess.
export function narrow(interval, guess, verdict) {
  const [lo, hi] = interval;
  if (verdict === 'low') return [Math.max(lo, guess), hi];
  if (verdict === 'high') return [lo, Math.min(hi, guess)];
  return [guess, guess];
}
