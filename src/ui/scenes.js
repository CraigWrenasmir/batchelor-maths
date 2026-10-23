// Original SVG symbols for context packs. Each symbol fits a 100 x 100 box.
// Simple flat shapes, no cultural designs, easy for the school to replace.
const SVG_NS = 'http://www.w3.org/2000/svg';

export const SYMBOLS = `
<symbol id="sym-mound" viewBox="0 0 100 100">
  <path d="M36 96 L31 58 Q33 14 50 10 Q67 14 69 58 L64 96 Z" fill="#b5673a"/>
  <path d="M50 10 Q62 16 62 56 L59 96 L64 96 L69 58 Q67 14 50 10 Z" fill="#8f4a27"/>
  <path d="M42 30 Q46 22 50 21" stroke="#d9a070" stroke-width="3" fill="none" stroke-linecap="round"/>
</symbol>
<symbol id="sym-fish" viewBox="0 0 100 100">
  <path d="M14 50 Q40 22 70 50 Q40 78 14 50 Z" fill="#5f8e9e"/>
  <path d="M68 50 L92 32 L88 50 L92 68 Z" fill="#4a7686"/>
  <path d="M40 40 Q52 36 60 44" stroke="#8fb8c4" stroke-width="3" fill="none"/>
  <circle cx="30" cy="46" r="4" fill="#1f2a24"/>
</symbol>
<symbol id="sym-stone" viewBox="0 0 100 100">
  <path d="M18 60 Q14 30 42 24 Q74 18 84 44 Q90 70 62 78 Q30 84 18 60 Z" fill="#8f9a94"/>
  <path d="M30 42 Q46 30 66 36" stroke="#c3cbc6" stroke-width="5" fill="none" stroke-linecap="round"/>
</symbol>
<symbol id="sym-mango" viewBox="0 0 100 100">
  <path d="M30 26 Q66 14 80 44 Q88 72 60 84 Q28 92 20 60 Q16 36 30 26 Z" fill="#e2a23b"/>
  <path d="M30 26 Q50 24 64 40 Q50 36 34 44 Z" fill="#c9733a"/>
  <path d="M34 26 L30 14" stroke="#5a4a2a" stroke-width="4" stroke-linecap="round"/>
  <path d="M34 18 Q50 8 58 18 Q48 24 34 18 Z" fill="#3f7a4a"/>
</symbol>
<symbol id="sym-bird" viewBox="0 0 100 100">
  <path d="M8 56 Q30 30 50 52 Q70 30 92 56 Q70 46 50 64 Q30 46 8 56 Z" fill="#2b2f2c"/>
</symbol>
<symbol id="sym-counter" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#2f6f8a"/>
  <circle cx="50" cy="50" r="26" fill="none" stroke="#cfe3ea" stroke-width="6"/>
</symbol>
<symbol id="sym-block" viewBox="0 0 100 100">
  <rect x="12" y="12" width="76" height="76" rx="12" fill="#b8956a"/>
  <rect x="22" y="22" width="56" height="56" rx="8" fill="none" stroke="#f7f1e4" stroke-width="5"/>
</symbol>
`;

export const GROUNDS = {
  savanna: { from: '#efe3c8', to: '#d8c48f' },
  water: { from: '#d6e8ee', to: '#9fc3cf' },
  creekbed: { from: '#e9e3d4', to: '#cbbfa6' },
  paper: { from: '#f7f1e4', to: '#efe5d2' },
  dusk: { from: '#f1d9c9', to: '#d9bf93' },
};

export function ensureDefs() {
  if (document.getElementById('bas-defs')) return;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.id = 'bas-defs';
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `<defs>${SYMBOLS}</defs>`;
  document.body.prepend(svg);
}

export function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

// Decorative horizon for the home page: mounds, grass and a creek line.
export function horizonSvg() {
  return `<svg viewBox="0 0 1200 160" preserveAspectRatio="none" aria-hidden="true" style="display:block;width:100%;height:140px">
    <rect width="1200" height="160" fill="#efe5d2"/>
    <path d="M0 120 Q300 100 600 118 T1200 112 L1200 160 L0 160 Z" fill="#dfd2b2"/>
    <path d="M0 136 Q300 126 600 138 T1200 132 L1200 160 L0 160 Z" fill="#2f6f8a" opacity="0.55"/>
    <g fill="#b5673a">
      <path d="M110 124 L106 92 Q108 62 118 60 Q128 62 130 92 L126 124 Z"/>
      <path d="M180 126 L177 100 Q178 80 186 79 Q194 80 195 100 L192 126 Z"/>
      <path d="M860 124 L856 90 Q858 58 868 56 Q878 58 880 90 L876 124 Z"/>
      <path d="M930 126 L927 104 Q928 84 936 83 Q944 84 945 104 L942 126 Z"/>
      <path d="M1040 124 L1036 96 Q1038 70 1048 68 Q1058 70 1060 96 L1056 124 Z"/>
    </g>
    <g stroke="#b9a24a" stroke-width="3" stroke-linecap="round" fill="none">
      <path d="M300 124 q4 -18 10 -26"/><path d="M312 124 q-2 -20 6 -30"/><path d="M322 124 q6 -14 14 -18"/>
      <path d="M640 124 q4 -18 10 -26"/><path d="M652 124 q-2 -20 6 -30"/><path d="M662 124 q6 -14 14 -18"/>
      <path d="M1130 124 q4 -18 10 -26"/><path d="M1142 124 q-2 -20 6 -30"/>
    </g>
    <g fill="#3f7a4a">
      <path d="M470 124 Q466 92 452 84 Q470 88 476 110 Q480 84 500 78 Q482 92 482 124 Z"/>
      <path d="M760 124 Q756 96 744 90 Q760 94 766 112 Q770 90 788 84 Q772 96 772 124 Z"/>
    </g>
  </svg>`;
}
