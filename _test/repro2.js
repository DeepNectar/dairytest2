const M = require('./body_fns.js');
const CN = M.CHOTA_NAME;

function cardPreview(body, sender){
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

const MSG = "btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar \u{1F979}";
const FELT = "She was genuinely worried about our plan and my finances \u2014 that anxiety in her words showed how much she cares about our future together.";

const variants = {
  'A: quoted-name + quoted-msg':
    "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp; Future Plans</div>" +
    "&quot;" + CN + "&quot;: &quot;" + MSG + "&quot;" +
    '<span class="eb-extra"><span class="eb-label">\u{1F4AD} How I felt: </span>' + FELT + '</span>',
  'B: unquoted name, quoted msg':
    "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp; Future Plans</div>" +
    CN + ": &quot;" + MSG + "&quot;" +
    '<span class="eb-extra"><span class="eb-label">\u{1F4AD} How I felt: </span>' + FELT + '</span>',
  'C: plain canonical already':
    CN + ': "' + MSG + '"\nWhat I felt: ' + FELT,
  'D: double-encoded entities':
    "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp;amp; Future Plans</div>" +
    "&amp;quot;" + CN + "&amp;quot;: &amp;quot;" + MSG + "&amp;quot;",
};

for (const [k, body] of Object.entries(variants)) {
  console.log('==================== ' + k);
  const norm = M.normaliseStoredBody(body, CN);
  console.log('-- normalise x1:', JSON.stringify(norm));
  console.log('-- normalise x2 same?', M.normaliseStoredBody(norm, CN) === norm);
  console.log('-- CARD PREVIEW:', JSON.stringify(cardPreview(body, CN)));
  const bad = /&quot;|&#39;|&amp;|<div|<span|eb-/.test(cardPreview(body, CN));
  console.log('-- CARD HAS RAW CODE?', bad);
  const html = M.formatBookBodyHtml(body, CN);
  const visible = html.replace(/<span class="eb-extra"><span class="eb-label">/g,'').replace(/<\/span>/g,'');
  const badBubble = /eb-heading-band|&quot;&quot;|<div /.test(html) || /&quot;/.test(visible);
  console.log('-- BUBBLE HTML:', JSON.stringify(html));
  console.log('-- BUBBLE BROKEN?', badBubble);
}
