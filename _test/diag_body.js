// Dump the actual bubble HTML of every page to find why the FIRST entry looks broken
const puppeteer = require('/workspace/node_modules/puppeteer');
const EXE = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, args: ['--no-sandbox','--disable-setuid-sandbox'] });
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
  for (let s = 0; s < 8; s++) {
    const info = await page.evaluate(() => {
      const out = [];
      [document.getElementById('leftContent'), document.getElementById('rightContent')].forEach(el => {
        if (!el || !el.innerHTML.trim()) return;
        const flow = el.querySelector('.page-flow');
        if (!flow) return;
        const kids = Array.from(flow.children).filter(n => n.classList && (n.classList.contains('entry-bubble') || n.classList.contains('cover-bubble')));
        kids.forEach((k, i) => {
          const body = k.querySelector(':scope > .entry-body');
          out.push({
            side: el.id, idx: i, cls: k.className,
            head: (k.querySelector(':scope > .eb-head')||{}).textContent || null,
            bodyStart: body ? JSON.stringify(body.textContent.slice(0,120)) : null,
            bodyEnd: body ? JSON.stringify(body.textContent.slice(-60)) : null,
            bodyLen: body ? body.textContent.length : 0
          });
        });
      });
      return out;
    });
    console.log('SPREAD', s, JSON.stringify(info, null, 1));
    await page.evaluate(() => document.getElementById('nextPageBtn').click());
    await new Promise(r => setTimeout(r, 900));
  }
  await browser.close();
})();
