const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const puppeteer = require('/workspace/node_modules/puppeteer');

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

(async () => {
  const mock = spawn('node', [path.join(__dirname, 'mock_server.js')], { stdio: ['ignore', 'pipe', 'inherit'] });
  let mockOut = '';
  mock.stdout.on('data', d => mockOut += d);
  await new Promise(r => setTimeout(r, 400));

  const srv = http.createServer((req, res) => {
    const file = req.url === '/' ? '/index.html' : req.url.split('?')[0];
    const p = path.join('/workspace', file);
    if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); }
    let data = fs.readFileSync(p);
    if (file.endsWith('.html')) {
      const inj = '<script src="/_test/fetch_override.js"></script>';
      data = Buffer.from(data.toString().replace('<script src="script.js"></script>', inj + '<script src="script.js"></script>'));
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    res.end(data);
  });
  await new Promise(r => srv.listen(8907, () => r()));

  let browser;
  try {
  browser = await puppeteer.launch({ executablePath: '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome', args: ['--no-sandbox', '--disable-setuid-sandbox'], protocolTimeout: 30000 });
  const page = await browser.newPage();
  await page.setDefaultTimeout(15000);
  await page.setViewport({ width: 1400, height: 1000 });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto('http://127.0.0.1:8907/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => console.log('goto warn:', e.message));
  await new Promise(r => setTimeout(r, 800));

  // Sign up pwtest@d.com through the UI
  await page.evaluate(() => document.querySelector('#authBtn').click());
  await new Promise(r => setTimeout(r, 300));
  await page.click('#tabSignup');
  await page.type('#authName', 'PW Tester');
  await page.type('#authEmail', 'pwtest@d.com');
  await page.type('#authPass', 'abcdef');
  await page.type('#authPass2', 'abcdef');
  await page.click('#authSubmit');
  await new Promise(r => setTimeout(r, 1200));
  console.log('signed-in:', await page.evaluate(() => !document.querySelector('#userChip').classList.contains('hidden')));
  console.log('entries listed:', await page.evaluate(() => document.querySelectorAll('.entry').length));

  const clicked = await page.evaluate(() => {
    const b = document.querySelector('.del[data-id="102"]');
    if (b) { b.click(); return true; } return false;
  });
  console.log('delete btn clicked:', clicked);
  console.log('modal open:', await page.evaluate(() => !document.querySelector('#deleteModal').classList.contains('hidden')));

  await page.type('#deletePass', 'wrongpass');
  await page.click('#deleteConfirmBtn');
  await new Promise(r => setTimeout(r, 400));
  console.log('error after wrong pass:', await page.evaluate(() => document.querySelector('#deleteError').textContent));
  console.log('modal still open:', await page.evaluate(() => !document.querySelector('#deleteModal').classList.contains('hidden')));
  console.log('entry 102 still in list:', await page.evaluate(() => !!document.querySelector('.del[data-id="102"]')));

  await page.evaluate(() => { document.querySelector('#deletePass').value = ''; });
  await page.type('#deletePass', 'DeepuH@2805');
  await page.click('#deleteConfirmBtn');
  await new Promise(r => setTimeout(r, 1000));
  console.log('modal closed:', await page.evaluate(() => document.querySelector('#deleteModal').classList.contains('hidden')));
  console.log('remaining entries:', await page.evaluate(() => Array.from(document.querySelectorAll('.del')).map(b => b.dataset.id)));

  await page.click('#deleteAllBtn');
  await new Promise(r => setTimeout(r, 300));
  await page.type('#deletePass', 'DeepuH@2805');
  await page.click('#deleteConfirmBtn');
  await new Promise(r => setTimeout(r, 1000));
  console.log('entries left after delete-all:', await page.evaluate(() => document.querySelectorAll('.entry').length));

  } finally {
    if (browser) await browser.close().catch(()=>{});
    mock.kill('SIGUSR2');
    await new Promise(r => setTimeout(r, 300));
    mock.kill();
    srv.close();
  }
  const line = mockOut.split('\n').filter(l => l.startsWith('{'))[0] || '{}';
  const parsed = JSON.parse(line);
  console.log('--- MOCK SERVER ---');
  console.log('DELETE requests seen:');
  (parsed.log || []).forEach(l => { if (l.startsWith('DELETE')) console.log('  ', l); });
  console.log('final entries on server:', JSON.stringify(parsed.entries));
  process.exit(0);
})().catch(e => { console.error('TEST FAIL:', e.message); process.exit(1); });
