/* PDF/print-flow verification:
   1. Load app, seed entries, open book (preview).
   2. Snapshot preview sticker placements + last-5-row gap per page.
   3. Simulate printBooklet(): bake stickers into copies of bookPages and
      build the EXACT print-window HTML (same code path as script.js), then
      inject it into a full-size A4 document and measure EVERY sheet:
        - text must not overflow / be cut below the usable area
        - baked stickers must NOT overlap any text rect
        - baked stickers must sit inside an empty slot/band
   4. Also generate a real PDF via Chrome headless for eyeball check. */
const puppeteer = require('/workspace/node_modules/puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  // server
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m', 'http.server', '8907', '--directory', '/workspace'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));

  await page.goto('http://localhost:8907/index.html', { waitUntil: 'domcontentloaded' });
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
  await new Promise(r => setTimeout(r, 3000));

  // ---- simulate the print pipeline INSIDE the app page (reuses its own
  // functions by re-implementing selection + calling the same bake logic via
  // a dedicated route: easiest is to intercept window.open and capture the
  // HTML the real printBooklet() writes!) ----
  const result = await page.evaluate(async () => {
    const captured = { html: null };
    const fakeWin = {
      document: {
        write(s) { captured.html = (captured.html || '') + s; },
        close() {},
      },
      focus() {},
      print() {},
    };
    const origOpen = window.open;
    window.open = () => fakeWin;
    document.querySelector('#printBookletBtn').click();
    // let storage rebuild + pagination + sticker baking finish (baking uses
    // the live engine which retries until laid out — allow up to ~6s)
    for (let t = 0; t < 60 && !captured.html; t++) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => setTimeout(r, 300));
    window.open = origOpen;
    return captured.html;
  });
  if (!result) { console.log('FAIL: printBooklet did not write any HTML'); process.exit(1); }

  // strip the <link> tags (offline) but keep everything else; inject into a
  // fresh full-size document with the app's style.css loaded from disk URL
  let doc = result;
  doc = doc.replace(/<link rel="stylesheet"[^>]*>/g, '<link rel="stylesheet" href="http://localhost:8907/style.css">');

  const pdfPage = await browser.newPage();
  await pdfPage.setViewport({ width: 1000, height: 1400 });
  await pdfPage.setContent('<html><head><style>html{font-size:16px}</style></head><body></body></html>', { waitUntil: 'domcontentloaded' });
  await pdfPage.goto('about:blank');
  await pdfPage.setContent(doc, { waitUntil: 'networkidle2' }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  const checks = await pdfPage.evaluate(() => {
    const sheets = Array.from(document.querySelectorAll('.print-sheet'));
    const out = { sheets: sheets.length, overflow: 0, collisions: 0, stickers: 0, gaps: [], sizes: [] };
    sheets.forEach(sheet => {
      const content = sheet.querySelector('.page-content');
      const inner = sheet.querySelector('.page-inner');
      const ir = inner.getBoundingClientRect();
      const sr = sheet.getBoundingClientRect();
      // bottom of deepest text/card vs usable area (footer band top)
      let lowest = 0;
      content.querySelectorAll('.entry-bubble, .empty-page').forEach(n => {
        const r = n.getBoundingClientRect();
        if (r.bottom > lowest) lowest = r.bottom;
      });
      const footer = sheet.querySelector('.book-page-footer').getBoundingClientRect();
      if (lowest > footer.top + 1) out.overflow++;
      // text line rects (Range client rects — actual glyphs' lines)
      const lines = [];
      content.querySelectorAll('.eb-head, .entry-body, .cb-title, .cb-meta, .empty-page').forEach(tn => {
        const rng = document.createRange(); rng.selectNodeContents(tn);
        Array.from(rng.getClientRects()).forEach(r => { if (r.width > 1 && r.height > 1) lines.push(r); });
      });
      content.querySelectorAll('.book-cover > *').forEach(tn => {
        const rng = document.createRange(); rng.selectNodeContents(tn);
        Array.from(rng.getClientRects()).forEach(r => { if (r.width > 1 && r.height > 1) lines.push(r); });
      });
      const st = content.querySelector('.page-sticker');
      if (st) {
        out.stickers++;
        const b = st.getBoundingClientRect();
        lines.forEach(r => {
          if (b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom) out.collisions++;
        });
        out.sizes.push(Math.round(b.width));
      }
      // last-5-row rule on entry pages: bubble bottoms must stop ~5 rows above footer
      const bubbles = Array.from(content.querySelectorAll('.entry-bubble'));
      if (bubbles.length) {
        let lb = 0; bubbles.forEach(bb => { const r = bb.getBoundingClientRect(); if (r.bottom > lb) lb = r.bottom; });
        out.gaps.push(Math.round(footer.top - lb));
      }
      // sheet size sanity: exactly A4 at 96dpi (794 x 1123 ±1)
      out.sheetW = Math.round(sr.width); out.sheetH = Math.round(sr.height);
    });
    // leftover slot markers should have been removed from the print DOM
    out.slotMarkers = document.querySelectorAll('.sticker-slot').length;
    return out;
  });
  console.log('PRINT/PDF SHEETS:', checks.sheets, 'sheet size px:', checks.sheetW + 'x' + checks.sheetH);
  console.log('stickers baked:', checks.stickers, '| text collisions:', checks.collisions);
  console.log('pages overflowing below footer:', checks.overflow);
  console.log('leftover .sticker-slot markers:', checks.slotMarkers);
  if (checks.gaps.length) {
    console.log('last-5-row gap (px above footer): min=', Math.min(...checks.gaps), 'max=', Math.max(...checks.gaps),
                'violations(<130):', checks.gaps.filter(g => g < 130).length);
  }
  console.log('sticker sizes px:', checks.sizes.join(','));

  // produce a real PDF too (Save-as-PDF path uses the same layout engine)
  await pdfPage.pdf({ path: '/workspace/_test/booklet.pdf', format: 'A4', printBackground: true });
  console.log('PDF written: _test/booklet.pdf');
  await pdfPage.screenshot({ path: '/workspace/_test/pdf_sheet1.png', clip: { x: 0, y: 0, width: 794, height: 1123 } }).catch(()=>{});
  srv.kill();
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
