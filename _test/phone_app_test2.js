const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('file:///workspace/index.html', { waitUntil: 'load' });
  await page.click('#authBtn');
  await new Promise(r => setTimeout(r, 300));
  await page.click('#tabSignup');
  await new Promise(r => setTimeout(r, 200));
  await page.type('#authForm input[type="text"]', 'Honey');
  await page.type('#authForm input[type="email"]', 'a@b.c');
  const passes = await page.$$('#authForm input[type="password"]');
  await passes[0].type('x12345');
  if (passes[1]) await passes[1].type('x12345');
  await page.click('#authForm button[type="submit"]');
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => {
    const mk = (i) => ({ title: 'Day ' + i, date: '2025-12-' + String(i).padStart(2,'0'),
      body: 'Deep: "Memory number ' + i + ' of our beautiful story ❤️"', sender: 'Deep' });
    const arr = []; for (let i = 1; i <= 40; i++) arr.push(mk(i));
    localStorage.setItem('dairyWriting.entries.a@b.c', JSON.stringify(arr));
  });
  await page.reload({ waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 3500));

  const getPage = () => page.evaluate(() => document.getElementById('spreadInfoPhone').textContent);

  // instrument the swipe handlers to see raw touch deltas
  await page.evaluate(() => {
    window.__swipes = [];
    const stage = document.querySelector('#bookModal .book-stage');
    let sx = 0, sy = 0;
    stage.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true, capture: true });
    stage.addEventListener('touchend', e => { window.__swipes.push({ dx: e.changedTouches[0].clientX - sx, dy: e.changedTouches[0].clientY - sy }); }, { passive: true, capture: true });
  });

  async function swipe(dx) {
    const x0 = 195, y0 = 420;
    await page.touchscreen.touchStart(x0, y0);
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      await page.touchscreen.touchMove(x0 + dx * i / steps, y0);
      await new Promise(r => setTimeout(r, 15));
    }
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 900));
  }

  const before = await getPage();
  await swipe(-140);
  const afterNext = await getPage();
  console.log('SWIPE-next:', before, '->', afterNext, before !== afterNext ? 'PASS' : 'FAIL');
  console.log('raw deltas:', JSON.stringify(await page.evaluate(() => window.__swipes)));

  await swipe(140);
  const afterPrev = await getPage();
  console.log('SWIPE-prev:', afterNext, '->', afterPrev, afterPrev === before ? 'PASS' : 'FAIL');

  await page.screenshot({ path: '/workspace/_test/phone_book.png' });

  // close via back button — tap center of the button
  const bb = await page.evaluate(() => { const r = document.getElementById('appBackBtn').getBoundingClientRect(); return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; });
  await page.touchscreen.tap(bb.x, bb.y);
  await new Promise(r => setTimeout(r, 400));
  const closed = await page.evaluate(() => document.getElementById('bookModal').classList.contains('hidden'));
  console.log('BACK close test:', closed ? 'PASS' : 'FAIL');

  // reopen and check it fits again after orientation change
  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 3000));
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 600));
  const land = await page.evaluate(() => {
    const b = document.getElementById('book').getBoundingClientRect();
    const tab = document.querySelector('.app-tabbar').getBoundingClientRect();
    return { bookW: Math.round(b.width), bookH: Math.round(b.height), tabBottom: Math.round(tab.bottom), vh: innerHeight, fits: b.bottom <= tab.top + 2 };
  });
  console.log('LANDSCAPE fit:', JSON.stringify(land));

  console.log('JS errors:', errors.slice(0, 5));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
