// UNIT: run the REAL collectLines() from script.js against jsdom and verify
// line units never break a word mid-way ("and\nl\nater" style mangling).
const fs = require('fs');
const { JSDOM } = require('jsdom');

const src = fs.readFileSync('/workspace/script.js', 'utf8');
// extract the exact collectLines function source from flowPages
const m = src.match(/function collectLines\(html\) \{[\s\S]*?\n      \}\n/);
if (!m) { console.error('could not extract collectLines'); process.exit(1); }
let fnSrc = m[0];

// minimal stubs the function body relies on
const dom = new JSDOM(`<!doctype html><html><body>
  <style>#measureHost .entry-body{font-size:14.72px;line-height:30px;white-space:pre-wrap;word-break:break-word;margin:0}</style>
  <div id="measureHost"><div class="book"><div class="print-sheet">
    <div class="page-inner"><div class="page-content"></div></div>
  </div></div></div></body></html>`, { pretendToBeVisual: true });
const document = dom.window.document;
const mp = document.querySelector('.page-content');
mp.clientWidth = 742; // standard content width (794 - 2*26)

// jsdom does no layout: fake getBoundingClientRect/getClientRects by
// simulating wrapping at fixed columns so we can still test the ALGORITHM's
// plumbing (span-per-run + walk + offsets consumption).
Object.defineProperty(dom.window.Range.prototype, 'getClientRects', {
  get() {
    const rng = this;
    const node = rng.startContainer;
    if (node.nodeType === 3) {
      const text = node.textContent.slice(0, rng.endOffset - (rng.startContainer === node ? rng.startOffset : 0));
      const COLS = 60;
      const nLines = Math.max(1, Math.ceil(text.length / COLS));
      const rects = [];
      for (let i = 0; i < nLines; i++) rects.push({ top: i * 30, left: 0, width: 500, height: 30, bottom: i * 30 + 30, right: 500 });
      return rects;
    }
    return [{ top: 0, left: 0, width: 500, height: 30, bottom: 30, right: 500 }];
  }
});
dom.window.Range.prototype.selectNodeContents = function (n) {
  this.setStart(n, 0);
  this.setEnd(n, n.nodeType === 3 ? n.textContent.length : n.childNodes.length);
};

const escapeHtml = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const syncHostFont = () => {};
global.document = document;

const collectLines = new Function('mp','syncHostFont','escapeHtml', fnSrc + '\nreturn collectLines;')(mp, syncHostFont, escapeHtml);

const longText = "It was just a normal day and I just received an request on Shadi.Com and started talking and later after few time she given me her number and told me to come on WhatsApp and we started talking.";
const html = longText.split(' ').map(w => escapeHtml(w)).join(' '); // single text run
const lines = collectLines(html);
console.log('line units:', lines.length);
lines.forEach((L,i)=>console.log(i, JSON.stringify(L.text || (L.br?'<br>':''))));
// rebuild joined text and compare with original (words must all survive, none split)
const joined = lines.filter(L=>!L.br).map(L=>L.text).join(' ');
const origWords = longText.split(/\s+/);
const gotWords = joined.split(/\s+/);
let bad = [];
for (const w of origWords) if (!gotWords.includes(w)) bad.push(w);
console.log('missing/split words:', bad.length, bad.slice(0,10));
process.exit(bad.length ? 1 : 0);
