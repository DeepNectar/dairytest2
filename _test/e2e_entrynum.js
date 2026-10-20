// E2E: paste the numbered template, import, and inspect the rows that were
// POSTed to the (mock) Supabase — numbers/labels/dates must never be stored.
const http = require('http');
const puppeteer = require('/workspace/node_modules/puppeteer');

// tiny mock supabase on 8765 recording every POSTed entry row
const posted = [];
let entries = [];
const users = [];
const srv = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const table = u.pathname.replace('/rest/v1/', '');
  let body = '';
  req.on('data', d => body += d);
  req.on('end', () => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      return res.end();
    }
    if (req.method === 'POST' && table === 'entries') { try { JSON.parse(body).forEach(r => { posted.push(r); entries.push(r); }); } catch(e){} return res.writeHead(201), res.end('{}'); }
    if (req.method === 'POST' && table === 'users') { try { const rs = JSON.parse(body); rs.forEach(u => { if (!users.some(x => x.email === u.email)) users.push(u); }); } catch(e){} return res.writeHead(201), res.end('[]'); }
    if (req.method === 'PATCH' && table === 'users') { const email = decodeURIComponent((u.searchParams.get('email')||'').replace('eq.','')); try { const patch = JSON.parse(body); const found = users.find(x => x.email === email); if (found) Object.assign(found, patch); else users.push(Object.assign({ email }, patch)); } catch(e){} return res.writeHead(200), res.end('[]'); }
    if (req.method === 'DELETE') {
      const m = u.search.match(/id=eq\.(\d+)/);
      if (m) entries = entries.filter(e => String(e.id) !== m[1]);
      else if (/owner=eq\./.test(u.search)) entries = [];
      return res.writeHead(204), res.end();
    }
    if (table === 'users') { res.writeHead(200, {'Content-Type':'application/json'}); return res.end(JSON.stringify(users)); }
    if (table === 'entries') {
      const owner = decodeURIComponent((u.searchParams.get('owner') || '').replace('eq.', ''));
      return res.writeHead(200, {'Content-Type':'application/json'}), res.end(JSON.stringify(entries.filter(e => !owner || e.owner === owner)));
    }
    res.writeHead(200, {'Content-Type':'application/json'}); res.end('[]');
  });
});

(async () => {
  await new Promise(r => srv.listen(8765, r));
  const browser = await puppeteer.launch({ executablePath: '/root/.cache/puppeteer/chrome-headless-shell/linux-148.0.7778.97/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));
  // route the real supabase URL to the mock
  await page.setRequestInterception(true);
  page.on('request', (rq) => {
    const url = rq.url();
    if (url.includes('unvomzolyjwcdavitdmr.supabase.co')) {
      rq.continue({ url: url.replace('https://unvomzolyjwcdavitdmr.supabase.co', 'http://127.0.0.1:8765') });
    } else rq.continue();
  });
  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.getElementById('authBtn').click());
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => document.getElementById('tabSignup').click());
  await new Promise(r => setTimeout(r, 300));
  await page.type('#authName', 'QA Bot', { delay: 1 });
  await page.type('#authEmail', 'qa.entrynum@dairy.app', { delay: 1 });
  await page.type('#authPass2', 'TestPass123!', { delay: 1 });
  await page.type('#authPass', 'TestPass123!', { delay: 1 });
  await page.evaluate(() => document.getElementById('authForm').requestSubmit());
  await new Promise(r => setTimeout(r, 1500));

  // grab the REAL template from the page (what Copy Template gives) and paste it
  const tpl = await page.evaluate(() => document.getElementById('templateBox').textContent);
  if (!/#1 - Message:/.test(tpl)) throw new Error('template in page is not numbered!');
  await page.evaluate((t) => { document.getElementById('importArea').value = t; }, tpl);
  await page.evaluate(() => document.getElementById('importBtn').click());
  await new Promise(r => setTimeout(r, 3000));

  console.log('rows POSTed to Supabase:', posted.length);
  const bad = posted.filter(p => /Message\s*:|\[\d{1,2} .*\]|#\d|^\d+[.)]/i.test(p.body) || /\d+ - /.test(p.body));
  posted.forEach(p => console.log(' id=' + p.id, '| words=' + p.words, '| body=' + JSON.stringify(p.body.slice(0, 70))));
  if (bad.length) throw new Error('number/label/date leaked into stored rows: ' + JSON.stringify(bad.map(b=>b.body)));
  const msgRows = posted.filter(p => /^🫰🫶🏻Chota Don❣️❤️😘|^Deep/.test(p.body));
  if (msgRows.length < 6) throw new Error('expected 6 message entries stored, got ' + msgRows.length);
  if (msgRows.some(p => !(p.words > 0))) throw new Error('entry word count missing/zero for some rows');
  // FIRST-ENTRY DATE CHECK: entry #1 must carry the sheet's own date (12 Jan
  // 2026 08:15), NOT import time — same format as every other entry.
  const dated = posted.filter(p => /^🫰🫶🏻Chota Don❣️❤️😘|^Deep/.test(p.body));
  const byId = dated.slice().sort((a,b)=>String(a.id).localeCompare(String(b.id)));
  console.log('dates (sheet order):', byId.map(p=>p.date).join(' | '));
  const first = new Date(byId[0].date);
  if (!(first.getFullYear()===2026 && first.getMonth()===0 && first.getDate()===12)) throw new Error('first entry date wrong: ' + byId[0].date);
  const lastMsg = new Date(byId[byId.length-1].date);
  if (!(lastMsg.getFullYear()===2026 && lastMsg.getMonth()===0 && lastMsg.getDate()===13)) throw new Error('last entry date wrong: ' + byId[byId.length-1].date);
  if (byId.some((p,i,arr)=> i && new Date(p.date) < new Date(arr[i-1].date))) throw new Error('entries out of chronological order');
  console.log('FIRST-ENTRY DATE E2E OK ✓');
  console.log('E2E ENTRY-NUMBER TEST PASSED ✓ (numbers stripped before Supabase, per-entry words counted)');
  await browser.close();
  srv.close();
})().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
