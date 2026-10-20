// Unit test for the entry-number + word-count logic in script.js.
// Extracts countWords() and parseImportText() from the IIFE source and runs them standalone.
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

const DEEP_NAME = 'Deep';
const CHOTA_NAME = '🫰🫶🏻Chota Don❣️❤️😘';
const detectHeading = () => '';
const fnCount = eval('(' + extract('countWords') + ')');
const fnParse = eval('(' + extract('parseImportText') + '.call(null)'.replace('.call(null)','') + ')');

// The exact numbered template from index.html (what "Copy Template" yields)
const tpl = [
'========================================',
'📖 COMPLETE DIARY - DEEP & 🍯🫰🫶🏻 Chota Don❣️❤️😘',
'========================================',
'',
'### Date: 12 January 2026',
'',
'---',
'',
'#### 🌅 Morning & Night Greetings',
'',
'#1 - Message: [12 January 2026, 08:15 AM] - Deep: "Good morning! Did you sleep well?"',
'  What I felt: Felt so happy seeing her message first thing.',
'#2 - Message: [12 January 2026, 08:20 AM] - 🍯🫰🫶🏻 Chota Don❣️❤️😘: "Yes, had a crazy dream about us!"',
'  What I felt: Curious and excited to hear the dream.',
'',
'#### 💬 Daily Life & Important Updates',
'#3 - Message: [12 January 2026, 01:05 PM] - Deep: "Office was busy, but thinking of you helped."',
'  What I felt: Wanted her to know she is my calm in the chaos.',
'',
'#### 💖 Sweet Compliments & Love',
'#4 - Message: [12 January 2026, 09:40 PM] - 🍯🫰🫶🏻 Chota Don❣️❤️😘: "You always make me feel special."',
'  What I felt: My heart melted — that\'s all I ever want to do.',
'',
'#### 💭 My Messages To Her (No Reply Yet)',
'1. - Message: [13 January 2026, 09:00 AM] - Deep: "Hey, you didn\'t reply last night."',
'- Note: She hasn\'t replied to this message yet.',
'  What I felt: Waiting with my phone in hand — longing and a little worry.',
'',
'#### 💌 Her Messages To Me',
'(6) - Message: [13 January 2026, 10:30 AM] - 🍯🫰🫶🏻 Chota Don❣️❤️😘: "Sorry jaan, was stuck in work!"',
'  What I felt: Even an apology from her feels like a hug.',
'',
'---',
'',
'### 📌 FINAL SUMMARY - COMPLETE DIARY',
'A normal day that became precious because she was in it.',
'',
'========================================'
].join('\n');

const p = fnParse(tpl);
console.log('parsed messages:', p.msgs.length);
p.msgs.forEach(m => console.log(' no=' + m.no, m.sender, '|', JSON.stringify(m.content).slice(0,50)));
if (p.msgs.length !== 6) throw new Error('expected 6 entries counted');
p.msgs.forEach((m, i) => { if (m.no !== i + 1) throw new Error('entry numbering broken at ' + i); });

// numbers must be stripped from stored content
p.msgs.forEach(m => {
  if (/#?\d+\s*-\s*Message/i.test(m.content) || /^\d/.test(m.content)) throw new Error('number leaked into content: ' + m.content);
});

// body building exactly as doImport does
const bodies = p.msgs.map(m => {
  let body = m.sender + ': "' + m.content + '"';
  if (m.felt) body += '\nWhat I felt: ' + m.felt;
  if (m.note) body += '\nNote: ' + m.note;
  return body;
});
bodies.forEach((b,i) => {
  const w = fnCount(b);
  // manual expected count: sender-name words + msg words + felt words (labels excluded)
  console.log('entry', i+1, 'words=', w, JSON.stringify(b.split('\n')[0]).slice(0,60));
  if (w <= 0) throw new Error('zero words for entry ' + (i+1));
});

// label words / dates / entry numbers must NOT be counted — only the real
// message + feeling words.
const b1 = 'Deep: "hello there"';
const b2 = 'Deep: "hello there"\nWhat I felt: great\nNote: none';
const w1 = fnCount(b1), w2 = fnCount(b2);
if (w1 !== 2) throw new Error('msg words wrong: ' + w1 + ' (expected 2: hello there)');
if (w2 !== w1 + 1 + 1) throw new Error('felt/note label words counted: ' + w2);

// the template line and the stored body of the SAME entry must count equally:
// entry number "#7", the date "[12 January 2026, 08:15 AM]", the labels
// "Message:" / "What I felt:" and the quotes are all excluded on both sides.
const tplLine = '#7 - Message: [12 January 2026, 08:15 AM] - Deep: "Good morning! Did you sleep well?"\nWhat I felt: Felt so happy seeing her message first thing.';
const storedBody = 'Deep: "Good morning! Did you sleep well?"\nWhat I felt: Felt so happy seeing her message first thing.';
if (fnCount(tplLine) !== fnCount(storedBody)) throw new Error('template line vs stored body mismatch: ' + fnCount(tplLine) + ' vs ' + fnCount(storedBody));
if (fnCount('#7 - Message: [12 January 2026, 08:15 AM] - Deep: "hi"') !== fnCount('Deep: "hi"')) throw new Error('number/date/label affected count');

console.log('ALL ENTRY-NUMBER / WORD-COUNT TESTS PASSED ✓');
