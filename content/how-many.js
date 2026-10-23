// Presets for How many?  Teacher-facing labels and curriculum codes live
// here, never on the student screen. Codes are Australian Curriculum v9
// Mathematics (ACARA). The school's own scope and sequence has not been
// supplied yet; see docs/curriculum-map.md.

export const HOW_MANY_PRESETS = [
  {
    id: 'to10', label: 'Up to 10, scattered', min: 3, max: 10, arrangement: 'scatter', groupSize: 5,
    quickLook: false, codes: ['AC9MFN02', 'AC9MFN03'],
    note: 'Subitising and counting small collections. Try Quick look for subitising up to 5.',
  },
  {
    id: 'to20', label: 'Up to 20, scattered', min: 8, max: 20, arrangement: 'scatter', groupSize: 5,
    codes: ['AC9MFN03', 'AC9MFN01'], note: 'Estimate, then count in ones; the tally shows fives.',
  },
  {
    id: 'fives', label: 'Groups of 5 (up to 30)', min: 11, max: 30, arrangement: 'groups', groupSize: 5,
    codes: ['AC9M1N03', 'AC9M1A01'], note: 'Skip counting by fives with a remainder.',
  },
  {
    id: 'to50', label: 'Up to 50, scattered, count in tens', min: 21, max: 50, arrangement: 'scatter', groupSize: 10,
    codes: ['AC9M1N01', 'AC9M1N02', 'AC9M1N03'], note: 'Every ten counted becomes a labelled group: tens and ones.',
  },
  {
    id: 'tens', label: 'Groups of 10 (up to 120)', min: 31, max: 120, arrangement: 'groups', groupSize: 10,
    codes: ['AC9M1N03', 'AC9M2N02'], note: 'Unitising tens; place value in the feedback.',
  },
  {
    id: 'to120', label: 'Up to 120, scattered, count in tens', min: 51, max: 120, arrangement: 'scatter', groupSize: 10,
    codes: ['AC9M1N01', 'AC9M2N02'], note: 'Large scattered collection. Estimation first matters here.',
  },
  {
    id: 'arrays', label: 'Rows (arrays) up to 6 × 10', min: 6, max: 60, arrangement: 'rows', rowsMin: 2, rowsMax: 6, colsMin: 2, colsMax: 10,
    codes: ['AC9M2N05', 'AC9M3N04'], note: 'Rows of equal size. Feedback gives rows × columns.',
  },
  {
    id: 'arrays-big', label: 'Rows (arrays) up to 10 × 12', min: 24, max: 120, arrangement: 'rows', rowsMin: 4, rowsMax: 10, colsMin: 6, colsMax: 12,
    codes: ['AC9M3N04', 'AC9M4A02'], note: 'Larger arrays for multiplication facts and partitioning rows.',
  },
];

export function howManyPreset(id) {
  return HOW_MANY_PRESETS.find((p) => p.id === id) ?? HOW_MANY_PRESETS[1];
}
