// Presets for Where does it go?  Codes are Australian Curriculum v9 Mathematics.
// Road distances are from Batchelor by road and come from the NT Parks and
// Wildlife Litchfield fact sheet and Wikipedia; the school should check them.

export const LINE_PRESETS = [
  { id: 'to10', label: '0 to 10', min: 0, max: 10, resolution: 1, tickStep: 1, labelTicks: 'ends', representations: ['numeral', 'dots'], cards: 3, codes: ['AC9MFN01', 'AC9MFN03'] },
  { id: 'to20', label: '0 to 20', min: 0, max: 20, resolution: 1, tickStep: 1, labelTicks: 'mid', representations: ['numeral', 'dots'], cards: 4, codes: ['AC9MFN01', 'AC9M1N01'] },
  { id: 'to100', label: '0 to 100', min: 0, max: 100, resolution: 1, tickStep: 10, labelTicks: 'mid', representations: ['numeral'], cards: 4, codes: ['AC9M1N01', 'AC9M2N01'] },
  { id: 'to100-blank', label: '0 to 100, no tick marks', min: 0, max: 100, resolution: 1, tickStep: 0, labelTicks: 'ends', representations: ['numeral'], cards: 4, codes: ['AC9M2N01'] },
  { id: 'to1000', label: '0 to 1000', min: 0, max: 1000, resolution: 10, tickStep: 100, labelTicks: 'mid', representations: ['numeral'], cards: 4, codes: ['AC9M2N01', 'AC9M3N01'] },
  { id: 'to10000', label: '0 to 10 000', min: 0, max: 10000, resolution: 100, tickStep: 1000, labelTicks: 'mid', representations: ['numeral'], cards: 4, codes: ['AC9M3N01'] },
  { id: 'halves', label: 'Fractions: halves and quarters', min: 0, max: 1, resolution: 0.25, tickStep: 0, labelTicks: 'ends', kind: 'fraction', denominator: 4, avoidEnds: true, representations: ['numeral'], cards: 3, codes: ['AC9M2N03'] },
  { id: 'eighths', label: 'Fractions: eighths', min: 0, max: 1, resolution: 0.125, tickStep: 0.5, labelTicks: 'all', kind: 'fraction', denominator: 8, avoidEnds: true, representations: ['numeral'], cards: 4, codes: ['AC9M3N02'] },
  { id: 'thirds', label: 'Fractions: thirds and sixths', min: 0, max: 1, resolution: 1 / 6, tickStep: 0, labelTicks: 'ends', kind: 'fraction', denominator: 6, avoidEnds: true, representations: ['numeral'], cards: 4, codes: ['AC9M5N03', 'AC9M6N03'] },
  { id: 'tenths', label: 'Decimals: tenths 0 to 1', min: 0, max: 1, resolution: 0.1, tickStep: 0.5, labelTicks: 'all', kind: 'decimal', decimals: 1, avoidEnds: true, representations: ['numeral'], cards: 4, codes: ['AC9M4N01'] },
  { id: 'decimals10', label: 'Decimals 0 to 10', min: 0, max: 10, resolution: 0.1, tickStep: 1, labelTicks: 'mid', kind: 'decimal', decimals: 1, representations: ['numeral'], cards: 4, codes: ['AC9M4N01', 'AC9M5N01'] },
  { id: 'integers', label: 'Integers -10 to 10', min: -10, max: 10, resolution: 1, tickStep: 5, labelTicks: 'all', representations: ['numeral'], cards: 4, codes: ['AC9M6N01'] },
  {
    id: 'roads', label: 'Road distances from Batchelor (km)', min: 0, max: 100, resolution: 1, tickStep: 10, labelTicks: 'mid', kind: 'places', cards: 5, codes: ['AC9M2N01', 'AC9M3M01'],
    places: [
      { label: 'Litchfield Park Road', value: 18 },
      { label: 'Magnetic termite mounds', value: 35 },
      { label: 'Adelaide River', value: 38 },
      { label: 'Florence Falls', value: 46 },
      { label: 'Darwin', value: 98 },
    ],
  },
];

export function linePreset(id) {
  return LINE_PRESETS.find((p) => p.id === id) ?? LINE_PRESETS[2];
}
