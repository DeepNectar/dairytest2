const puppeteer = require('/workspace/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()); });

  await page.goto('http://localhost:8901/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    const users = { 'test@t.com': { name: 'Testy', pass: 'x', email: 'test@t.com' } };
    localStorage.setItem('dairyWriting.users', JSON.stringify(users));
    const mk = (i, body) => ({ id: 'e' + i, title: 'T' + i, mood: '\u{1F60A}', date: Date.now() - (300 - i) * 86400000, body, sender: i % 2 ? 'Deep' : '\u{1F90F}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618}' });
    const es = [];
    for (let i = 0; i < 40; i++) {
      let b = 'Deep: "msg ' + i + ' ' + ('lorem ipsum dolor sit amet '.repeat(2 + (i % 6))) + '"';
      if (i % 3 === 0) b += '\nWhat I felt: so much love in this one, feeling blessed beyond words today.';
      es.push(mk(i, b));
    }
    localStorage.setItem('dairyWriting.entries.test@t.com', JSON.stringify(es));
    localStorage.setItem('dairyWriting.currentUser', 'test@t.com');
  });
  await page.reload({ waitUntil: 'networkidle2' }).catch(async () => { await page.reload({ waitUntil: 'domcontentloaded' }); });
  await new Promise(r => setTimeout(r, 800));

  await page.evaluate(() => document.querySelector('#bookViewLink').click());
  await new Promise(r => setTimeout(r, 2500));

  const audit = await page.evaluate(() => {
    const res = { pages: [], header: {}, errors: [] };
    const lc = document.querySelector('#leftContent');
    const hdr = document.querySelector('#pageLeft .book-page-header');
    const img = hdr && hdr.querySelector('.bph-photo');
    const ttl = hdr && hdr.querySelector('.bph-title');
    if (hdr && img && ttl) {
      const hb = hdr.getBoundingClientRect(), ib = img.getBoundingClientRect(), tb = ttl.getBoundingClientRect();
      res.header.left = {
        headerH: Math.round(hb.height), imgH: Math.round(ib.height), imgW: Math.round(ib.width),
        imgVisible: ib.width > 5 && ib.height > 5,
        overlapTitle: !(ib.right <= tb.left || tb.right <= ib.left),
        insideHeader: ib.top >= hb.top - 1 && ib.bottom <= hb.bottom + 1,
        leftOffset: Math.round(ib.left - hb.left), topOffset: Math.round(ib.top - hb.top)
      };
    }
    const sheets = [document.querySelector('#pageLeft'), document.querySelector('#pageRight')];
    sheets.forEach((sheet, si) => {
      if (!sheet) return;
      const inner = sheet.querySelector('.page-inner');
      const content = sheet.querySelector('.page-content');
      const footer = sheet.querySelector('.book-page-footer');
      const bubbles = Array.from(content.querySelectorAll('.entry-bubble'));
      const ib = inner.getBoundingClientRect();
      const fb = footer ? footer.getBoundingClientRect() : null;
      const bottomLimit = fb ? fb.top : ib.bottom;
      let worstOver = 0, overCount = 0;
      bubbles.forEach(bub => {
        const r = bub.getBoundingClientRect();
        if (r.bottom > bottomLimit + 1) { overCount++; worstOver = Math.max(worstOver, r.bottom - bottomLimit); }
      });
      let lowest = ib.top;
      bubbles.forEach(bub => { const r = bub.getBoundingClientRect(); if (r.bottom > lowest) lowest = r.bottom; });
      const lastBottomGap = bubbles.length ? Math.round(bottomLimit - lowest) : null;
      const stamps = content.querySelectorAll('.love-stamp').length;
      const slots = content.querySelectorAll('.sticker-slot').length;
      const stickers = content.querySelectorAll('.page-sticker').length;
      res.pages.push({ sheet: si, bubbles: bubbles.length, clippedBelowFooter: overCount, worstOverPx: Math.round(worstOver), lastBottomGap, stamps, slots, stickers, innerH: Math.round(ib.height) });
    });
    const bub = lc.querySelector('.entry-bubble');
    if (bub) res.entryBg = getComputedStyle(bub).backgroundColor;
    res.spreadInfo = document.querySelector('#spreadInfo').textContent;
    return res;
  });
  console.log(JSON.stringify(audit, null, 1));
  await page.screenshot({ path: '/workspace/_test/book_spread1.png' });

  for (let s = 0; s < 8; s++) {
    await page.evaluate(() => document.querySelector('#nextPageBtn').click());
    await new Promise(r => setTimeout(r, 1000));
    const a = await page.evaluate(() => {
      const out = [];
      [document.querySelector('#pageLeft'), document.querySelector('#pageRight')].forEach(sheet => {
        if (!sheet) return;
        const inner = sheet.querySelector('.page-inner');
        const content = sheet.querySelector('.page-content');
        const footer = sheet.querySelector('.book-page-footer');
        const bubbles = Array.from(content.querySelectorAll('.entry-bubble'));
        const fb = footer.getBoundingClientRect();
        let over = 0, worst = 0, lowest = inner.getBoundingClientRect().top;
        bubbles.forEach(b => { const r = b.getBoundingClientRect(); if (r.bottom > fb.top + 1) { over++; worst = Math.max(worst, r.bottom - fb.top); } if (r.bottom > lowest) lowest = r.bottom; });
        out.push({ bubbles: bubbles.length, over, worst: Math.round(worst), gap: Math.round(fb.top - lowest) });
      });
      return { info: document.querySelector('#spreadInfo').textContent, pages: out };
    });
    console.log(JSON.stringify(a));
  }
  await page.screenshot({ path: '/workspace/_test/book_spread_last.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
