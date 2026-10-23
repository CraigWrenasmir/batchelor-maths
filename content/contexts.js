// Context packs: the "things" that appear in How many? and the look of a
// scene. Regional items are simple original illustrations of things seen
// around Batchelor and Litchfield. Nothing here is a cultural design.
// Teachers can add a pack by copying one entry and drawing a new SVG symbol
// in src/ui/scenes.js.

export const CONTEXTS = [
  { id: 'mounds', name: 'Termite mounds', noun: ['termite mound', 'termite mounds'], symbol: 'mound', ground: 'savanna', regional: true },
  { id: 'fish', name: 'Fish in the rockhole', noun: ['fish', 'fish'], symbol: 'fish', ground: 'water', regional: true },
  { id: 'stones', name: 'Creek stones', noun: ['stone', 'stones'], symbol: 'stone', ground: 'creekbed', regional: true },
  { id: 'mangoes', name: 'Mangoes', noun: ['mango', 'mangoes'], symbol: 'mango', ground: 'paper', regional: true },
  { id: 'birds', name: 'Birds at dusk', noun: ['bird', 'birds'], symbol: 'bird', ground: 'dusk', regional: true },
  { id: 'counters', name: 'Counters', noun: ['counter', 'counters'], symbol: 'counter', ground: 'paper', regional: false },
  { id: 'blocks', name: 'Blocks', noun: ['block', 'blocks'], symbol: 'block', ground: 'paper', regional: false },
];

export function contextById(id) {
  return CONTEXTS.find((c) => c.id === id) ?? CONTEXTS[0];
}
