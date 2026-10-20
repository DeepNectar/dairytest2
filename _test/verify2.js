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
    sessionStorage.setItem('dairyWriting.session', 'test@t.com');
  });
  await page.reload({ waitUntil: 'networkidle2' }).catch(async () => { await page.reload({ waitUntil: 'domcontentloaded' }); });
  await new Promise(r => setTimeout(r, 800));
  await page.evaluate(() => document.querySelector('#bookViewLink').click());
  await new Promise(r => setTimeout(r, 2500));

  // walk EVERY spread, checking sticker/text collisions + last-5-row rule
  const totalSpreads = await page.evaluate(() => {
    const m = document.querySelector('#spreadInfo').textContent.match(/\/\s*(\d+)/);
    return m ? parseInt(m[1], 10) : 1;
  });
  let checks = 0, collisions = 0, stickersFound = 0, overFooter = 0, gapViolations = 0;
  const gaps = [];
  for (let s = 0; s < totalSpreads; s++) {
    const res = await page.evaluate(() => {
      const out = { pages: [] };
      [document.querySelector('#pageLeft'), document.querySelector('#pageRight')].forEach(sheet => {
        if (!sheet) return;
        const content = sheet.querySelector('.page-content');
        const footer = sheet.querySelector('.book-page-footer');
        const fb = footer.getBoundingClientRect();
        // text line rects
        const lines = [];
        content.querySelectorAll('.entry-bubble').forEach(bub => {
          bub.querySelectorAll('.eb-head, .entry-body').forEach(tn => {
            const rng = document.createRange(); rng.selectNodeContents(tn);
            Array.from(rng.getClientRects()).forEach(r => { if (r.width > 1 && r.height > 1) lines.push(r); });
          });
        });
        content.querySelectorAll('.empty-page, .cover-bubble .cb-title, .cover-bubble .entry-body').forEach(node => {
          const rng = document.createRange(); rng.selectNodeContents(node);
          Array.from(rng.getClientRects()).forEach(r => { if (r.width > 1 && r.height > 1) lines.push(r); });
        });
        let lowestLine = 0;
        lines.forEach(r => { if (r.bottom > lowestLine) lowestLine = r.bottom; });
        const bubbles = Array.from(content.querySelectorAll('.entry-bubble'));
        let lowestBub = 0;
        bubbles.forEach(b => { const r = b.getBoundingClientRect(); if (r.bottom > lowestBub) lowestBub = r.bottom; });
        let clip = 0;
        bubbles.forEach(b => { const r = b.getBoundingClientRect(); if (r.bottom > fb.top + 1) clip++; });
        const st = content.querySelector('.page-sticker');
        let stickerInfo = null;
        if (st) {
          const sr = st.getBoundingClientRect();
          let hit = false;
          lines.forEach(r => {
            if (sr.left < r.right && r.left < sr.right && sr.top < r.bottom && r.top < sr.bottom) hit = true;
          });
          stickerInfo = { hitText: hit, x: Math.round(sr.left), y: Math.round(sr.top), w: Math.round(sr.width) };
        }
        out.pages.push({ n: bubbles.length, clip, gap: Math.round(fb.top - lowestBub), sticker: stickerInfo });
      });
      return out;
    });
    res.pages.forEach(p => {
      checks++;
      if (p.clip > 0) overFooter += p.clip;
      if (p.sticker) { stickersFound++; if (p.sticker.hitText) collisions++; }
      if (p.n > 0) {
        gaps.push(p.gap);
        if (p.gap < 130) gapViolations++;   // ~5 rows of 30px must stay empty above footer band
      }
    });
    if (s < totalSpreads - 1) {
      await page.evaluate(() => document.querySelector('#nextPageBtn').click());
      await new Promise(r => setTimeout(r, 700));
    }
  }
  console.log('SPREADS:', totalSpreads, 'PAGE-CHECKS:', checks);
  console.log('stickers placed:', stickersFound, '| text collisions:', collisions);
  console.log('bubbles clipped below footer:', overFooter);
  console.log('gap stats (px above footer on entry pages): min=', Math.min(...gaps), 'max=', Math.max(...gaps), 'violations(<130):', gapViolations);
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
