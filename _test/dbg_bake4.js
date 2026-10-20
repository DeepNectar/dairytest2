const puppeteer = require('/workspace/node_modules/puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  const { spawn } = require('child_process');
  const srv = spawn('python3', ['-m','http.server','8917','--directory','/workspace'], { stdio:'ignore' });
  await new Promise(r=>setTimeout(r,700));
  await page.goto('http://localhost:8917/index.html', { waitUntil: 'domcontentloaded' });
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
  const dbg = await page.evaluate(async () => {
    let capturedWin = null;
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
    return { err: window.__printErr || null, stickers: capturedWin ? capturedWin.document.querySelectorAll('.page-sticker').length : -1 };
  });
  console.log(JSON.stringify(dbg,null,1));
  srv.kill(); await browser.close();
})().catch(e=>{console.error('FATAL',e);process.exit(1);});
