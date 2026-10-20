// Reproduce the "raw HTML code" leak with the EXACT live functions from script.js
const fs = require('fs');
const DEEP_NAME = "Deep";
const CHOTA_NAME = "🫰🫶🏻Chota Don❣️❤️😘";
const normSender = (s) => String(s == null ? "" : s).normalize("NFC").replace(/[\uFE0E\uFE0F]/g, "").toLowerCase().trim();

const code = fs.readFileSync('_test/live_fns.js','utf8');
eval(code);

const esc = escapeHtml;

// The legacy body exactly as reported by the user (baked-in markup + entities)
const legacyBody =
  "<div class='eb-heading-band'>📂 🎯 Dreams &amp; Future Plans</div>" +
  "&quot;btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar 🥹&quot;" +
  "<span class=\"eb-extra\"><span class=\"eb-label\">💭 How I felt: </span>She was genuinely worried about our plan and my finances — that anxiety in her words showed how much she cares about our future together.</span>";

console.log("=== normaliseStoredBody(legacy) ===");
console.log(JSON.stringify(normaliseStoredBody(legacyBody, CHOTA_NAME)));
console.log("=== formatBookBodyHtml(legacy) [what goes into bubble innerHTML] ===");
const html1 = formatBookBodyHtml(legacyBody, CHOTA_NAME);
console.log(html1);
console.log("leak tags?", /<(?!\/?(?:span|br|div)[ >])/i.test(html1), "| leak entities?", /&(?:[a-z]+|#\d+);/i.test(html1.replace(/&(?:quot|#0?39|amp|lt|gt);/gi,'')) );

console.log("\n=== render card preview path (escapeHtml applied twice?) ===");
const previewBodyRaw = normaliseStoredBody(legacyBody, CHOTA_NAME);
let cleanPreview = stripSenderPrefix(formatBookBodyHtml(previewBodyRaw, CHOTA_NAME), CHOTA_NAME);
console.log("cleanPreview =", JSON.stringify(cleanPreview));
const cardP = '<p class="body">' + esc(cleanPreview) + '</p>';
console.log(cardP.slice(0,400));

console.log("\n=== double-normalise (canonical fed back through) ===");
const canon = normaliseStoredBody(legacyBody, CHOTA_NAME);
const again = normaliseStoredBody(canon, CHOTA_NAME);
console.log("stable?", again === canon, JSON.stringify(again).slice(0,200));

console.log("\n=== fully HTML-ESCAPED legacy row ===");
const escapedRow = esc(legacyBody);
console.log(formatBookBodyHtml(escapedRow, CHOTA_NAME).slice(0,300));

console.log("\n=== canonical multi-line entry fed through ===");
const canonEntry = '🫰🫶🏻Chota Don❣️❤️😘: "line one\nline two"\nWhat I felt: nice';
const outC = formatBookBodyHtml(canonEntry, CHOTA_NAME);
console.log(outC);
console.log("sender prefix inside bubble?", /Chota Don[^"<]*:/.test(outC.replace(/<[^>]*>/g,'')));
