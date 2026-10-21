/* Diagnostic: reproduce the desktop flip-up mid-flight state exactly like
   phone_single_page_test.js does, and dump WHY the leaf may not animate. */
const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webmanifest": "application/manifest+json" };
const SUPA = "https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/";

const hash = "dairy-salt::" + "pass1234";
const h = crypto.createHash("sha256").update(Buffer.from(hash, "utf8")).digest("hex");
const EMAIL = "tester@d.com";
let entries = [];
for (let i = 1; i <= 40; i++) {
  entries.push({
    id: i, owner: EMAIL, title: "Day " + i,
    body: 'Deep: "MEMMARK' + i + ' memory number ' + i + ' of our beautiful story with plenty of words to fill many lines of this diary page so that it flows over several rows ❤️"',
    mood: "😊", sender: "Deep", heading: "💕 Romantic Confessions",
    date: new Date(Date.UTC(2026, 0, ((i - 1) % 28) + 1, 9, 0)).toISOString(), words: 120
  });
}
const users = [{ email: EMAIL, name: "Tester", hash: h, created: "2026-01-01T00:00:00.000Z" }];
const sessions = [{ email: EMAIL, updated_at: "2026-01-05T00:00:00.000Z" }];

const api = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const table = u.pathname.replace("/rest/v1/", "");
  let body = "";
  req.on("data", d => (body += d));
  req.on("end", () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (req.method === "POST") { res.writeHead(201); return res.end("{}"); }
    if (table === "users") return j(res, users);
    if (table === "sessions") return j(res, sessions);
    if (table === "settings") return j(res, []);
    if (table === "entries") {
      const owner = decodeURIComponent((u.searchParams.get("owner") || "").replace(/^eq\./, ""));
      return j(res, entries.filter(e => !owner || e.owner === owner).sort((a, b) => (a.date < b.date ? 1 : -1)));
    }
    return j(res, []);
  });
});
function j(res, arr) { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(arr)); }

const files = http.createServer((req, res) => {
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});

(async () => {
  await new Promise(r => api.listen(8791, r));
  await new Promise(r => files.listen(8345, r));

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  page.on("pageerror", e => console.log("PAGEERROR:", String(e)));
  await page.evaluateOnNewDocument(`
    (() => {
      const SUPA = ${JSON.stringify(SUPA)};
      const rf = window.fetch.bind(window);
      window.fetch = (input, init) => {
        let url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.indexOf(SUPA) === 0) return rf(url.replace(SUPA, "http://localhost:8791/rest/v1/"), init);
        return rf(input, init);
      };
      navigator.serviceWorker.getRegistration().then(r => r && r.unregister());
    })();
  `);

  await page.goto("http://localhost:8345/index.html", { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 1800));
  await page.evaluate(() => document.getElementById("bookViewLink").click());
  await page.waitForFunction(() => {
    const el = document.getElementById("leftContent");
    return el && el.innerHTML.length > 50;
  }, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));

  // ---- walk pages as the other test did ----
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => document.getElementById("tabNext").click());
    await new Promise(r => setTimeout(r, 120));
  }
  // ---- resize to desktop ----
  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
  await new Promise(r => setTimeout(r, 600));

  const pre = await page.evaluate(() => ({
    spreadTxt: document.getElementById("spreadInfo").textContent,
    bookPagesLen: (window.__bpProbe, undefined),
    prevDisabled: document.getElementById("prevPageBtn").disabled,
    nextDisabled: document.getElementById("nextPageBtn").disabled,
  }));
  console.log("PRE-FLIP:", JSON.stringify(pre));

  await page.evaluate(() => document.getElementById("nextPageBtn").click());
  await new Promise(r => setTimeout(r, 400));
  const mid = await page.evaluate(() => {
    const leaf = document.getElementById("leaf");
    const fp = document.getElementById("leafFront");
    const bp = document.getElementById("leafBack");
    const cs = getComputedStyle(leaf);
    return {
      cls: leaf.className,
      display: cs.display,
      animationName: cs.animationName,
      transform: cs.transform,
      frontLen: (fp.textContent || "").trim().length,
      backHTML: bp.innerHTML.trim().slice(0, 120),
      backTextLen: (bp.textContent || "").trim().length,
      info: document.getElementById("spreadInfo").textContent,
    };
  });
  console.log("MID-FLIGHT:", JSON.stringify(mid, null, 2));
  await new Promise(r => setTimeout(r, 600));
  const post = await page.evaluate(() => ({
    cls: document.getElementById("leaf").className,
    info: document.getElementById("spreadInfo").textContent,
  }));
  console.log("POST:", JSON.stringify(post));

  await browser.close();
  api.close(); files.close();
  process.exit(0);
})().catch(e => { console.error("CRASH:", e); process.exit(2); });
