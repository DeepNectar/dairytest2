// DIAGNOSTIC: on every booklet page, compare the FIRST bubble's rendered
// geometry (head height, gap from top edge, badge) with its siblings.
const puppeteer = require('/workspace/node_modules/puppeteer');
const EXE = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';

(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('authBtn').click());
  await new Promise(r => setTimeout(r, 600));
  await page.type('#authEmail', 'qa.tester@dairy.app', { delay: 2 });
  await page.type('#authPass', 'TestPass123!', { delay: 2 });
  await page.evaluate(() => document.getElementById('authForm').requestSubmit());
  await new Promise(r => setTimeout(r, 3500));

  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 8000));

  const totalSpreads = await page.evaluate(() => {
    const m = document.getElementById('spreadInfo').textContent.match(/\/\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  });
  console.log('totalSpreads:', totalSpreads);

  for (let s = 0; s < Math.min(totalSpreads, 10); s++) {
    const info = await page.evaluate(() => {
      const out = [];
      [document.getElementById('leftContent'), document.getElementById('rightContent')].forEach(el => {
        if (!el || !el.innerHTML.trim()) return;
        const flow = el.querySelector('.page-flow');
        if (!flow) return;
        const kids = Array.from(flow.children).filter(n => n.classList && (n.classList.contains('entry-bubble') || n.classList.contains('cover-bubble')));
        if (!kids.length) return;
        const fRect = flow.getBoundingClientRect();
        kids.forEach((k, i) => {
          const head = k.querySelector(':scope > .eb-head');
          const band = k.querySelector(':scope > .eb-heading-band');
          const body = k.querySelector(':scope > .entry-body');
          const no = k.querySelector(':scope > .eb-head .eb-no');
          const kr = k.getBoundingClientRect();
          const hr = head ? head.getBoundingClientRect() : null;
          out.push({
            idx: i, cls: (k.className||'').slice(0,30),
            gapTop: +(kr.top - (i === 0 ? fRect.top : kids[i-1].getBoundingClientRect().bottom)).toFixed(1),
            headH: hr ? +hr.height.toFixed(1) : null,
            bandH: band ? +band.getBoundingClientRect().height.toFixed(1) : null,
            bodyH: body ? +body.getBoundingClientRect().height.toFixed(1) : null,
            bubbleH: +kr.height.toFixed(1),
            hasNo: !!no, noTxt: no ? no.textContent : null,
            ellipsed: hr ? (hr.scrollWidth > hr.clientWidth + 1) : null
          });
        });
      });
      return out;
    });
    // summarize: first vs rest
    const sum = await page.evaluate((rows) => {
      const byPage = {};
      rows.forEach(r => { (byPage[r.idx===0?'first':'rest'] = byPage[r.idx===0?'first':'rest']||[]).push(r); });
      const agg = (arr) => ({
        n: arr.length,
        headH: [...new Set(arr.map(x=>x.headH))],
        bandH: [...new Set(arr.filter(x=>x.bandH!=null).map(x=>x.bandH))],
        gap0: [...new Set(arr.filter(x=>x.idx===0).map(x=>x.gapTop))],
        hasNo: [...new Set(arr.map(x=>x.hasNo))],
        nos: arr.slice(0,6).map(x=>x.noTxt)
      });
      return { first: byPage.first?agg(byPage.first):null, rest: byPage.rest?agg(byPage.rest):null };
    }, info);
    console.log('SPREAD', s, JSON.stringify(sum));
    await page.evaluate(() => document.getElementById('nextPageBtn').click());
    await new Promise(r => setTimeout(r, 900));
  }
  await browser.close();
})();
