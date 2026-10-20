// E2E: the FIRST entry loaded from Supabase in LEGACY baked-HTML shape must
// render as a clean formatted bubble — never raw code (&quot;, <div>, spans) —
// in the booklet preview. Real Chromium via puppeteer, mocked cloud rows.
const puppeteer = require('/workspace/node_modules/puppeteer');

const SENDER = "🫰🫶🏻Chota Don❣️❤️😘";
const LEGACY_BODY = "<div class='eb-heading-band'>\u{1F4C2} \u{1F3AF} Dreams &amp; Future Plans</div>&quot;btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar \u{1F979}&quot;<span class=\"eb-extra\"><span class=\"eb-label\">\u{1F4AD} How I felt: </span>She was genuinely worried about our plan and my finances \u2014 that anxiety in her words showed how much she cares about our future together.</span>";
const CLEAN_BODY = 'Deep: "good morning jaan ☀️"\nWhat I felt: always happy to see your message first thing.';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  let pageErr = null;
  page.on('pageerror', e => { pageErr = e.message; console.log('PAGEERROR:', e.message); });

  const HASH = "638990f6e3d830904781941eaf0ea7ab0caef54da5e07c7d2af0815491dcdcd8"; // TestPass123!
  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate((legacyBody, cleanBody, sender) => {
    const prevFetch = window.fetch;
    const rows = [
      { id: 9001, title: 'Message from Chota Don', body: legacyBody, mood: '💬', sender: sender,
        heading: '\u{1F3AF} Dreams & Future Plans', date: '2026-01-02T02:01:31Z', words: 40 },
      { id: 9002, title: 'Message from Deep', body: cleanBody, mood: '💌', sender: 'Deep',
        heading: '\u{1F305} Morning & Night Greetings', date: '2026-01-02T02:02:31Z', words: 12 },
    ];
    window.fetch = async function (url, opts) {
      const u = String(url);
      if (u.includes('/rest/v1/entries')) return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (u.includes('/rest/v1/users')) return new Response(JSON.stringify([{ email: 'qa.tester@dairy.app', name: 'QA', hash: window.__HASH || '', created: '2025-01-01T00:00:00Z' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      if (u.includes('/rest/v1/settings') || u.includes('/rest/v1/sessions')) return new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } });
      return prevFetch(url, opts);
    };
    window.__HASH = '';
    void sender;
  }, LEGACY_BODY, CLEAN_BODY, SENDER);

  // sign in (hash check happens client-side against the users row we serve)
  await page.evaluate((h) => { window.__H = h; }, HASH);
  await page.evaluate((h) => {
    // patch served hash by re-wrapping fetch (users rows need matching hash)
    const pf = window.fetch;
    window.fetch = async function (url, opts) {
      const u = String(url);
      if (u.includes('/rest/v1/users')) return new Response(JSON.stringify([{ email: 'qa.tester@dairy.app', name: 'QA', hash: window.__H, created: '2025-01-01T00:00:00Z' }]), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return pf(url, opts);
    };
  }, HASH);

  await page.evaluate(() => document.getElementById('authBtn').click());
  await new Promise(r => setTimeout(r, 300));
  await page.type('#authEmail', 'qa.tester@dairy.app', { delay: 1 });
  await page.type('#authPass', 'TestPass123!', { delay: 1 });
  await page.evaluate(() => document.getElementById('authForm').requestSubmit());
  await new Promise(r => setTimeout(r, 1200));

  // --- 1) entries list cards: no raw markup anywhere ---
  const cardAudit = await page.evaluate(() => {
    const txt = document.getElementById('entriesList').innerText;
    return {
      hasEntity: /&quot;|&#39;|&amp;/.test(txt),
      hasTag: /<div|<span|class=/.test(txt),
      hasMsg: txt.includes('btw teh aa msg karyo'),
      hasFelt: txt.includes('What I felt') || txt.includes('genuinely worried'),
    };
  });
  console.log('CARDS:', JSON.stringify(cardAudit));

  // --- 2) booklet preview bubbles ---
  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 6000));

  const bookAudit = await page.evaluate(() => {
    const out = { bubbles: 0, leaks: [], sample: '' };
    ['leftContent', 'rightContent'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.querySelectorAll('.entry-bubble').forEach((bub) => {
        out.bubbles++;
        const t = bub.innerText;
        if (/&quot;|&#39;|&lt;|<div|<span|class=|eb-heading-band|eb-extra/.test(t)) out.leaks.push(t.slice(0, 120));
        if (t.includes('btw teh aa msg karyo')) out.sample = t.slice(0, 300);
      });
    });
    return out;
  });
  console.log('BOOK:', JSON.stringify(bookAudit, null, 2));
  // walk all spreads for leaks
  let totalLeaks = bookAudit.leaks.length;
  for (let i = 0; i < 6; i++) {
    await page.evaluate(() => document.getElementById('nextPageBtn')?.click());
    await new Promise(r => setTimeout(r, 500));
    const more = await page.evaluate(() => {
      let leaks = 0, found = false;
      ['leftContent', 'rightContent'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.querySelectorAll('.entry-bubble').forEach((bub) => {
          const t = bub.innerText;
          if (/&quot;|<div|<span|eb-extra|eb-heading-band/.test(t)) leaks++;
          if (t.includes('btw teh aa msg karyo')) found = true;
        });
      });
      return { leaks, found };
    });
    totalLeaks += more.leaks;
    if (more.found && !bookAudit.sample) bookAudit.sample = 'found-later';
  }
  console.log('TOTAL LEAKS ACROSS SPREADS:', totalLeaks);
  console.log('SAMPLE RENDER:', JSON.stringify(bookAudit.sample));
  const pass = !cardAudit.hasEntity && !cardAudit.hasTag && cardAudit.hasMsg && cardAudit.hasFelt &&
                totalLeaks === 0 && bookAudit.bubbles >= 1 && bookAudit.sample.includes('btw teh aa msg karyo') &&
                !pageErr;
  console.log(pass ? 'E2E PASS ✅' : 'E2E FAIL ❌');
  await page.screenshot({ path: '/workspace/_test/first_entry_legacy.png' });
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
