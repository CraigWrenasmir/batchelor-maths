// Presets for Grow the pattern.  Codes are Australian Curriculum v9 Mathematics.
export const PATTERN_PRESETS = [
  { id: 'repeat', label: 'Repeating patterns (continue)', mode: 'repeat', units: ['AB', 'ABB', 'AAB', 'ABC'], codes: ['AC9MFA01'] },
  { id: 'repeat-long', label: 'Repeating patterns, longer units', mode: 'repeat', units: ['ABCC', 'ABAC', 'ABC', 'AABB'], codes: ['AC9MFA01', 'AC9M1A01'] },
  { id: 'grow-easy', label: 'Growing patterns: add the same each time', mode: 'grow', patterns: ['rows2', 'tower1'], predict: [5, 10], codes: ['AC9M1A01', 'AC9M2A01'] },
  { id: 'grow', label: 'Growing patterns with a fixed part', mode: 'grow', patterns: ['lshape', 'cross', 'fence'], predict: [5, 10], codes: ['AC9M2A01', 'AC9M3A01'] },
  { id: 'grow-rule', label: 'Find the rule (to step 100)', mode: 'grow', patterns: ['lshape', 'cross', 'fence', 'rows2'], predict: [10, 100], showRule: true, codes: ['AC9M6A01', 'AC9M7A01'] },
  { id: 'grow-challenge', label: 'Challenge: stairs (not a constant add)', mode: 'grow', patterns: ['stairs'], predict: [5, 10], showRule: true, codes: ['AC9M6A01'] },
];

export function patternPreset(id) {
  return PATTERN_PRESETS.find((p) => p.id === id) ?? PATTERN_PRESETS[3];
}
