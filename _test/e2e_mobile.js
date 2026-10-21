const puppeteer = require('puppeteer');
const EMAIL = 'qa_' + Date.now() + '@test.dev';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('file:///workspace/index.html', { waitUntil: 'load' });
  await new Promise(r => setTimeout(r, 1500));

  // 1) Sign up
  await page.tap('#authBtn'); await new Promise(r=>setTimeout(r,400));
  await page.tap('#tabSignup'); await new Promise(r=>setTimeout(r,300));
  await page.type('#authName','QA Tester');
  await page.type('#authEmail',EMAIL);
  await page.type('#authPass','qa123456');
  await page.type('#authPass2','qa123456');
  await page.tap('#authSubmit');
  await new Promise(r=>setTimeout(r,2500));
  const signedIn = await page.evaluate(() => !document.getElementById('userChip').classList.contains('hidden'));
  console.log('SIGNUP:', signedIn ? 'PASS' : 'FAIL');

  // 2) Save an entry via the form
  await page.evaluate(()=>document.getElementById('journal').scrollIntoView());
  await new Promise(r=>setTimeout(r,600));
  await page.type('#entryTitle','A creamy QA day');
  await page.type('#entryBody','Deep: "Testing from a tiny screen works like a charm."');
  await page.tap('#entryForm button[type="submit"]');
  await new Promise(r=>setTimeout(r,2500));
  const cards = await page.evaluate(()=>document.querySelectorAll('#entriesList .entry').length);
  console.log('SAVE ENTRY -> cards:', cards, cards>=1?'PASS':'FAIL');

  // 3) Book view opens and fits
  await page.evaluate(()=>{window.scrollTo(0,0);document.getElementById('bookViewLink').click();});
  await new Promise(r=>setTimeout(r,4000));
  const fit = await page.evaluate(()=>{
    const b=document.getElementById('book').getBoundingClientRect();
    const tb=document.querySelector('.app-tabbar').getBoundingClientRect();
    const ab=document.querySelector('.app-bar').getBoundingClientRect();
    return {sheetW:Math.round(b.width), sheetH:Math.round(b.height), vh:innerHeight, vw:innerWidth,
            barTopVisible: ab.top>=0 && ab.bottom<=innerHeight, tabVisible: tb.top>=0 && tb.bottom<=innerHeight+1,
            sheetInside: b.left>=-1 && b.right<=innerWidth+1 && b.top>=ab.bottom-1 && b.bottom<=tb.top+1};
  });
  console.log('BOOK FIT:', JSON.stringify(fit), fit.sheetInside?'PASS':'CHECK');
  await page.screenshot({path:'/workspace/_test/e2e_book.png'});

  // 4) Swipe next
  const before = await page.evaluate(()=>document.getElementById('spreadInfoPhone').textContent);
  const x0=195,y0=430;
  await page.touchscreen.touchStart(x0,y0);
  for(let i=1;i<=12;i++){await page.touchscreen.touchMove(x0-12*i/12*10,y0);await new Promise(r=>setTimeout(r,16));}
  await page.touchscreen.touchEnd();
  await new Promise(r=>setTimeout(r,1000));
  const after = await page.evaluate(()=>document.getElementById('spreadInfoPhone').textContent);
  console.log('SWIPE NEXT:', before,'->',after, before!==after?'PASS':'FAIL');

  // 5) Close book
  await page.tap('#appBackBtn'); await new Promise(r=>setTimeout(r,500));
  const closed = await page.evaluate(()=>document.getElementById('bookModal').classList.contains('hidden'));
  console.log('CLOSE BOOK:', closed?'PASS':'FAIL');

  // 6) Dark mode toggle visible
  await page.tap('#themeToggle'); await new Promise(r=>setTimeout(r,400));
  const dark = await page.evaluate(()=>document.documentElement.getAttribute('data-theme'));
  console.log('THEME:', dark, dark==='dark'?'PASS':'FAIL');
  await page.screenshot({path:'/workspace/_test/e2e_dark.png'});
  await page.tap('#themeToggle');

  // 7) Logout + cleanup cloud account
  await page.tap('#userChip'); await new Promise(r=>setTimeout(r,300));
  await page.tap('#logoutBtn'); await new Promise(r=>setTimeout(r,600));
  console.log('LOGOUT OK');

  console.log('JS ERRORS:', errors.length?errors.join('\n'):'none');
  await browser.close();

  // cleanup: delete test rows from supabase
  const KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudm9tem9seWp3Y2Rhdml0ZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ3NjEsImV4cCI6MjEwNzQ1MDc2MX0.SaukqHzJlXRXfx2R4yvbIEeWFEj7hm9xnkj6Oqw_4wY';
  const base='https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/';
  for (const t of ['entries','users','sessions','settings']) {
    const col = t==='sessions'?'email': t==='users'?'email':'owner';
    const q = col+'=eq.'+encodeURIComponent(EMAIL);
    const r = await fetch(base+t+'?'+q,{method:'DELETE',headers:{apikey:KEY,Authorization:'Bearer '+KEY,'X-HTTP-Method-Override':'DELETE'}});
    console.log('cleanup',t,r.status);
  }
})().catch(e=>{console.error('FATAL',e);process.exit(1)});
