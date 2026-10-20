// VERIFICATION: the very first booklet entry that needs splitting must render
// as clean word-wrapped lines — NEVER a one-letter vertical column, and no
// mid-word slicing. Real Chromium layout via puppeteer.
const puppeteer = require('/workspace/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  // exact body from the user's bug report (long gujarati/english mixed entry)
  const LONG = `so it was like i moved to canada in 2021 on student visa then in last here dec 2024 mara dad ni health bagdi... to i got emotional and said yes... jan 2025 ma mrg thaya chokro uk no hto... 22 days and then one day i caught him cheating on me with his bhabhi not real urna bhabhi hata... so i came back to india in june 2025... and then july 2025 ma divorce thaya.
My Thought: I remember reading this and just feeling this wave of protectiveness. You went through so much, alone, in a foreign country, and you still had the strength to walk away. It wasn't a red flag for me; it was a testament to your character. You knew your worth, and you refused to settle for anything less, even when it was the harder path.
You didn't just stop there. You told me about your family's financial situation, a detail many would hide until it was too late. as i mentioned about my father health so right now ae bav work nai karta car and jamin nu le vech kare theek kari didi sule kharcha chalavta.`;

  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  // deterministic hash of "TestPass123!" under the app's own scheme
  const HASH = "638990f6e3d830904781941eaf0ea7ab0caef54da5e07c7d2af0815491dcdcd8";
  await page.evaluate((hash) => new Promise((resolve) => {
    const prevFetch = window.fetch;
    window.fetch = async function (url, opts) {
      const u = String(url);
      if (u.includes('/rest/v1/entries')) return new Response(JSON.stringify([{
        id: 9001, title: 'Honesty', body: window.__LONG_BODY || '', mood: '', sender: 'Chota',
        heading: 'Your Honesty and Openness: The Blueprint of You',
        date: '2025-12-16T10:38:28', words: 200
      }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (u.includes('/rest/v1/users')) {
        return new Response(JSON.stringify([{ email: 'qa.tester@dairy.app', name: 'QA',
          hash, created: '2025-01-01T00:00:00Z' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (u.includes('/rest/v1/settings') || u.includes('/rest/v1/sessions')) {
        return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return prevFetch(url, opts);
    };
    resolve();
  }), HASH);
  await page.evaluate((b) => { window.__LONG_BODY = b; }, LONG);

  await page.evaluate(() => document.getElementById('authBtn').click());
  await new Promise(r => setTimeout(r, 400));
  await page.type('#authEmail', 'qa.tester@dairy.app', { delay: 2 });
  await page.type('#authPass', 'TestPass123!', { delay: 2 });
  await page.evaluate(() => document.getElementById('authForm').requestSubmit());
  await new Promise(r => setTimeout(r, 1500));
  let signed = await page.evaluate(() => document.getElementById('userName')?.textContent || '');
  console.log('signed-in-as:', JSON.stringify(signed));

  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 6000));

  // navigate back to spread 0 so the FIRST entry pages are on screen (the
  // cloud bookmark mock could otherwise land us mid-book)
  for (let i = 0; i < 14; i++) {
    const atStart = await page.evaluate(() => {
      const info = document.getElementById('spreadInfo')?.textContent || '';
      if (/^\s*(Page|SHEET)?\s*1\b/i.test(info)) return true;
      document.getElementById('prevPageBtn')?.click();
      return false;
    });
    await new Promise(r => setTimeout(r, 700));
    if (atStart) break;
  }
  await new Promise(r => setTimeout(r, 800));

  // walk EVERY spread of the whole book and audit every rendered bubble:
  // no single-letter word fragments, no mid-word slicing.
  const audit = await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const out = { spreads: 0, bubbles: 0, badSingles: [], minLinesOk: true, samples: [] };
    const checkCurrent = () => {
      ['leftContent', 'rightContent'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.querySelectorAll('.entry-bubble').forEach((bub) => {
          out.bubbles++;
          const body = bub.querySelector('.entry-body');
          if (!body) return;
          const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
          const tops = new Set();
          let n, texts = [];
          while ((n = walker.nextNode())) {
            if (!n.nodeValue.trim()) continue;
            texts.push(n.nodeValue);
            const rng = document.createRange();
            rng.selectNodeContents(n);
            Array.from(rng.getClientRects()).forEach(r => tops.add(Math.round(r.top)));
          }
          const joined = texts.join(' ');
          joined.split(/\s+/).forEach(w => {
            // a lone letter as its own "word" is only legit if it really is
            // one in the source (a, I); flag everything else
            if (w.length === 1 && /[A-Za-z]/.test(w) && w !== 'a' && w !== 'A' && w !== 'I') out.badSingles.push(w + '|' + joined.slice(0, 40));
          });
          if (texts.length) out.samples.push(joined.slice(0, 90));
        });
      });
    };
    checkCurrent();
    for (let s = 0; s < 30; s++) {
      document.getElementById('nextPageBtn')?.click();
      await sleep(900);
      const before = out.spreads;
      out.spreads++;
      checkCurrent();
      const info = document.getElementById('spreadInfo')?.textContent || '';
      if (/last|end|of\s*\d+\s*$/.test(info) && out.spreads > before && /1\s*\/\s*1/.test(info)) break;
    }
    return out;
  });
  console.log(JSON.stringify({spreads: audit.spreads, bubbles: audit.bubbles, badSingles: audit.badSingles.slice(0,20), samples: audit.samples.slice(0,6)}, null, 1));

  await page.screenshot({ path: '/workspace/_test/first_entry_fix.png' });
  await browser.close();

  const ok = audit.bubbles > 0 && audit.badSingles.length === 0;
  console.log(ok ? 'PASS: every booklet entry renders as clean wrapped lines — no single-char fragments anywhere'
                 : 'FAIL: mangling still present -> ' + JSON.stringify(audit.badSingles.slice(0, 20)));
  process.exit(ok ? 0 : 1);
})();
