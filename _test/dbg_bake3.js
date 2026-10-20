const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m','http.server','8915','--directory','/workspace'], { stdio:'ignore' });
  await new Promise(r=>setTimeout(r,700));
  await page.goto('http://localhost:8915/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dairyWriting.users', JSON.stringify({ 't@t.com': { name:'T', hash:'' } }));
    const mk=(i,body)=>({id:'e'+i,date:Date.now()-(300-i)*86400000,body,sender:i%2?'Deep':'Chota'});
    const es=[]; for(let i=0;i<40;i++){let b='msg '+i+' '+('lorem ipsum dolor sit amet consectetur '.repeat(2+(i%7))); if(i%3===0)b+='\nWhat I felt: so much love.'; es.push(mk(i,b));}
    localStorage.setItem('dairyWriting.entries.t@t.com', JSON.stringify(es));
    sessionStorage.setItem('dairyWriting.session','t@t.com');
  });
  await page.reload({ waitUntil:'networkidle2' }).catch(()=>{});
  await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>document.querySelector('#bookViewLink').click());
  await new Promise(r=>setTimeout(r,3000));

  // Patch win.focus to capture the real print-window Window object.
  const dbg = await page.evaluate(async () => {
    let capturedWin = null;
    const origFocus = HTMLElement.prototype.focus;
    window.__cap = (w) => { capturedWin = w; };
    const origOpen = window.open;
    window.open = function () {
      const w = origOpen.call(window, '', '_blank');
      try { w.focus = function(){ window.__cap(w); }; } catch(e){}
      return w;
    };
    document.querySelector('#printBookletBtn').click();
    await new Promise(r=>setTimeout(r,12000));
    window.open = origOpen;
    const out = {};
    if (!capturedWin) { out.err = 'no win captured'; return out; }
    const w = capturedWin;
    out.readyState = w.document.readyState;
    out.sheets = w.document.querySelectorAll('.print-sheet').length;
    out.slots = w.document.querySelectorAll('.sticker-slot').length;
    out.stickers = w.document.querySelectorAll('.page-sticker').length;
    out.links = w.document.querySelectorAll('link[rel=stylesheet]').length;
    out.stylesheetCount = w.document.styleSheets.length;
    try { out.sheetHref = w.document.styleSheets[0] ? String(w.document.styleSheets[0].href) : 'none'; } catch(e){ out.sheetErr = String(e); }
    const pc = w.document.querySelector('.page-content');
    out.pcPos = pc ? getComputedStyle(pc).position : 'no-pc';
    out.slotVis = (()=>{const s=w.document.querySelector('.sticker-slot');return s?getComputedStyle(s).visibility:'none';})();
    out.fontsReady = !!(w.document.fonts);
    return out;
  });
  console.log(JSON.stringify(dbg,null,1));
  srv.kill(); await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
