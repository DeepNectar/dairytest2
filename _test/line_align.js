const puppeteer = require('/workspace/node_modules/puppeteer');

// Checks whether every rendered TEXT LINE in the book sits exactly ON a ruled
// row: line top must equal head-h + pad-t + n*row (within 1px).
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://localhost:8901/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const users = { 'test@t.com': { name: 'Testy', pass: 'x', email: 'test@t.com' } };
    localStorage.setItem('dairyWriting.users', JSON.stringify(users));
    const mk = (i, body) => ({ id: 'e' + i, title: 'T' + i, mood: '\u{1F60A}', date: Date.now() - (300 - i) * 86400000, body, sender: i % 2 ? 'Deep' : 'Chota Don' });
    const es = [];
    for (let i = 0; i < 40; i++) {
      let b = 'Deep: "msg ' + i + ' ' + ('lorem ipsum dolor sit amet '.repeat(2 + (i % 6))) + '"';
      if (i % 3 === 0) b += '\nWhat I felt: so much love in this one, feeling blessed beyond words today.';
      es.push(mk(i, b));
    }
    localStorage.setItem('dairyWriting.entries.test@t.com', JSON.stringify(es));
    localStorage.setItem('dairyWriting.currentUser', 'test@t.com');
    sessionStorage.setItem('dairyWriting.session', 'test@t.com');
  });
  await page.reload({ waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => document.querySelector('#bookViewLink').click());
  await new Promise(r => setTimeout(r, 2500));

  const totalSpreads = await page.evaluate(() => {
    const m = document.querySelector('#spreadInfo').textContent.match(/\/\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  });

  let linesChecked = 0, misaligned = 0, driftSamples = [];
  for (let s = 0; s < totalSpreads; s++) {
    const res = await page.evaluate(() => {
      const out = { rows: [], samples: [] };
      [document.querySelector('#pageLeft'), document.querySelector('#pageRight')].forEach(sheet => {
        if (!sheet) return;
        const content = sheet.querySelector('.page-content');
        if (!content) return;
        // find the ruled-row geometry from the CSS vars on .page/.book
        const bookEl = document.querySelector('.book');
        const bcs = getComputedStyle(bookEl);
        const row = parseFloat(bcs.getPropertyValue('--row'));
        const headH = parseFloat(bcs.getPropertyValue('--head-h'));
        const padT = parseFloat(bcs.getPropertyValue('--pad-t'));
        const firstLineTop = headH + padT;   // absolute y of row 0 inside sheet
        const sheetTop = sheet.getBoundingClientRect().top;
        const nodes = content.querySelectorAll('.eb-head, .entry-body, .cb-title, .cb-meta, .cover-divider, .cover-title-row, .cover-names, .cover-started, .cover-quote, .empty-page, .eb-extra, .eb-cont-note');
        nodes.forEach(node => {
          const rng = document.createRange(); rng.selectNodeContents(node);
          Array.from(rng.getClientRects()).forEach(r => {
            if (r.width < 2 || r.height < 2) return;
            const relTop = r.top - sheetTop;
            const drift = ((relTop - firstLineTop) % row + row) % row;
            const err = Math.min(drift, row - drift);   // distance to nearest row
            out.rows.push({ h: Math.round(r.height), err: +err.toFixed(2), lh: Math.round(r.height) });
            if (out.samples.length < 12 && node.classList.contains('entry-body')) {
              out.samples.push({ cls: node.className, errPx: +err.toFixed(2), lineH: +r.height.toFixed(2), relTop: +relTop.toFixed(2) });
            }
          });
          rng.detach && rng.detach();
        });
      });
      return out;
    });
    res.rows.forEach(r => { linesChecked++; if (r.err > 1.5) misaligned++; });
    if (s < 3) driftSamples.push(res.samples);
    if (s + 1 < totalSpreads) {
      await page.evaluate(() => document.querySelector('#nextPageBtn').click());
      await new Promise(r => setTimeout(r, 700));
    }
  }
  console.log(JSON.stringify({ totalSpreads, linesChecked, misaligned, driftSamples }, null, 1));
  await browser.close();
})();
