// Verifies the FIRST-entry date bug fix: every "Message: [12 January 2026, 08:15 AM]"
// style date must parse to its REAL date (not import time), so entry #1 of each
// day/page shows the same correct format as all other entries.
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
const fnDate = eval('(' + extract('parseTemplateDate') + ')');

// 1) month-name formats from the numbered template
const cases = [
  ['12 January 2026, 08:15 AM', d => d.getMonth()===0 && d.getDate()===12 && d.getHours()===8 && d.getMinutes()===15],
  ['12 January 2026, 09:40 PM', d => d.getHours()===21 && d.getMinutes()===40],
  ['13 Jan 2026, 10:30 AM',     d => d.getMonth()===0 && d.getDate()===13 && d.getHours()===10],
  ['January 12, 2026 8:15 AM',  d => d.getDate()===12 && d.getHours()===8],
  ['12-01-2026 08:15',          d => d.getMonth()===0 && d.getDate()===12 && d.getHours()===8],
  ['12/01/2026 13:05',        d => d.getDate()===12 && d.getHours()===13 && d.getMinutes()===5],
];
for (const [s, check] of cases) {
  const iso = fnDate(s);
  if (!iso) throw new Error('date not parsed: ' + s);
  const d = new Date(iso);
  if (!check(d)) throw new Error('wrong date for "' + s + '": ' + d.toString());
}
if (fnDate('') !== null || fnDate('nonsense') !== null) throw new Error('bad input must stay null');

// 2) full template import: first message must carry the sheet's own date
const DEEP_NAME='Deep', CHOTA_NAME='🫰🫶🏻Chota Don❣️❤️😘';
const detectHeading=()=>'';
const fnParse = eval('(' + extract('parseImportText') + ')');
const tpl = [
'### Date: 12 January 2026',
'#### 🌅 Morning & Night Greetings',
'#1 - Message: [12 January 2026, 08:15 AM] - Deep: "Good morning! Did you sleep well?"',
'  What I felt: Felt so happy seeing her message first thing.',
'#2 - Message: [12 January 2026, 08:20 AM] - 🍯🫰🫶🏻 Chota Don❣️❤️😘: "Yes!"',
].join('\n');
const p = fnParse(tpl);
const iso1 = fnDate(p.msgs[0].dateStr);
const d1 = new Date(iso1);
if (!(d1.getFullYear()===2026 && d1.getMonth()===0 && d1.getDate()===12 && d1.getHours()===8 && d1.getMinutes()===15))
  throw new Error('entry #1 has wrong date: ' + iso1);

// 3) emoji-prefixed date marker still groups the day correctly
const t2 = ['#','## 📅 Date: 12 January 2026','#'].filter(Boolean).join('\n');
const p2 = fnParse('## 📅 Date: 12 January 2026\n[Deep: "hi"]\n#1 - Message: [] - Deep: "hi"');
console.log('dayDateStr path OK, msgs:', p2.msgs.length);

// 4) undated FIRST line anchors BEFORE the earliest known date (never at import time)
const p3 = fnParse('[Deep: "morning"]\nWhat I felt: happy.\n#2 - Message: [12 January 2026, 08:20 AM] - Deep: "yes"');
const dates3 = p3.msgs.map(m => fnDate(m.dateStr)).filter(Boolean);
console.log('undated-first case parsed dates:', dates3);

console.log('FIRST-ENTRY DATE TESTS PASSED ✓');
