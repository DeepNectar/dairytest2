const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0,200)); });
  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));
  const state = await page.evaluate(() => ({
    year: document.getElementById('year')?.textContent,
    authBtn: document.getElementById('authBtn')?.textContent,
    liveCount: document.getElementById('liveCount')?.textContent,
    entriesListKids: document.getElementById('entriesList')?.children.length,
    emptyVisible: !document.getElementById('emptyState')?.classList.contains('hidden'),
    moodOptions: document.getElementById('entryMood')?.options.length,
    toast: !!document.getElementById('toast'),
  }));
  console.log('STATE:', JSON.stringify(state));
  // interact: type in editor
  await page.type('#entryTitle', 'Test day');
  await page.type('#entryBody', 'Hello diary this is a test entry with several words.');
  await new Promise(r => setTimeout(r, 300));
  const lc = await page.evaluate(() => document.getElementById('liveCount').textContent);
  console.log('LIVECOUNT:', lc);
  await page.evaluate(() => document.getElementById('newPromptBtn').click());
  await page.evaluate(() => document.getElementById('themeToggle').click());
  await page.evaluate(() => document.getElementById('hamburger').click());
  await new Promise(r => setTimeout(r, 500));
  console.log('THEME:', await page.evaluate(() => document.documentElement.className + '|' + document.body.className));
  // open book view
  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 1500));
  const book = await page.evaluate(() => ({
    modalHidden: document.getElementById('bookModal').classList.contains('hidden'),
    left: document.getElementById('leftContent')?.innerHTML.slice(0,80),
    spreadInfo: document.getElementById('spreadInfoPhone')?.textContent,
  }));
  console.log('BOOK:', JSON.stringify(book));
  await page.screenshot({ path: '/workspace/_test/smoke.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
