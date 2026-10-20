const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  page.on('console', m => console.log('CONSOLE:', m.text()));
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m','http.server','8913','--directory','/workspace'], { stdio:'ignore' });
  await new Promise(r=>setTimeout(r,700));
  await page.goto('http://localhost:8913/index.html', { waitUntil: 'domcontentloaded' });
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

  // instrument the app's own decoratePrintSheets indirectly: patch preloadImage? Instead run print and poll iframe internals.
  const dbg = await page.evaluate(async () => {
    const ifr = document.createElement('iframe');
    ifr.style.cssText='position:fixed;left:0;top:0;width:1000px;height:1400px;border:0';
    document.body.appendChild(ifr);
    await new Promise(r=>{ifr.onload=r; ifr.src='about:blank';});
    const w = ifr.contentWindow;
    w.print = function(){ w.__printed = true; };
    window.open = () => w;
    document.querySelector('#printBookletBtn').click();
    await new Promise(r=>setTimeout(r,9000));
    const out = {};
    try {
      out.sheets = w.document.querySelectorAll('.print-sheet').length;
      out.slots = w.document.querySelectorAll('.sticker-slot').length;
      out.stickers = w.document.querySelectorAll('.page-sticker').length;
      const slot = w.document.querySelector('.sticker-slot');
      if (slot) {
        out.slotInline = slot.getAttribute('style');
        const r = slot.getBoundingClientRect();
        out.slotRect = {w:r.width,h:r.height,x:r.left,y:r.top};
        out.offParent = slot.offsetParent ? slot.offsetParent.className : null;
      }
      out.pcPos = (()=>{const pc=w.document.querySelector('.page-content');return pc?getComputedStyle(pc).position:null;})();
      out.toast = Array.from(document.querySelectorAll('*')).some(el=>el.textContent && el.textContent.includes('stickers on'));
      const tEl = document.querySelector('.toast, #toast');
      out.toastText = tEl ? tEl.textContent : null;
    } catch(e){ out.err = String(e); }
    return out;
  });
  console.log(JSON.stringify(dbg,null,1));
  srv.kill(); await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
