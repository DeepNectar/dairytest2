const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../script.js','utf8');
function extract(name){
  const s=src.indexOf('function '+name);
  let i=src.indexOf('{',s),d=0;
  for(let j=i;j<src.length;j++){
    if(src[j]==='{')d++;
    else if(src[j]==='}'){d--;if(d===0)return src.slice(s,j+1);}
  }
}
const fnCount=eval('('+extract('countWords')+')');
const cases=[
 ["prose","Today was wonderful. We talked for hours about everything and nothing.",12],
 ["sender-quoted",'Deep: "Good morning! Did you sleep well?"',6],
 ["chota-quoted",'🫰🫶🏻Chota Don❣️❤️😘: "Sorry jaan, was stuck in work!"',7],
 ["felt-line","What I felt: Even an apology from her feels like a hug.",9],
 ["note-line","Note: She hasn't replied to this message yet.",7],
 ["tpl-full",'#7 - Message: [12 January 2026, 08:15 AM] - Deep: "Good morning! Did you sleep well?"\nWhat I felt: Felt so happy seeing her message first thing.',14],
 ["stored-full",'Deep: "Good morning! Did you sleep well?"\nWhat I felt: Felt so happy seeing her message first thing.',14],
 ["bare-date",'"[12 January 2026, 08:15 AM] Deep: \\"hi\\""',0], // informational
 ["colon-prose","She said: hello world",4],
];
let ok=true;
for(const [name,inp,exp] of cases){
  const got=fnCount(inp);
  const mark = (exp<0||got===exp)?'OK ':'BAD';
  if(exp>=0&&got!==exp)ok=false;
  console.log(mark,name,'got='+got,'exp='+exp);
}
process.exit(ok?0:1);
