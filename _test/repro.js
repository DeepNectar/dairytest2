const puppeteer = require('/workspace/node_modules/puppeteer');

(async () => {
  const browser = await puppeteer.launch({ executablePath:'/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  page.on('pageerror', e=>console.log('PAGEERROR:',e.message));
  await page.setRequestInterception(true);
  page.on('request', req=>{
    const u=req.url();
    if(u.indexOf('https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/')===0){
      req.continue({ url:'http://localhost:8766'+u.slice('https://unvomzolyjwcdavitdmr.supabase.co'.length) });
    } else req.continue();
  });
  // seed mock cloud with one user + entries incl. the oldest imported one
  const seed = async (table,row)=>{ await fetch('http://localhost:8766/rest/v1/'+table,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Array.isArray(row)?row:[row])}).then(r=>r.text()); };
  await seed('users',{email:'repro@t.com',name:'Repro',hash:'x',created:new Date().toISOString()});
  await seed('sessions',{email:'repro@t.com',updated_at:new Date().toISOString()});
  const sender='🫰🫶🏻Chota Don❣️❤️😘';
  await seed('entries',[
   {id:1,owner:'repro@t.com',title:'Message from '+sender,mood:'💌',sender,heading:'🎯 Dreams & Future Plans',
    date:'2026-01-02T03:01:00.000Z',words:30,
    body:sender+': "btw teh aa msg karyo but as u said k tu feb ma aais to tari jode kai nai bache right to how u will manage everything? maru mind j kam nai kartu yar 🥹"\nWhat I felt: She was genuinely worried about our plan and my finances — that anxiety in her words showed how much she cares about our future together.'},
   {id:2,owner:'repro@t.com',title:'Message from Deep',mood:'💬',sender:'Deep',heading:'☀️ Morning Chatter',date:'2026-01-03T03:01:00.000Z',words:20,body:'Deep: "good morning sunshine 😊"'},
   {id:3,owner:'repro@t.com',title:'Message from '+sender,mood:'💌',sender,heading:'☕ Random Late-Night Talks',date:'2026-01-04T03:01:00.000Z',words:20,body:sender+': "cannot sleep, tell me a story please 😴"'}
  ]);
  await page.goto('http://localhost:8901/index.html',{waitUntil:'networkidle2'}).catch(()=>{});
  await new Promise(r=>setTimeout(r,1200));
  await page.evaluate(()=>document.querySelector('#bookViewLink').click());
  await new Promise(r=>setTimeout(r,3000));
  const walk = async (page)=>{
    const total = parseInt(await page.evaluate(()=>document.querySelector('#spreadInfo').textContent.match(/\/\s*(\d+)/)[1]),10);
    for(let i=0;i<total;i++){
      const dump = await page.evaluate(()=>[document.querySelector('#leftContent').innerHTML, document.querySelector('#rightContent').innerHTML]);
      console.log('=== SPREAD', i, 'LEFT ===\n'+dump[0].replace(/></g,'>\n<'));
      console.log('=== SPREAD', i, 'RIGHT ===\n'+dump[1].replace(/></g,'>\n<'));
      await page.evaluate(()=>{const b=document.querySelector('#nextPageBtn'); if(b&&!b.disabled) b.click();});
      await new Promise(r=>setTimeout(r,600));
    }
  };
  const info = await page.evaluate(()=>{
    const lc=document.querySelector('#leftContent');
    return { spreadInfo: document.querySelector('#spreadInfo').textContent,
             firstBubble: lc ? (lc.querySelector('.entry-bubble')?lc.querySelector('.entry-bubble').outerHTML.slice(0,1500):'NO BUBBLE') : 'no left content',
             pages: document.querySelectorAll('#pageLeft,#pageRight').length };
  });
  console.log(JSON.stringify(info,null,2));
  await walk(page);
  await page.screenshot({path:'/tmp/repro1.png'});
  // dump html of the whole first two sheets
  const htmls = await page.evaluate(()=>[document.querySelector('#leftContent').innerHTML, document.querySelector('#rightContent').innerHTML]);
  require('fs').writeFileSync('/tmp/pages.json', JSON.stringify(htmls,null,1));
  await browser.close();
})();
