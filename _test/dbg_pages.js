// Debug: dump per-page first-bubble geometry from the on-screen book pages.
const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m', 'http.server', '8912', '--directory', '/workspace'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));
  await page.goto('http://localhost:8912/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dairyWriting.users', JSON.stringify({ 't@t.com': { name: 'T', hash: '' } }));
    const mk = (i, body) => ({ id: 'e' + i, date: Date.now() - (300 - i) * 86400000, body, sender: i % 2 ? 'Deep' : 'Chota' });
    const es = [];
    for (let i = 0; i < 40; i++) {
      let b = 'msg ' + i + ' ' + ('lorem ipsum dolor sit amet consectetur '.repeat(2 + (i % 7)));
      if (i % 3 === 0) b += '\nWhat I felt: so much love in this one, feeling blessed beyond words today.';
      es.push(mk(i, b));
    }
    localStorage.setItem('dairyWriting.entries.t@t.com', JSON.stringify(es));
    sessionStorage.setItem('dairyWriting.session', 't@t.com');
  });
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 600));
  await page.evaluate(() => document.querySelector('#bookViewLink').click());
  await new Promise(r => setTimeout(r, 4000));
  const out = await page.evaluate(() => {
    // rebuild pages via internal? just read current left/right flows across spreads is hard;
    // instead re-run buildBookPages-equivalent by paging through spreads quickly.
    return { spreadInfo: document.querySelector('#spreadInfo')?.textContent };
  });
  console.log(JSON.stringify(out));
  srv.kill();
  await browser.close();
})();
