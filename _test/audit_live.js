// AUDIT against the LIVE script.js functions (extracted verbatim).
// Reproduces the exact user-reported legacy body of the FIRST imported entry
// and checks every render path for leaked HTML code.
const M = require('./body_fns_live.js');
const CN = M.CHOTA_NAME;

const LEGACY_BODY =
  "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp; Future Plans</div>" +
  "&quot;btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar \u{1F979}&quot;" +
  '<span class="eb-extra"><span class="eb-label">\u{1F4AD} How I felt: </span>She was genuinely worried about our plan and my finances \u2014 that anxiety in her words showed how much she cares about our future together.</span>';

let fails = 0;
const bad = (msg) => { fails++; console.log('FAIL:', msg); };
const ok  = (msg) => console.log('ok  :', msg);

// ---------- Path A: cloud load normalisation (loadEntriesFromCloud line ~121)
const norm1 = M.normaliseStoredBody(LEGACY_BODY, CN);
console.log('\n--- normalised (pass 1) ---\n' + norm1);
if (/<[a-z\/]|&quot;|&#0?39;|&apos;|&nbsp;|&lt;|&gt;|&amp;/i.test(norm1)) bad('normalise pass1 leaks markup/entities');
else ok('normalise pass1 clean');
const norm2 = M.normaliseStoredBody(norm1, CN);
if (norm2 !== norm1) bad('normalise NOT idempotent:\n' + norm2);
else ok('normalise idempotent');
const norm3 = M.normaliseStoredBody(norm2, CN);
if (norm3 !== norm2) bad('normalise NOT idempotent on 3rd pass');
else ok('normalise idempotent (3rd pass)');

// ---------- Path B: entry-card preview (renderEntries lines ~494-506)
function cardPreview(body, sender) {
  const previewBodyRaw = M.normaliseStoredBody(body, sender);
  let cleanPreview = String(previewBodyRaw || "")
    .replace(/<div\b[^>]*eb-heading-band[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<span\b[^>]*eb-extra[^>]*>\s*<span\b[^>]*eb-label[^>]*>([\s\S]*?)<\/span>/gi, "\n$1 ")
    .replace(/<\/?(?:div|span|p|strong|em|i|b)\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");
  for (let g = 0; g < 4 && /&(?:quot|#0?39|apos|nbsp|lt|gt|amp);/.test(cleanPreview); g++) {
    const b4 = cleanPreview; cleanPreview = M.decodeHtmlEntitiesLite(cleanPreview); if (cleanPreview === b4) break;
  }
  return M.trimEntryLines(cleanPreview).join("\n");
}
const cardTxt = cardPreview(LEGACY_BODY, CN);
console.log('\n--- CARD PREVIEW text ---\n' + cardTxt);
if (/<[a-z\/]/i.test(cardTxt)) bad('card preview shows HTML tags as code');
else ok('card preview: no tags');
if (/&quot;|&#0?39;|&apos;|&nbsp;|&lt;|&gt;|&amp;/.test(cardTxt)) bad('card preview shows entities as code');
else ok('card preview: no entities');
if (!cardTxt.includes('btw teh aa msg karyo')) bad('card preview lost the message');
else ok('card preview keeps message');
if (!cardTxt.includes('genuinely worried')) bad('card preview lost the felt note');
else ok('card preview keeps felt note');

// ---------- Path C: booklet bubble (formatBookBodyHtml) — run through the
// ALREADY-normalised cache value too (that is what the book renders).
function stripTagsForText(html) {
  // simulate innerText of the rendered bubble: decode entities, drop tags
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(?:div|span|p|strong|em|i|b)\b[^>]*>/gi, "")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}
for (const [label, src] of [['raw legacy body', LEGACY_BODY], ['cached normalised body', norm1]]) {
  const html = M.formatBookBodyHtml(src, CN);
  const txt = stripTagsForText(html);
  console.log('\n--- BUBBLE (' + label + ') ---\n' + html);
  // The only markup ALLOWED in the bubble html are OUR OWN re-added spans.
  const leftovers = txt.replace(/\s+/g, ' ');
  if (/<[a-z\/]/i.test(leftovers)) bad('bubble (' + label + ') shows raw tags as code: ' + leftovers.slice(0, 120));
  else ok('bubble (' + label + '): no raw tags in visible text');
  if (/&quot;|&#0?39;|&nbsp;|&lt;|&gt;|&amp;(?!;)/.test(leftovers)) bad('bubble (' + label + ') shows entities as code');
  else ok('bubble (' + label + '): no entity code');
  if (leftovers.includes('eb-heading-band') || leftovers.includes('class=')) bad('bubble (' + label + ') shows attribute junk');
  else ok('bubble (' + label + '): no attribute junk');
  if (!leftovers.includes('btw teh aa msg karyo')) bad('bubble (' + label + ') lost message');
  else ok('bubble (' + label + '): message present');
  if (!leftovers.includes('How I felt')) bad('bubble (' + label + ') lost felt section');
  else ok('bubble (' + label + '): felt section present');
  // leading wrapping quote must be gone (the "code dump" look)
  const firstLine = leftovers.trim();
  if (/^"/.test(firstLine)) bad('bubble (' + label + ') starts with a stray quote (code-dump look)');
  else ok('bubble (' + label + '): no stray leading quote');
}

// ---------- Path D: canonical clean entries stay untouched (regression)
const CLEAN = 'Deep: "good morning jaan \u2600\uFE0F"\nWhat I felt: always happy to see your message first thing.';
if (M.normaliseStoredBody(CLEAN, 'Deep') !== CLEAN) bad('canonical clean body was rewritten');
else ok('canonical clean body untouched');
const cleanHtml = M.formatBookBodyHtml(CLEAN, 'Deep');
if (!cleanHtml.includes('good morning jaan')) bad('clean body lost message');
else ok('clean body renders normally');

// ---------- Path E: double-encoded legacy variant
const DBL = LEGACY_BODY.replace(/&quot;/g, '&amp;quot;').replace(/&amp;amp;/g, '&amp;amp;');
const dblNorm = M.normaliseStoredBody(DBL, CN);
if (/<[a-z\/]|&quot;|&amp;/i.test(dblNorm)) bad('double-encoded legacy leaks: ' + dblNorm.slice(0, 140));
else ok('double-encoded legacy fully cleaned');

console.log('\n' + (fails ? 'AUDIT FAILED: ' + fails : 'AUDIT PASSED'));
process.exit(fails ? 1 : 0);
