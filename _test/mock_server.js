// Tiny mock of the Supabase REST API for testing delete flows.
const http = require('http');
let entries = [
  { id: 101, owner: 'pwtest@d.com', title: 'Keep me', body: 'hello one', mood: 'x', sender: null, date: new Date().toISOString(), words: 2 },
  { id: 102, owner: 'pwtest@d.com', title: 'Delete me', body: 'hello two', mood: 'y', sender: null, date: new Date().toISOString(), words: 2 },
];
const users = [];
const log = [];
function handleDelete(u) {
  const table = u.pathname.replace('/rest/v1/', '');
  const q = u.search;
  if (table === 'entries') {
    if (/owner=eq\.pwtest/.test(q)) entries = [];
    else {
      const m = q.match(/id=eq\.(\d+)/);
      if (m) entries = entries.filter(e => String(e.id) !== m[1]);
    }
  }
}
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const table = u.pathname.replace('/rest/v1/', '');
  let body = '';
  req.on('data', d => body += d);
  req.on('end', () => {
    const isDel = req.method === 'DELETE' || req.headers['x-method-override'] === 'DELETE';
    if (isDel) {
      log.push('DELETE ' + req.url);
      handleDelete(u);
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); return res.end();
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'Access-Control-Allow-Headers': '*' }); return res.end();
    }
    if (req.method === 'POST') {
      log.push('POST ' + req.url);
      if (table === 'users') { try { JSON.parse(body).forEach(r => users.push(r)); } catch (e) {} }
      res.writeHead(201, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); return res.end('{}');
    }
    log.push(req.method + ' ' + req.url);
    if (table === 'users') return json(res, users);
    if (table === 'entries') {
      const owner = decodeURIComponent((u.searchParams.get('owner') || ''));
      return json(res, entries.filter(e => !owner || e.owner === owner));
    }
    return json(res, []);
  });
});
function json(res, arr) { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(arr)); }
process.on('SIGUSR2', () => { console.log(JSON.stringify({ log, entries })); });
server.listen(8765, () => console.log('mock up'));
