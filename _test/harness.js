// Reproduction harness: real cloud data, desktop + phone, page-by-page audit
const puppeteer = require('/workspace/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const mobile = process.argv.includes('--mobile');
  if (mobile) await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  else await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  // sign in with a REAL account so the book holds real entries
  await page.evaluate(() => document.getElementById('authBtn').click());
  await new Promise(r => setTimeout(r, 600));
  await page.type('#authEmail', 'qa.tester@dairy.app', { delay: 2 });
  await page.type('#authPass', 'TestPass123!', { delay: 2 });
  await page.evaluate(() => document.getElementById('authForm').requestSubmit());
  await new Promise(r => setTimeout(r, 3500));
  const signed = await page.evaluate(() => document.getElementById('userName')?.textContent || '');
  console.log('signed-in-as:', JSON.stringify(signed));

  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 6000));

  for (let s = 0; s < 12; s++) {
    const info = await page.evaluate((si) => {
      const out = { spread: si };
      const slots = [];
      [['left', document.getElementById('leftContent')], ['right', document.getElementById('rightContent')]].forEach(([name, el]) => {
        if (!el) return;
        if (!el.innerHTML.trim()) return;
        const kids = Array.from(el.children);
        const flow = el.querySelector('.page-flow');
        const topChildren = kids.map(k => k.className || k.tagName.toLowerCase());
        const firstEntry = flow ? flow.querySelector(':scope > .entry-bubble, :scope > .cover-bubble, :scope > .empty-page, :scope > .book-cover') : null;
        const allEntries = flow ? flow.querySelectorAll(':scope > .entry-bubble, :scope > .cover-bubble').length : 0;
        const slotEls = el.querySelectorAll('.sticker-slot');
        slotEls.forEach(sl => slots.push({ side: name, left: sl.style.left, top: sl.style.top, w: sl.style.width, h: sl.style.height }));
        const stks = el.querySelectorAll('.page-sticker');
        const stkInfo = Array.from(stks).map(st => ({ w: st.style.width, h: st.style.height, l: st.style.left, t: st.style.top }));
        out[name] = {
          num: el.closest('.page').querySelector('.page-num')?.textContent,
          topChildren, entryCount: allEntries,
          firstClass: firstEntry ? firstEntry.className : null,
          stickers: stkInfo.length, stickerInfo: stkInfo
        };
      });
      out.slots = slots;
      out.info = document.getElementById('spreadInfo')?.textContent;
      return out;
    }, s);
    console.log(JSON.stringify(info));
    if (mobile) await page.evaluate(() => document.getElementById('tabNext')?.click());
    else await page.evaluate(() => document.getElementById('nextPageBtn').click());
    await new Promise(r => setTimeout(r, 1200));
  }
  await page.screenshot({ path: '/workspace/_test/repro' + (mobile ? '_phone' : '') + '.png' });
  await browser.close();
})();
