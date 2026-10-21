const puppeteer = require('puppeteer');

async function audit(page, tag) {
  const res = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const bad = [];
    // elements sticking out horizontally
    document.querySelectorAll('body *').forEach(el => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return;
      if (el.closest('[hidden]')) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;
      if (r.right > vw + 2 || r.left < -2) {
        bad.push({ sel: el.tagName + '#' + el.id + '.' + String(el.className).slice(0,40), left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width) });
      }
    });
    return {
      docW: document.documentElement.scrollWidth, vw,
      overflowX: document.documentElement.scrollWidth > vw + 1,
      bad: bad.slice(0, 25),
    };
  });
  console.log(tag, JSON.stringify(res, null, 1));
}

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  await page.goto('file:///workspace/index.html', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1200));
  await audit(page, 'HOME');
  await page.screenshot({ path: '/workspace/_test/audit_home.png' });

  // scroll through sections and screenshot each
  for (const sec of ['about','journal','entries','tips','contact']) {
    await page.evaluate(id => document.getElementById(id).scrollIntoView(), sec);
    await new Promise(r => setTimeout(r, 900));
    await page.screenshot({ path: `/workspace/_test/audit_${sec}.png` });
  }

  // open auth modal on phone
  await page.evaluate(() => document.getElementById('authBtn').click());
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: '/workspace/_test/audit_auth.png' });
  await audit(page, 'AUTHMODAL');
  await page.keyboard.press('Escape');

  // hamburger menu
  await page.evaluate(() => { window.scrollTo(0,0); document.getElementById('hamburger').click(); });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: '/workspace/_test/audit_menu.png' });

  console.log('ERRORS:', JSON.stringify(errors, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
