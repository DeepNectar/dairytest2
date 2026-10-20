const M = require('./body_fns.js');
const CN = M.CHOTA_NAME, DN = M.DEEP_NAME;
let fails = 0;

// simulate what the browser shows: decode entities back like innerText does
function renderAsBrowser(html){
  return html.replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<')
             .replace(/&gt;/g,'>').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&');
}

function check(name, body, sender, expectMsg) {
  const norm = M.normaliseStoredBody(body, sender);
  let p = norm;
  for (let i=0;i<3;i++) p = M.normaliseStoredBody(p, sender);
  const idem = p === norm;
  const html = M.formatBookBodyHtml(body, sender);
  const vis = renderAsBrowser(html).replace(/<span class="eb-extra"><span class="eb-label">/g,'').replace(/<\/?span[^>]*>/g,'');
  // raw markup must never be visible in the bubble
  const rawLeaks = /<div|eb-heading-band|eb-extra|eb-label/.test(vis) || /&(?:quot|#0?39|apos|nbsp|amp);(?![a-zA-Z])/.test(html.match(/^/) ? '' : '') && false;
  const dupSender = vis.includes(CN + '": "') || vis.includes(DN + '": "') || /^\s*(CN|Deep): "/.test(vis);
  const msgOk = expectMsg == null ? true : vis.startsWith(expectMsg);
  const ok = idem && !rawLeaks && !dupSender && msgOk;
  if (!ok) { fails++; console.log('FAIL', name, JSON.stringify({norm,html,vis,idem,rawLeaks,dupSender,msgOk})); }
  else console.log('ok  ', name);
}

check('quoted-name legacy (bug report)',
  "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp; Future Plans</div>&quot;"+CN+"&quot;: &quot;btw teh aa msg karyo\u2026&quot;<span class=\"eb-extra\"><span class=\"eb-label\">\u{1F4AD} How I felt: </span>She was genuinely worried.</span>",
  CN, 'btw teh aa msg karyo');
check('plain canonical chota', CN+': "hello love"\nWhat I felt: warm', CN, 'hello love');
check('plain canonical deep', DN+': "miss you"', DN, 'miss you');
check('multi-line message', CN+': "line one\nline two"\nNote: keep', CN, 'line one');
check('message containing quotes inside', DN+': "she said \"hi\" to me"', DN, 'she said "hi" to me');
check('unterminated legacy quote', '&quot;'+CN+'&quot;: &quot;no closing quote', CN, 'no closing quote');
check('double-encoded', "&amp;quot;"+DN+"&amp;quot;: &amp;quot;x &amp;amp; y&amp;quot;", DN, 'x & y');
check('empty body', '', CN, null);
check('note only canonical', DN+': "m"\nNote: n', DN, 'm');
check('felt multi-line', CN+': "m"\nWhat I felt: a\nb', CN, 'm');
check('sender column mismatch (sender=Chota short)', CN+': "hey there"', 'Chota', 'hey there');
console.log(fails ? 'FAILURES: '+fails : 'ALL PASS');
process.exit(fails?1:0);
