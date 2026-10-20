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
// regression: plain diary prose typed in the manual editor must count ALL words
console.log('prose:', fnCount("Today was wonderful. We talked for hours about everything and nothing.")); // expect 12
console.log('quoted-line:', fnCount('Deep: "Good morning! Did you sleep well?"')); // expect 6 (msg words only? or sender too?)
console.log('mixed:', fnCount("Dear Diary\nShe said: hello world")); // expect 7
