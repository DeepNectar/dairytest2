const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m','http.server','8908','--directory','/workspace'], { stdio:'ignore' });
  await new Promise(r=>setTimeout(r,700));
  await page.goto('http://localhost:8908/index.html', { waitUntil:'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('dairyWriting.users', JSON.stringify({ 't@t.com': { name:'T', hash:'' } }));
    const mk=(i,body)=>({id:'e'+i,date:Date.now()-(300-i)*86400000,body,sender:i%2?'Deep':'Chota'});
    const es=[]; for(let i=0;i<40;i++){let b='msg '+i+' '+('lorem ipsum dolor sit amet consectetur '.repeat(2+(i%7))); if(i%3===0)b+='\nWhat I felt: so much love in this one, feeling blessed beyond words today.'; es.push(mk(i,b));}
    localStorage.setItem('dairyWriting.entries.t@t.com', JSON.stringify(es));
    sessionStorage.setItem('dairyWriting.session','t@t.com');
  });
  await page.reload({waitUntil:'networkidle2'}).catch(()=>{});
  await new Promise(r=>setTimeout(r,600));
  await page.evaluate(()=>document.querySelector('#bookViewLink').click());
  await new Promise(r=>setTimeout(r,3000));
  const info = await page.evaluate(() => {
    // reach internals via a temporary hook: printBooklet is closure-private,
    // but we can replicate bake by calling the same code path through click w/ intercepted open.
    // Simpler: inspect bookPages indirectly — run the real flow with instrumentation:
    const out = { pages: null };
    // Instead directly test the clone-layout issue: build an offscreen clone like bake does
    const template = document.getElementById('pageLeft');
    const holder = document.createElement('div');
    holder.className = 'book print-mode';
    holder.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px;height:1123px;visibility:hidden;pointer-events:none;overflow:hidden;transform:none;margin:0;padding:0;border:0;';
    const clone = template.cloneNode(false);
    clone.removeAttribute('id');
    clone.innerHTML = '<div class="book-page-header"><div class="bph-title">t</div></div>' +
      '<div class="page-inner"><div class="page-content"><div class="page-flow">' +
      "<div class='entry-bubble eb-deep'><div class='eb-head'>x</div><div class='entry-body'>hello world</div></div>" +
      '<div class="sticker-slot" style="position:absolute;left:600px;top:100px;width:120px;height:120px;"></div>' +
      '</div></div></div>' +
      '<div class="book-page-footer"><span class="page-num"></span></div>';
    holder.appendChild(clone);
    document.body.appendChild(holder);
    const pc = clone.querySelector('.page-content');
    const inner = clone.querySelector('.page-inner');
    out.pcW = pc.clientWidth; out.pcH = pc.clientHeight;
    out.innerW = inner.clientWidth; out.innerH = inner.clientHeight;
    out.cloneH = clone.getBoundingClientRect().height;
    out.slotW = pc.querySelector('.sticker-slot').getBoundingClientRect().width;
    const cs = getComputedStyle(pc);
    out.pcDisplay = cs.display; out.pcPosition = cs.position;
    const fcs = getComputedStyle(clone);
    out.clonePos = fcs.position; out.cloneDisp = fcs.display; out.cloneOverflow = fcs.overflow;
    holder.remove();
    return out;
  });
  console.log(JSON.stringify(info,null,1));
  srv.kill(); await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
