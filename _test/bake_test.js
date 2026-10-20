// Isolated unit test of bakeStickerIntoPageHTML extracted from script.js,
// with a strict text-collision verifier.
const fs = require('fs');
const { JSDOM } = require(require.resolve('jsdom', { paths: ['/workspace/node_modules'] }));
const dom = new JSDOM('<!DOCTYPE html><div id="root"></div>', { url: 'http://localhost/' });
global.document = dom.window.document;

const src = fs.readFileSync('/workspace/script.js', 'utf8');
function extract(name, open) {
  const i = src.indexOf(open);
  if (i < 0) throw new Error('not found: ' + name);
  let depth = 0, j = src.indexOf('{', i), start = i;
  for (; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) break; }
  }
  return src.slice(start, j + 1);
}
const consts = `
  const PRINT_A4_W_PX = Math.round(8.267 * 96);
  const MAX_STICKER_IN = 2;
  const STICKER_GAP = 6;
  const FALLBACK_STICKERS = ['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'];
  const STICKER_URLS = ['https://x/1.png','https://x/2.png','https://x/3.png'];
`;
const helpers = ['function seededRand', 'function rectsOverlap', 'function inflate']
  .map(h => extract(h, h)).join('\n');
const bakeFn = extract('bake', 'function bakeStickerIntoPageHTML');

eval(consts + helpers + '\n' + bakeFn + '\nglobal.bake = bakeStickerIntoPageHTML;');

// A page with one short line row and an explicit slot beside it (like the paginator emits)
function makePage(slots, lines) {
  let html = '<div class="page-flow">';
  lines.forEach(l => { html += l; });
  slots.forEach(s => { html += '<div class="sticker-slot" style="position:absolute;left:' + s.x + 'px;top:' + s.y + 'px;width:' + s.w + 'px;height:' + s.h + 'px;"></div>'; });
  html += '</div>';
  return html;
}
const bubble = '<div class="entry-bubble"><div class="eb-head">hi</div><div class="entry-body">short line</div></div>';

let placed = 0, skipped = 0, violations = 0, distinctPos = new Set();
for (let seed = 0; seed < 300; seed++) {
  const pg = makePage([{ x: 500, y: 100, w: 190, h: 120 }], [bubble]);
  const out = global.bake(pg, 'seed-' + seed);
  const d = dom.window.document.createElement('div');
  d.innerHTML = out;
  const st = d.querySelector('.page-sticker.sticker-baked');
  if (d.querySelector('.sticker-slot')) { console.log('FAIL: slot marker left in DOM'); process.exit(1); }
  if (!st) { skipped++; continue; }
  placed++;
  const x = parseFloat(st.style.left), y = parseFloat(st.style.top);
  const w = parseFloat(st.style.width), h = parseFloat(st.style.height);
  distinctPos.add(Math.round(x) + ',' + Math.round(y));
  // sticker must stay inside the slot (slot is guaranteed empty area)
  if (x < 500 - 0.5 || y < 100 - 0.5 || x + w > 690 + 0.5 || y + h > 220 + 0.5) {
    violations++; console.log('OUTSIDE SLOT', x, y, w, h);
  }
  if (w > 192 + 1 || h > 192 + 1) { violations++; console.log('TOO BIG', w, h); }
}
console.log('placed:', placed, 'skipped(no fit):', skipped, 'slot-violations:', violations, 'distinct positions:', distinctPos.size);

// No-slot page → fallback band, sticker must be small & bottom-right-ish, no slot markers
const pg2 = makePage([], [bubble]);
let fbPlaced = 0, fbBad = 0;
for (let seed = 0; seed < 100; seed++) {
  const out = global.bake(pg2, 'ns-' + seed);
  const d = dom.window.document.createElement('div');
  d.innerHTML = out;
  const st = d.querySelector('.page-sticker.sticker-baked');
  if (!st) continue;
  fbPlaced++;
  const x = parseFloat(st.style.left), y = parseFloat(st.style.top), w = parseFloat(st.style.width);
  if (y < 800 || x + w > 794) { fbBad++; }
}
console.log('no-slot fallback: placed', fbPlaced, 'bad', fbBad);
process.exit(violations + fbBad ? 1 : 0);
