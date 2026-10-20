const M = require('./body_fns.js');
const CN = M.CHOTA_NAME;
const legacyBody =
  "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp; Future Plans</div>" +
  "&quot;" + CN + "&quot;: &quot;btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar \u{1F979}&quot;" +
  '<span class="eb-extra"><span class="eb-label">\u{1F4AD} How I felt: </span>She was genuinely worried about our plan and my finances \u2014 that anxiety in her words showed how much she cares about our future together.</span>';

console.log('=== normaliseStoredBody (1st pass) ===');
const norm = M.normaliseStoredBody(legacyBody, CN);
console.log(norm);
console.log('\n=== 2nd pass (idempotency) ===');
const norm2 = M.normaliseStoredBody(norm, CN);
console.log(norm2);
console.log('IDEMPOTENT:', norm === norm2);
console.log('\n=== 3rd pass ===');
const norm3 = M.normaliseStoredBody(norm2, CN);
console.log('STILL IDEMPOTENT:', norm2 === norm3);

// Card preview path (renderEntries lines ~494-506)
function cardPreview(body, sender){
  const previewBodyRaw = M.normaliseStoredBody(body, sender);
  let cleanPreview = String(previewBodyRaw || "")
    .replace(/<div\b[^>]*eb-heading-band[^>]*>[\s\S]*?<\/div>/gi, "")
    .replace(/<span\b[^>]*eb-extra[^>]*>\s*<span\b[^>]*eb-label[^>]*>([\s\S]*?)<\/span>/gi, "\n$1 ")
    .replace(/<\/?(?:div|span|p|strong|em|i|b)\b[^>]*>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n");
  for (let g = 0; g < 4 && /&(?:quot|#0?39|apos|nbsp|lt|gt|amp);/.test(cleanPreview); g++) {
    const before = cleanPreview;
    cleanPreview = cleanPreview.replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&apos;/g,"'")
      .replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
    if (cleanPreview === before) break;
  }
  return M.stripSenderPrefix ? cleanPreview : cleanPreview;
}
console.log('\n=== CARD PREVIEW text ===');
console.log(cardPreview(legacyBody, CN));

console.log('\n=== BUBBLE HTML ===');
const html = M.formatBookBodyHtml(legacyBody, CN);
console.log(html);
