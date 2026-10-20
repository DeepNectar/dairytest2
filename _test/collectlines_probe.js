// PROBE: in the real app page, run collectLines-equivalent logic against the
// measure host and check whether line units break words.
const puppeteer = require('/workspace/node_modules/puppeteer');
const EXE = '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome';
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXE, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await (await browser.createBrowserContext()).newPage();
  await page.setViewport({ width: 1500, height: 1000 });
  await page.goto('file:///workspace/index.html', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  const res = await page.evaluate(() => {
    const mp = document.querySelector('#measureHost .page-content') || document.querySelector('.page-content');
    if (!mp) return { err: 'no host yet (needs book open?)' };
    const text = "It was just a normal day and I just received an request on Shadi.Com and started talking and later after few time she given me her number and told me to come on WhatsApp and we started talking and within 2 days we she told me yes on 17th December 2025 and then we started our journey";
    const holder = document.createElement("div");
    holder.className = "entry-body";
    holder.style.cssText = "position:absolute;left:-99999px;top:0;width:" + Math.max(50, mp.clientWidth - 56) + "px;margin:0;padding:0;border:0;";
    holder.textContent = text;
    mp.appendChild(holder);
    const cs = getComputedStyle(holder);
    // count rendered lines of the span
    const rng = document.createRange();
    rng.selectNodeContents(holder);
    const rects = Array.from(rng.getClientRects()).filter(r=>r.width>1||r.height>1);
    const tops = [...new Set(rects.map(r=>Math.round(r.top)))];
    const out = { hostWidth: mp.clientWidth, holderWidth: holder.getBoundingClientRect().width, fontSize: cs.fontSize, lineHeight: cs.lineHeight, whiteSpace: cs.whiteSpace, wordBreak: cs.wordBreak, nLines: tops.length };
    mp.removeChild(holder);
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
})();
