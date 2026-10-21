/* Verifies the Install App button + service worker wiring on mobile & desktop. */
const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webmanifest": "application/manifest+json" };

const server = http.createServer((req, res) => {
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise((r) => server.listen(8321, r));
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

  async function scenario(name, viewport, ua, dispatchBIP) {
    const page = await browser.newPage();
    await page.setUserAgent(ua);
    await page.setViewport(viewport);
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto("http://localhost:8321/index.html", { waitUntil: "load" });

    if (dispatchBIP) {
      // Simulate Chromium firing beforeinstallprompt with a stub prompt object.
      await page.evaluate(() => {
        const ev = new Event("beforeinstallprompt");
        ev.prompt = () => {};
        ev.userChoice = Promise.resolve({ outcome: "accepted" });
        window.__bipFired = true;
        window.dispatchEvent(ev);
      });
      await new Promise((r) => setTimeout(r, 100));
    }

    const state = await page.evaluate(() => {
      const ib = document.getElementById("installBtn");
      const ti = document.getElementById("tabInstall");
      const vis = (el) => el && getComputedStyle(el).display !== "none";
      return {
        installBtnVisible: vis(ib),
        tabInstallInDom: !!ti,
        swRegistered: !!navigator.serviceWorker.controller || (navigator.serviceWorker.getRegistrations ? true : false),
      };
    });

    // SW registration check via the actual registration API
    const regOk = await page.evaluate(async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.length > 0;
      } catch { return false; }
    });

    console.log(`[${name}]`, JSON.stringify({ ...state, swRegActive: regOk, pageErrors: errors }, null, 0));
    await page.screenshot({ path: path.join(__dirname, `install_${name}.png`) });
    await page.close();
  }

  const PHONE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36";
  const IOS_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

  await scenario("android_bip", { width: 412, height: 915, isMobile: true }, PHONE_UA, true);
  await scenario("ios_safari", { width: 390, height: 844, isMobile: true }, IOS_UA, false);
  await scenario("desktop_chrome", { width: 1280, height: 900 }, DESKTOP_UA, true);

  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
