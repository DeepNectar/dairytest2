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
console.log('A:',fnCount('#7 - Message: [12 January 2026, 08:15 AM] - Deep: "hi"'));
console.log('B:',fnCount('Deep: "hi"'));
console.log('C:',fnCount('- Message: [12 January 2026, 08:15 AM] - Deep: "Good morning! Did you sleep well?"\nWhat I felt: Felt so happy seeing her message first thing.'));
