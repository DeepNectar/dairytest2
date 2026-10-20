const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m','http.server','8921','--directory','/workspace'], { stdio:'ignore' });
  await new Promise(r=>setTimeout(r,700));
  await page.goto('http://localhost:8921/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dairyWriting.users', JSON.stringify({ 't@t.com': { name:'T', hash:'' } }));
    const mk=(i,body)=>({id:'e'+i,date:Date.now()-(300-i)*86400000,body,sender:i%2?'Deep':'Chota'});
    const es=[]; for(let i=0;i<40;i++){let b='msg '+i+' '+('lorem ipsum dolor sit amet consectetur '.repeat(2+(i%7))); if(i%3===0)b+='\nWhat I felt: so much love in this one, feeling blessed beyond words today.'; es.push(mk(i,b));}
    localStorage.setItem('dairyWriting.entries.t@t.com', JSON.stringify(es));
    sessionStorage.setItem('dairyWriting.session','t@t.com');
  });
  await page.reload({ waitUntil:'networkidle2' }).catch(()=>{});
  await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>document.querySelector('#bookViewLink').click());
  await new Promise(r=>setTimeout(r,3000));
  const dbg = await page.evaluate(async () => {
    const ifr = document.createElement('iframe');
    ifr.style.cssText='position:fixed;left:0;top:0;width:1000px;height:1400px;border:0;visibility:hidden';
    document.body.appendChild(ifr);
    await new Promise(r=>{ifr.onload=r; ifr.src='about:blank';});
    const w = ifr.contentWindow;
    w.print = function(){ w.__printed = true; };
    window.open = () => w;
    document.querySelector('#printBookletBtn').click();
    await new Promise(r=>setTimeout(r,15000));
    const out = { printed: !!w.__printed, err: window.__printErr || null, bakeDbg: window.__bakeDbg || 'undef',
      stickers: w.document.querySelectorAll('.page-sticker').length,
      slots: w.document.querySelectorAll('.sticker-slot').length,
      sheets: w.document.querySelectorAll('.print-sheet').length };
    // sample slot inline styles + pc rect of first sheet
    const sheet = w.document.querySelector('.print-sheet');
    if (sheet) {
      const pc = sheet.querySelector('.page-content');
      out.pcRect = pc ? { l: Math.round(pc.getBoundingClientRect().left), t: Math.round(pc.getBoundingClientRect().top), w: Math.round(pc.getBoundingClientRect().width), h: Math.round(pc.getBoundingClientRect().height) } : null;
      const sl = pc ? pc.querySelector('.sticker-slot') : null;
      out.slotStyle = sl ? sl.getAttribute('style') : null;
      out.flowPresent = !!(pc && pc.querySelector(':scope > .page-flow'));
      const fl = pc && pc.querySelector(':scope > .page-flow');
      out.flowPadTop = fl ? getComputedStyle(fl).paddingTop : null;
      out.flowRect = fl ? { l: Math.round(fl.getBoundingClientRect().left), t: Math.round(fl.getBoundingClientRect().top) } : null;
    }
    ifr.remove();
    return out;
  });
  console.log(JSON.stringify(dbg,null,1));
  srv.kill(); await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
