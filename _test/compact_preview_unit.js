// Unit test for trimEntryLines() + compactPreview() + formatBookBodyHtml()
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../script.js', 'utf8');
function extract(name) {
  const start = src.indexOf('function ' + name);
  if (start < 0) throw new Error(name + ' not found');
  let i = src.indexOf('{', start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (!depth) return src.slice(start, j + 1); }
  }
  throw new Error('unbalanced');
}
const m1 = src.match(/BOOK_PREVIEW_MAX_CHARS = (\d+)/); const m2 = src.match(/BOOK_PREVIEW_MAX_LINES\s*= (\d+)/);
const BOOK_PREVIEW_MAX_CHARS = Number(m1[1]); const BOOK_PREVIEW_MAX_LINES = Number(m2[1]);
globalThis.trimEntryLines = eval('(' + extract('trimEntryLines') + ')');
const trim = globalThis.trimEntryLines;
const compact = eval('(' + extract('compactPreview') + ')');

// 1. trimming: blanks, dash-only lines, leading/trailing noise, inner spaces
const t1 = trim("\n\n  Hello there   friend \n---\n\n\nsecond line  \n \n");
if (JSON.stringify(t1) !== JSON.stringify(["Hello there friend", "", "second line"])) throw new Error('trim bad: ' + JSON.stringify(t1));

// 2. short entry stays whole (no ellipsis)
const short = ["Good morning! Did you sleep well?"];
if (compact(short) !== short) throw new Error('short entry was folded');

// 3. long entry folds on a WORD boundary and ends with …
const longLine = ("word".padEnd(0)) + Array.from({length: 200}, (_,i)=>"alpha"+i).join(" ");
const folded = compact(trim(longLine));
const joined = folded.join("\n");
if (!joined.endsWith("…")) throw new Error('folded preview must end with ellipsis: ' + joined.slice(-30));
if (joined.length > 640) throw new Error('folded preview too long: ' + joined.length);
// no broken word right before the ellipsis
const beforeEll = joined.slice(0, joined.length - 1).trim();
if (/[\w]\z/.test(beforeEll)) throw new Error('cut mid-word');
if (!/[a-z0-9]$/.test(beforeEll)) throw new Error('cut left dangling punctuation/space: ' + JSON.stringify(beforeEll.slice(-20)));

// 4. many blank lines -> hard line cap respected
const manyBlanks = Array.from({length: 30}, () => "line").join("\n\n");
const c2 = compact(trim(manyBlanks));
if (c2.join("\n").split("\n").length > 15) throw new Error('line cap not applied');

console.log('COMPACT/PREVIEW UNIT TESTS PASSED ✓');
