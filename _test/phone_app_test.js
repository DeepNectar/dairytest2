const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  await page.goto('file:///workspace/index.html', { waitUntil: 'load' });
  // create an account through the real signup flow (hashes password properly)
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
  const signedIn = await page.evaluate(() => !document.getElementById('authModal').classList.contains('hidden') === false);
  console.log('signed in:', signedIn);

  // seed some entries so the book has multiple pages
  await page.evaluate(() => {
    const mk = (i) => ({ title: 'Day ' + i, date: '2025-12-' + String(i).padStart(2,'0'),
      body: 'Deep: "Memory number ' + i + ' of our beautiful story ❤️"', sender: 'Deep' });
    const arr = []; for (let i = 1; i <= 40; i++) arr.push(mk(i));
    localStorage.setItem('dairyWriting.entries.a@b.c', JSON.stringify(arr));
  });
  await page.reload({ waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 400));

  // open book view
  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 3500));

  const state = await page.evaluate(() => {
    const wrap = document.querySelector('.book-wrap').getBoundingClientRect();
    const bar = document.querySelector('.app-bar').getBoundingClientRect();
    const tab = document.querySelector('.app-tabbar').getBoundingClientRect();
    const book = document.getElementById('book').getBoundingClientRect();
    return {
      phoneMode: document.body.classList.contains('book-phone-mode'),
      vw: innerWidth, vh: innerHeight,
      wrapW: Math.round(wrap.width), wrapH: Math.round(wrap.height),
      barTop: Math.round(bar.top), barH: Math.round(bar.height),
      tabBottom: Math.round(tab.bottom), tabH: Math.round(tab.height),
      bookW: Math.round(book.width), bookH: Math.round(book.height),
      zoom: document.getElementById('book').style.getPropertyValue('--book-zoom'),
      pageLabel: document.getElementById('spreadInfoPhone').textContent,
      rightDisplay: getComputedStyle(document.querySelector('.page-right')).display,
      controlsDisplay: getComputedStyle(document.querySelector('.desktop-only-controls')).display,
      tabPrevHidden: getComputedStyle(document.getElementById('tabPrev')).display,
      sub: document.getElementById('appBarSub').textContent,
    };
  });
  console.log('STATE:', JSON.stringify(state));

  const getPage = () => page.evaluate(() => document.getElementById('spreadInfoPhone').textContent);

  // --- TAP on sheet must NOT flip pages ---
  const before = await getPage();
  const cx = 195, cy = 400;
  await page.touchscreen.tap(cx, cy);
  await new Promise(r => setTimeout(r, 700));
  const afterTap = await getPage();
  console.log('TAP test: before=', before, 'after=', afterTap, before === afterTap ? 'PASS' : 'FAIL');

  // --- SWIPE left → next page ---
  async function swipe(dx) {
    const x0 = 195, y0 = 420;
    await page.touchscreen.touchStart(x0, y0);
    const steps = 8;
    for (let i = 1; i <= steps; i++) await page.touchscreen.touchMove(x0 + dx * i / steps, y0);
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 900));
  }
  await swipe(-140);
  const afterSwipeNext = await getPage();
  console.log('SWIPE-next test: after=', afterSwipeNext, afterSwipeNext !== afterTap ? 'PASS' : 'FAIL');

  // --- SWIPE right → previous page ---
  await swipe(140);
  const afterSwipePrev = await getPage();
  console.log('SWIPE-prev test: after=', afterSwipePrev, afterSwipePrev === afterTap ? 'PASS' : 'FAIL');

  // screenshot the app view (on page 2)
  await swipe(-140);
  await page.screenshot({ path: '/workspace/_test/phone_book.png' });

  // close via back button
  await page.tap('#appBackBtn');
  await new Promise(r => setTimeout(r, 400));
  const closed = await page.evaluate(() => document.getElementById('bookModal').classList.contains('hidden'));
  console.log('BACK close test:', closed ? 'PASS' : 'FAIL');

  console.log('JS errors:', errors.slice(0, 5));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
