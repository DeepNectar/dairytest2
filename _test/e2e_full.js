const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1400, height: 950 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type()==='error') console.log('CONSOLE-ERR:', m.text().slice(0,160)); });

  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000)); // let init() auto-resume session

  const signed = await page.evaluate(() => document.getElementById('userName')?.textContent || '(none)');
  console.log('AUTO-SIGNED-IN AS:', JSON.stringify(signed));

  const listState = await page.evaluate(() => ({
    kids: document.getElementById('entriesList').children.length,
    emptyDisplay: getComputedStyle(document.getElementById('emptyState')).display,
    stats: document.getElementById('statEntries').textContent + '/' + document.getElementById('statWords').textContent + '/' + document.getElementById('statStreak').textContent,
  }));
  console.log('LIST:', JSON.stringify(listState));

  // Save a new entry via the form
  await page.evaluate(() => { document.getElementById('entryTitle').value=''; document.getElementById('entryBody').value=''; });
  await page.type('#entryTitle', 'E2E verification day');
  await page.type('#entryBody', 'Deep: "Automated end-to-end test entry for site verification."\nWhat I felt: Hopeful that the site works.');
  await page.evaluate(() => document.getElementById('entryForm').requestSubmit());
  await new Promise(r => setTimeout(r, 3500));
  const afterSave = await page.evaluate(() => ({
    kids: document.getElementById('entriesList').children.length,
    toast: document.getElementById('toast').textContent,
    firstCard: document.querySelector('#entriesList .entry')?.textContent.slice(0,80),
  }));
  console.log('AFTER SAVE:', JSON.stringify(afterSave));

  // Book view: open, flip next/prev
  await page.evaluate(() => document.getElementById('bookViewLink').click());
  await new Promise(r => setTimeout(r, 5000));
  const book1 = await page.evaluate(() => ({
    info: document.getElementById('spreadInfoPhone').textContent,
    leftHasContent: !!document.getElementById('leftContent').innerHTML.trim(),
    leafVisible: !!document.getElementById('leaf'),
  }));
  console.log('BOOK OPEN:', JSON.stringify(book1));
  await page.evaluate(() => document.getElementById('tabNext').click());
  await new Promise(r => setTimeout(r, 1500));
  await page.evaluate(() => document.getElementById('tabNext').click());
  await new Promise(r => setTimeout(r, 1500));
  const book2 = await page.evaluate(() => ({
    info: document.getElementById('spreadInfoPhone').textContent,
    bodySnippet: document.getElementById('leftContent').textContent.slice(0, 120),
  }));
  console.log('BOOK AFTER 2 NEXT:', JSON.stringify(book2));
  await page.evaluate(() => document.getElementById('tabPrev').click());
  await new Promise(r => setTimeout(r, 1200));
  console.log('BOOK AFTER PREV:', await page.evaluate(() => document.getElementById('spreadInfoPhone').textContent));
  await page.screenshot({ path: '/workspace/_test/e2e_book.png' });
  await page.evaluate(() => document.getElementById('appBackBtn').click());
  await new Promise(r => setTimeout(r, 800));
  console.log('BOOK CLOSED:', await page.evaluate(() => document.getElementById('bookModal').classList.contains('hidden')));

  // Search filter
  await page.type('#searchInput', 'Automated');
  await new Promise(r => setTimeout(r, 1200));
  console.log('SEARCH RESULTS:', await page.evaluate(() => document.getElementById('entriesList').children.length));
  await page.evaluate(() => { document.getElementById('searchInput').value=''; document.getElementById('searchInput').dispatchEvent(new Event('input')); });

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
