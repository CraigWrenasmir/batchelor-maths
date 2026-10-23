/** Pack the gear: bounded, deterministic session content and mathematical rules. */
export const PACK_STAGES = ['make', 'different', 'change', 'repair', 'create'];

export function normalisePackConfig(config = {}) {
  return {
    packRange: [5, 10, 20].includes(Number(config.packRange)) ? Number(config.packRange) : 10,
    support: ['guided', 'some', 'independent'].includes(config.support) ? config.support : 'guided',
    context: config.context === 'shapes' ? 'shapes' : 'equipment',
    mode: config.mode === 'classroom' ? 'classroom' : 'practice',
  };
}

export function createPackPlan(range = 10, variant = 0) {
  const limit = [5, 10, 20].includes(Number(range)) ? Number(range) : 10;
  const sets = {
    5: [[4, 5, 3], [3, 4, 5], [5, 3, 4]],
    10: [[7, 10, 8], [8, 6, 9], [6, 9, 7]],
    20: [[13, 16, 15], [16, 12, 18], [12, 17, 14]],
  };
  const index = ((Math.trunc(variant) % 3) + 3) % 3;
  const [first, changed, repair] = sets[limit][index];
  const wrongTotal = repair === limit ? repair - 1 : repair + 1;
  return {
    limit,
    variant: index,
    stages: [
      { kind: 'make', title: 'Pack the trays', target: first, initial: [0, 0] },
      { kind: 'different', title: 'Try another way', target: first, initial: null },
      { kind: 'change', title: 'Pack a new number', target: changed, initial: null },
      { kind: 'repair', title: 'Fix the pack', target: repair, initial: [Math.floor(wrongTotal / 2), Math.ceil(wrongTotal / 2)] },
      { kind: 'create', title: 'Choose your number', target: first, initial: [0, 0] },
    ],
  };
}

export function validatePack(stage, a, b, prior = null) {
  const total = a + b;
  if (![a, b, stage.target].every(Number.isInteger) || a < 0 || b < 0) {
    return { correct: false, reason: 'invalid', total };
  }
  if (total !== stage.target) {
    return { correct: false, reason: total < stage.target ? 'too-few' : 'too-many', total, difference: Math.abs(stage.target - total) };
  }
  if (stage.kind === 'different' && prior && a === prior[0] && b === prior[1]) {
    return { correct: false, reason: 'same-split', total };
  }
  return {
    correct: true,
    reason: 'correct',
    total,
    swapped: !!(stage.kind === 'different' && prior && a === prior[1] && b === prior[0]),
  };
}

export function packSolution(stage, prior = null) {
  let a = Math.floor(stage.target / 2);
  let b = stage.target - a;
  if (stage.kind === 'different' && prior && a === prior[0] && b === prior[1]) {
    a = a === 0 ? 1 : a - 1;
    b = stage.target - a;
  }
  return [a, b];
}

export function packInstruction(stage, config) {
  const noun = config.context === 'shapes' ? 'tiles' : 'markers';
  switch (stage.kind) {
    case 'different': return `Keep ${stage.target} ${noun} altogether. Move some to the other tray.`;
    case 'change': return `Make ${stage.target} ${noun} altogether. Add or take some away.`;
    case 'repair': return `We need ${stage.target} ${noun}. Count the pack. Fix it.`;
    case 'create': return `Choose a number. Pack that many ${noun}.`;
    default: return `Put ${stage.target} ${noun} in the trays altogether.`;
  }
}

export function packFeedback(stage, result, a, b, config) {
  const noun = config.context === 'shapes' ? 'tiles' : 'markers';
  if (result.correct) {
    const equation = `${a} + ${b} = ${stage.target}.`;
    if (result.swapped) return `${equation} You swapped the amounts. The total stayed the same.`;
    if (stage.kind === 'different') return `${equation} A new way. The same total. What changed?`;
    if (stage.kind === 'change') return `${equation} You made the new total. What did you change?`;
    if (stage.kind === 'repair') return `${equation} You fixed the pack. Show what you changed.`;
    if (stage.kind === 'create') return `${equation} Ask someone to pack ${stage.target} another way.`;
    return `${equation} You packed ${stage.target}. Show how you know.`;
  }
  if (result.reason === 'same-split') return `You have ${stage.target}. Try a new way. Move some ${noun} to the other tray.`;
  if (result.reason === 'invalid') return 'Use + to add. Tap Check when you are ready.';
  const direction = result.reason === 'too-few' ? 'more' : 'fewer';
  const compare = config.support === 'guided'
    ? `We need ${result.difference} ${direction}.`
    : `Do you need more or fewer?`;
  return `You have ${result.total}. We need ${stage.target}. ${compare}`;
}

export function packHint(stage, a, b, config, prior = null) {
  if (stage.kind === 'different') {
    return a + b === stage.target
      ? 'Move one to the other tray. Does the total change?'
      : `First make ${stage.target}. Then move one to the other tray.`;
  }
  if (a + b === stage.target) return 'Count both trays together. Then tap Check.';
  if (stage.kind === 'create') return 'Choose a number. Ask someone to pack it another way.';
  return `Count both trays. We need ${stage.target}. Use + to add. Use − to take away.`;
}
