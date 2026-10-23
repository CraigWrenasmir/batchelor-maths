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
      { kind: 'make', title: 'Fill the request', target: first, initial: [0, 0] },
      { kind: 'different', title: 'Another way to pack', target: first, initial: null },
      { kind: 'change', title: 'The request has changed', target: changed, initial: null },
      { kind: 'repair', title: 'Check someone else’s pack', target: repair, initial: [Math.floor(wrongTotal / 2), Math.ceil(wrongTotal / 2)] },
      { kind: 'create', title: 'Make your own challenge', target: first, initial: [0, 0] },
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
    case 'different': return `Keep ${stage.target} ${noun}. Put a different number in each tray than before.`;
    case 'change': return `The new request is ${stage.target} ${noun}. Change the pack you already have.`;
    case 'repair': return `This pack needs ${stage.target} ${noun}. Check it and make any changes it needs.`;
    case 'create': return `Choose a request. Pack it in the two trays, then invite someone to find another way.`;
    default: return `Pack ${stage.target} ${noun} across the two trays. You choose how many go in each.`;
  }
}

export function packFeedback(stage, result, a, b, config) {
  const noun = config.context === 'shapes' ? 'tiles' : 'markers';
  if (result.correct) {
    const equation = `${a} + ${b} = ${stage.target}.`;
    if (result.swapped) return `${equation} The trays have switched amounts. The total is still ${stage.target}. Can you describe another change?`;
    if (stage.kind === 'different') return `${equation} A different split, with the same total. What stayed the same?`;
    if (stage.kind === 'change') return `${equation} Your pack matches the new request. How did you change it?`;
    if (stage.kind === 'repair') return `${equation} The pack now matches. How could you explain your repair?`;
    if (stage.kind === 'create') return `${equation} Your challenge is ready. Invite someone to pack ${stage.target} a different way, or change your request.`;
    return `${equation} Your pack matches. Tell or show someone how you know.`;
  }
  if (result.reason === 'same-split') return `The total is ${stage.target}, and the trays match your first pack. Move some ${noun} between trays to find a different split.`;
  if (result.reason === 'invalid') return 'Use the tray buttons to build a pack, then check it again.';
  const direction = result.reason === 'too-few' ? 'more' : 'fewer';
  const compare = config.support === 'guided'
    ? `The pack needs ${result.difference} ${direction}.`
    : `Compare your total with the request. Does the pack need more or fewer?`;
  return `There are ${result.total} ${noun}; the request is ${stage.target}. ${compare} You can change either tray and check again.`;
}

export function packHint(stage, a, b, config, prior = null) {
  if (stage.kind === 'different') {
    return a + b === stage.target
      ? 'Move one object from a tray into the other tray. What happens to the total?'
      : 'First make the requested total. Then move an object between trays without adding or taking any away.';
  }
  if (a + b === stage.target) return 'Count each tray, then count the two trays together. You can use Check when you are ready.';
  if (stage.kind === 'create') return 'Pick a number for someone else to pack. There can be many ways to split the same total.';
  return `Count what is already in the trays. Compare that with ${stage.target}. Will you add objects or take some away?`;
}
