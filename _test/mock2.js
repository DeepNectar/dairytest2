const http = require('http');
let entries = [];
let users = [];
let sessions = [];
const server = http.createServer((req,res)=>{
  const u=new URL(req.url,'http://x');
  const table=u.pathname.replace('/rest/v1/','');
  let body='';
  req.on('data',d=>body+=d);
  req.on('end',()=>{
    const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,PATCH,DELETE,OPTIONS'};
    if(req.method==='OPTIONS'){res.writeHead(204,cors);return res.end();}
    if(req.method==='POST'){
      if(table==='entries'){try{JSON.parse(body).forEach(r=>entries.push(r));}catch(e){}}
      if(table==='users'){try{JSON.parse(body).forEach(r=>users.push(r));}catch(e){}}
      if(table==='sessions'){try{JSON.parse(body).forEach(r=>sessions.push(r));}catch(e){}}
      res.writeHead(201,Object.assign({'Content-Type':'application/json'},cors));return res.end('{}');
    }
    if(req.method==='DELETE'){res.writeHead(204,cors);return res.end();}
    let data=[];
    if(table==='users')data=users;
    else if(table==='sessions')data=sessions;
    else if(table==='entries'){const owner=(u.searchParams.get('owner')||'');data=entries.filter(e=>!owner||e.owner===owner);}
    res.writeHead(200,Object.assign({'Content-Type':'application/json'},cors));
    res.end(JSON.stringify(data));
  });
});
server.listen(8766,()=>console.log('mock2 up'));
