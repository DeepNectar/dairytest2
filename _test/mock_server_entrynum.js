// Mock Supabase REST API that records every POSTed entry row, so tests can
// verify what actually reaches the cloud (Supabase) during an import.
const http = require('http');
let entries = [];
const users = [];
const posted = [];   // every row ever POSTed to /entries
global.__posted = () => posted;
const server = http.createServer((req, res) => {
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
    if (req.method === 'POST') {
      if (table === 'users') { try { JSON.parse(body).forEach(r => users.push(r)); } catch (e) {} }
      if (table === 'entries') { try { JSON.parse(body).forEach(r => { posted.push(r); entries.push(r); }); } catch (e) {} }
      res.writeHead(201, { 'Content-Type': 'application/json' }); return res.end('{}');
    }
    if (req.method === 'DELETE') {
      const m = u.search.match(/id=eq\.(\d+)/);
      if (m) entries = entries.filter(e => String(e.id) !== m[1]);
      else if (/owner=eq\./.test(u.search)) entries = [];
      res.writeHead(204); return res.end();
    }
    // GET
    if (table === 'users') return json(res, users);
    if (table === 'sessions') return json(res, []);
    if (table === 'settings') return json(res, []);
    if (table === 'entries') {
      const owner = decodeURIComponent((u.searchParams.get('owner') || '').replace('eq.', ''));
      return json(res, entries.filter(e => !owner || e.owner === owner));
    }
    return json(res, []);
  });
});
function json(res, arr) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(arr)); }
process.on('SIGUSR2', () => console.log(JSON.stringify({ posted })));
server.listen(8766, () => console.log('mock up on 8766'));
