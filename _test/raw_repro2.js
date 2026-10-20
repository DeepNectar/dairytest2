const fs = require('fs');
eval(fs.readFileSync('_test/live_fns.js','utf8'));

const esc = escapeHtml;
let fails = 0;
function check(name, renderedText) {
  // renderedText = what the user would literally SEE after innerHTML+escape
  const bad = /<[a-zA-Z/!]|&(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,7}|#x[0-9a-fA-F]{1,6});|&quot;|&#39;/.test(renderedText);
  console.log((bad ? 'FAIL' : 'PASS') + ' | ' + name);
  if (bad) { fails++; console.log('   leaked: ' + JSON.stringify(renderedText.slice(0,220))); }
}

// simulate card render: cleanPreview -> escapeHtml -> strip our own tags? No: card escapes everything.
function cardRender(body, sender) {
  const previewBodyRaw = normaliseStoredBody(body, sender);
  let cleanPreview = stripSenderPrefix(formatBookBodyHtml(previewBodyRaw, sender), sender);
  cleanPreview = finalScrub(cleanPreview).replace(/<br\s*\/?>/gi, "\n");
  return esc(cleanPreview); // this is what lands in <p class="body">
}
// simulate bubble render: htmlBody goes into innerHTML; visible text = decode entities & drop real tags
function bubbleVisible(body, sender) {
  const html = formatBookBodyHtml(body, sender);
  // browser-visible text of that HTML:
  return html.replace(/<[^>]*>/g, '\u0001').replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}

const legacy = "<div class='eb-heading-band'>📂 🎯 Dreams &amp; Future Plans</div>&quot;btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar 🥹&quot;<span class=\"eb-extra\"><span class=\"eb-label\">💭 How I felt: </span>She was genuinely worried about our plan and my finances — that anxiety in her words showed how much she cares about our future together.</span>";

check("card / legacy exact report", cardRender(legacy, CHOTA_NAME));
check("bubble / legacy exact report", bubbleVisible(legacy, CHOTA_NAME));
check("card / fully-escaped legacy", cardRender(esc(legacy), CHOTA_NAME));
check("bubble / fully-escaped legacy", bubbleVisible(esc(legacy), CHOTA_NAME));
check("card / double-escaped legacy", cardRender(esc(esc(legacy)), CHOTA_NAME));
check("bubble / double-escaped legacy", bubbleVisible(esc(esc(legacy)), CHOTA_NAME));

const canon = 'Deep: "Good morning 🌞 Radhe radhe 🙏🙏"\nWhat I felt: Waking up and sending her the first message of the day has become my favorite ritual.';
check("card / canonical", cardRender(canon, 'Deep'));
check("bubble / canonical", bubbleVisible(canon, 'Deep'));

const withQuotes = 'Deep: "Today you said \\"I trust you\\" and my heart skipped three beats."';
check("card / embedded quotes", cardRender(withQuotes, 'Deep'));
check("bubble / embedded quotes", bubbleVisible(withQuotes, 'Deep'));

const summary = "📌 FINAL SUMMARY\nTotal messages: 400\nNotes: <b>bold</b> test & more";
check("card / summary row", cardRender(summary, 'Deep'));
check("bubble / summary row", bubbleVisible(summary, 'Deep'));

// storage-side scrub used by loadEntriesFromCloud
const stored = finalScrub(normaliseStoredBody(legacy, CHOTA_NAME));
check("stored body (feeds every renderer)", esc(stored));
console.log("stored sample:", JSON.stringify(stored.slice(0,160)));

process.exit(fails ? 1 : 0);
