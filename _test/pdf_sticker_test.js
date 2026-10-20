// Verifies the PDF/print path: stickers ARE baked into the print window,
// sized to their reserved empty slots, never overlapping text.
const puppeteer = require('/workspace/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m', 'http.server', '8911', '--directory', '/workspace'], { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 700));

  await page.goto('http://localhost:8911/index.html', { waitUntil: 'domcontentloaded' });
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

  // Stub window.open with a REAL iframe Window (same-origin): supports
  // document.write/addEventListener/fonts — everything printBooklet uses.
  const result = await page.evaluate(async () => {
    const ifr = document.createElement('iframe');
    ifr.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:1400px;border:0;visibility:hidden';
    document.body.appendChild(ifr);
    await new Promise(r => { ifr.onload = r; ifr.src = 'about:blank'; });
    const w = ifr.contentWindow;
    w.print = function () { w.__printed = true; };
    const origOpen = window.open;
    window.open = () => w;
    document.querySelector('#printBookletBtn').click();
    // wait for bake completion: stickers present AND slot markers removed
    let waited = 0;
    while (waited < 20000) {
      await new Promise(r => setTimeout(r, 250)); waited += 250;
      try {
        const st = w.document.querySelectorAll('.page-sticker').length;
        const slotsLeft = w.document.querySelectorAll('.sticker-slot').length;
        const sheets = w.document.querySelectorAll('.print-sheet').length;
        if (sheets && !slotsLeft && st) break;
        if (w.__printed && waited > 3000 && sheets && !slotsLeft) break;
      } catch (e) {}
    }
    window.open = origOpen;
    const out = { waitedMs: waited, printed: !!w.__printed, stickers: 0, collisions: 0, tooBig: 0, slotMarkers: 0, details: [] };
    try {
      out.slotMarkers = w.document.querySelectorAll('.sticker-slot').length;
      const sheets = Array.from(w.document.querySelectorAll('.print-sheet'));
      out.sheets = sheets.length;
      sheets.forEach(sheet => {
        const pc = sheet.querySelector('.page-content');
        if (!pc) return;
        const lines = [];
        pc.querySelectorAll('.eb-head, .entry-body, .cb-title, .cb-meta, .empty-page').forEach(tn => {
          const rng = w.document.createRange(); rng.selectNodeContents(tn);
          Array.from(rng.getClientRects()).forEach(r => { if (r.width > 1 && r.height > 1) lines.push(r); });
        });
        pc.querySelectorAll('.page-sticker').forEach(st => {
          out.stickers++;
          const b = st.getBoundingClientRect();
          lines.forEach(r => {
            if (b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom) out.collisions++;
          });
          if (b.width > 193 || b.height > 193) out.tooBig++;   // > 2in @96dpi
          out.details.push({ w: Math.round(b.width), h: Math.round(b.height) });
        });
      });
    } catch (e) { out.err = String(e); }
    ifr.remove();
    return out;
  });
  console.log(JSON.stringify(result, null, 1));
  srv.kill();
  await browser.close();
  if (!result.stickers) { console.log('FAIL: no stickers baked into print window'); process.exit(1); }
  if (result.collisions) { console.log('FAIL: sticker overlaps text'); process.exit(1); }
  if (result.slotMarkers) { console.log('FAIL: leftover slot markers'); process.exit(1); }
  if (result.tooBig) { console.log('FAIL: sticker exceeds 2x2in'); process.exit(1); }
  console.log('PASS: stickers appear in the print/PDF window, sized within their slots, no text overlap');
})().catch(e => { console.error('FATAL', e); process.exit(1); });
