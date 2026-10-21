// Mock Supabase REST API for testing the book bookmark (save page & resume).
const http = require('http');
const users = []; // seeded dynamically from POSTs (signup flow)
let entries = [];
for (let i = 0; i < 40; i++) {
  const body = [];
  for (let j = 0; j < 8; j++) body.push('Line ' + j + ' of entry ' + i + ': a reasonably long diary sentence to force pagination across many sheets of the book.');
  entries.push({ id: 1000 + i, owner: 'booktest@d.com', title: 'Entry ' + i, body: body.join('\n'), mood: '🙂', sender: null, heading: null, date: new Date(Date.now() - i * 86400000).toISOString(), words: 120 });
}
const settings = []; // {owner,key,value}
function json(res, arr) { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(JSON.stringify(arr)); }
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
    const isDel = req.method === 'DELETE' || req.headers['x-method-override'] === 'DELETE';
    if (isDel) {
      if (table === 'settings') {
        const k = u.searchParams.get('key'); const o = u.searchParams.get('owner');
        for (let i = settings.length - 1; i >= 0; i--) {
          if ((!k || settings[i].key === decodeURIComponent(k)) && (!o || settings[i].owner === decodeURIComponent(o))) settings.splice(i, 1);
        }
      }
      res.writeHead(204); return res.end();
    }
    if (req.method === 'POST') {
      if (table === 'users') { try { JSON.parse(body).forEach(r => { const ex = users.find(x => x.email === r.email); if (ex) Object.assign(ex, r); else users.push(r); }); } catch (e) {} }
      if (table === 'entries') { try { JSON.parse(body).forEach(r => entries.push(r)); } catch (e) {} }
      if (table === 'settings') { try { JSON.parse(body).forEach(r => settings.push(r)); } catch (e) {} }
      res.writeHead(201, { 'Content-Type': 'application/json' }); return res.end('{}');
    }
    if (table === 'users') return json(res, users);
    if (table === 'sessions') return json(res, []);
    if (table === 'settings') {
      const o = decodeURIComponent(u.searchParams.get('owner') || '');
      const k = u.searchParams.get('key') ? decodeURIComponent(u.searchParams.get('key')) : null;
      return json(res, settings.filter(s => (!o || s.owner === o) && (!k || s.key === k)));
    }
    if (table === 'entries') {
      const owner = decodeURIComponent((u.searchParams.get('owner') || '')).toLowerCase();
      return json(res, entries.filter(e => !owner || e.owner.toLowerCase() === owner));
    }
    return json(res, []);
  });
});
server.listen(8766, () => console.log('bookmark mock up on 8766'));
