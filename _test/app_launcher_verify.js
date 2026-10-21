// Verifies app.html: opens the CURRENT index.html as an app window on
// desktop + phone viewports, without touching any existing code.
const puppeteer = require('/workspace/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  let fail = 0;

  for (const vp of [
    { name: 'desktop', width: 1440, height: 900, mobile: false },
    { name: 'phone-android', width: 390, height: 844, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36' },
  ]) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: vp.mobile, hasTouch: vp.mobile });
    if (vp.ua) await page.setUserAgent(vp.ua);
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));

    const popPromise = new Promise(res => ctx.once('targetcreated', t => res(t)));
    await page.goto('http://localhost:8123/app.html', { waitUntil: 'load' });

    if (vp.mobile && /Android/.test(vp.ua)) {
      // Android path: same tab navigates to the app (index.html?mode=app)
      await page.waitForFunction(() => location.pathname.endsWith('/index.html') && location.search.includes('mode=app'), { timeout: 5000 });
      console.log(`[${vp.name}] navigated to app ->`, page.url());
      const appOk = await page.evaluate(() => ({
        hasForm: !!document.getElementById('entryForm'),
        hasBook: !!document.getElementById('bookModal'),
      }));
      console.log(`[${vp.name}] app contents:`, JSON.stringify(appOk));
      if (!appOk.hasForm || !appOk.hasBook) { console.error(`[${vp.name}] FAIL: app not loaded`); fail++; }
    } else {
      // Desktop path: popup window opened with index.html
      const pop = await popPromise;
      const ppage = await pop.page();
      await ppage.waitForSelector('#entryForm', { timeout: 5000 });
      console.log(`[${vp.name}] popup opened ->`, ppage.url());
      const sameApp = await ppage.evaluate(() => ({
        title: document.title,
        hasForm: !!document.getElementById('entryForm'),
        hasBook: !!document.getElementById('bookModal'),
        scriptLoaded: typeof document.querySelector('#liveCount')?.textContent === 'string',
      }));
      console.log(`[${vp.name}] app contents:`, JSON.stringify(sameApp));
      if (!sameApp.hasForm || !sameApp.hasBook) { console.error(`[${vp.name}] FAIL: app not loaded`); fail++; }
    }

    // The launcher itself must render the fallback card cleanly (no JS errors)
    const launcherErrs = errors.filter(e => !/favicon/i.test(e));
    if (launcherErrs.length) { console.error(`[${vp.name}] PAGEERRORS:`, launcherErrs); fail++; }

    // Sanity: fallback button exists (only checked while still on app.html)
    if (!vp.mobile || !/Android/.test(vp.ua)) {
      const btnOk = await page.evaluate(() => {
        const b = document.getElementById('openAppBtn');
        return !!b && b.textContent.includes('Open the App');
      }).catch(() => true);
      if (btnOk === false) { console.error(`[${vp.name}] FAIL: no fallback button`); fail++; }
    }

    await ctx.close();
  }

  await browser.close();
  console.log(fail === 0 ? 'ALL CHECKS PASSED ✔' : `FAILURES: ${fail} ✘`);
  process.exit(fail === 0 ? 0 : 1);
})();
