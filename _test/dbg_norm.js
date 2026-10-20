const M = require('./body_fns.js');
const CN = M.CHOTA_NAME;
const body = "&quot;" + CN + "&quot;: &quot;hello world&quot;";
console.log('input:', JSON.stringify(body));
// emulate step0
const pm = body.match(/^\s*["\u201c]?([^:\r\n"\"]{1,60}?)["\u201d]?\s*:\s/);
console.log('pm:', pm && JSON.stringify(pm[1]));
console.log('norm x1:', JSON.stringify(M.normaliseStoredBody(body, CN)));
