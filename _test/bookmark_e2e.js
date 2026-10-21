// E2E: pin/save a page -> reopen book -> must land on that exact page.
const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  await page.setViewport({ width: 1400, height: 950 });
  let errs = [];
  page.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR:', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 200)); });

  await page.evaluateOnNewDocument(require('fs').readFileSync('/workspace/_test/fetch_override_bookmark.js', 'utf8'));
  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));

  const signIn = async () => {
    await page.evaluate(() => document.getElementById('authBtn').click());
    await new Promise(r => setTimeout(r, 500));
    await page.evaluate(() => document.getElementById('tabSignup').click()); // signup mode
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      document.getElementById('authName').value = '';
      document.getElementById('authEmail').value = '';
      document.getElementById('authPass').value = '';
      document.getElementById('authPass2').value = '';
    });
    await page.click('#authName', { clickCount: 3 });
    await page.type('#authName', 'Booky', { delay: 2 });
    await page.type('#authEmail', 'booktest@d.com', { delay: 2 });
    await page.type('#authPass', 'TestPass123!', { delay: 2 });
    await page.type('#authPass2', 'TestPass123!', { delay: 2 });
    await page.evaluate(() => document.getElementById('authForm').requestSubmit());
    await new Promise(r => setTimeout(r, 3000));
  };

  await signIn();
  const sess = await page.evaluate(() => ({ err: document.getElementById('authError')?.textContent, name: document.getElementById('userName')?.textContent }));
  console.log('after signup:', JSON.stringify(sess));

  const openBookAndRead = async () => {
    await page.evaluate(() => document.getElementById('bookViewLink').click());
    await new Promise(r => setTimeout(r, 6000));
    return page.evaluate(() => ({
      pageNum: document.getElementById('leftNum')?.textContent,
      spreadInfo: document.getElementById('spreadInfo')?.textContent,
      hasContent: !!document.getElementById('leftContent')?.innerHTML.trim(),
    }));
  };

  // 1st open — no bookmark yet → must start at page 1
  let s1 = await openBookAndRead();
  console.log('OPEN#1 (fresh):', JSON.stringify(s1));

  // flip forward 3 pages and save (pin)
  for (let i = 0; i < 3; i++) { await page.evaluate(() => document.getElementById('nextPageBtn').click()); await new Promise(r => setTimeout(r, 1300)); }
  const sAtSave = await page.evaluate(() => document.getElementById('leftNum')?.textContent);
  console.log('AT SAVE TIME page:', sAtSave);
  await page.evaluate(() => document.getElementById('saveBookBtn').click());
  await new Promise(r => setTimeout(r, 1500));
  const toast = await page.evaluate(() => document.getElementById('toast')?.textContent || '');
  console.log('SAVE TOAST:', toast);

  // close book, reopen → must resume at saved page
  await page.evaluate(() => document.getElementById('bookClose').click());
  await new Promise(r => setTimeout(r, 500));
  let s2 = await openBookAndRead();
  console.log('OPEN#2 (resume):', JSON.stringify(s2), '| expected page', sAtSave);
  const resumeToast = await page.evaluate(() => document.getElementById('toast')?.textContent || '');
  console.log('RESUME TOAST:', resumeToast);

  // simulate full site reload + relogin, reopen → still resumes
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  await signIn();
  let s3 = await openBookAndRead();
  console.log('OPEN#3 (after reload+relogin):', JSON.stringify(s3), '| expected page', sAtSave);

  const pass = String(s1.pageNum) === '1' && String(s2.pageNum) === String(sAtSave) && String(s3.pageNum) === String(sAtSave) && s2.hasContent && s3.hasContent && errs.length === 0;
  console.log(pass ? 'RESULT: PASS' : 'RESULT: FAIL');
  await page.screenshot({ path: '/workspace/_test/bookmark_resume.png' });
  await browser.close();
  process.exit(pass ? 0 : 1);
})();
