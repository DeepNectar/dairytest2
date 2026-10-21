/* E2E: PHONE upward note-flip must be FRONT-SIDE-ONLY.
   - during a flip exactly one .phone-ghost exists, containing NO leaf-back /
     second face; it shows the CURRENT page's entries (front), hinged at the
     TOP edge with the phoneFlipUp rotateX animation
   - the real book is hidden underneath while the ghost flies
   - after the animation the ghost is removed and Page 2 shows its preview
   - Prev uses phoneFlipDown (also front-only) and returns to Page 1
   - CSS keyframes/rules exist; no page errors                     */
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
// a FINAL-SUMMARY entry — must NEVER leak into the book preview (count rule)
entries.push({
  id: 999, owner: EMAIL, title: "Wrap up",
  body: 'Deep: "SUMMARK final recap of our month together with lots and lots of summary words to try to fill rows ❤️"',
  mood: "🥲", sender: "Deep", heading: "📌 FINAL SUMMARY",
  date: new Date(Date.UTC(2026, 0, 29, 9, 0)).toISOString(), words: 120
});
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
  await new Promise(r => api.listen(8779, r));
  await new Promise(r => files.listen(8333, r));

  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  await page.evaluateOnNewDocument(`
    (() => {
      const SUPA = ${JSON.stringify(SUPA)};
      const rf = window.fetch.bind(window);
      window.fetch = (input, init) => {
        let url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.indexOf(SUPA) === 0) return rf(url.replace(SUPA, "http://localhost:8779/rest/v1/"), init);
        return rf(input, init);
      };
      // hard-kill the service worker so tests always run the CURRENT code
      navigator.serviceWorker.getRegistration().then(r => r && r.unregister());
    })();
  `);

  await page.goto("http://localhost:8333/index.html", { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 1800)); // init() auto-resumes session

  const results = [];
  const check = (name, ok, extra) => { results.push([name, !!ok]); console.log((ok ? "PASS" : "FAIL") + " - " + name + (extra ? " | " + extra : "")); };

  const signedIn = await page.evaluate(() => {
    const chip = document.getElementById("userChip");
    return chip && !chip.classList.contains("hidden");
  });
  check("signed in via mock cloud", signedIn);

  await page.evaluate(() => document.getElementById("bookViewLink").click());
  await page.waitForFunction(() => {
    const el = document.getElementById("leftContent");
    return el && el.innerHTML.length > 50;
  }, { timeout: 20000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 500));

  const p1 = await page.evaluate(() => ({
    info: document.getElementById("spreadInfoPhone").textContent,
    num: document.getElementById("leftNum").textContent,
    txt: (document.querySelector("#leftContent").textContent || "").slice(0, 60)
  }));
  check("phone opens at Page 1 with entry preview", /Page 1 \/ \d+/.test(p1.info) && p1.num === "1" && /MEMMARK\d+/.test(p1.txt), JSON.stringify(p1));

  // helper: horizontal swipe on the stage (left = next, right = prev)
  async function swipe(dx) {
    const x0 = 195, y0 = 420;
    await page.touchscreen.touchStart(x0, y0);
    for (let i = 1; i <= 10; i++) { await page.touchscreen.touchMove(x0 + dx * i / 10, y0); await new Promise(r => setTimeout(r, 12)); }
    await page.touchscreen.touchEnd();
  }

  await page.evaluate(() => document.getElementById("tabNext").click()); // NEXT
  await new Promise(r => setTimeout(r, 150));
  const mid = await page.evaluate(() => {
    const ghosts = document.querySelectorAll(".phone-ghost");
    const g = ghosts[0];
    let gi = null;
    if (g) {
      gi = {
        faces: g.querySelectorAll(".leaf-back, .leaf-face").length,
        origin: getComputedStyle(g).transformOrigin,
        anim: getComputedStyle(g).animationName,
        visibleText: ((g.querySelector(".page-content") || {}).textContent || "").slice(0, 60),
        pageNum: ((g.querySelector(".page-num") || {}).textContent || ""),
        backface: getComputedStyle(g).backfaceVisibility
      };
    }
    const bookHidden = document.getElementById("book").classList.contains("phone-sheet-hidden");
    const l = document.getElementById("leaf");
    const leafActive = !!(l && (l.classList.contains("flipping-forward") || l.classList.contains("flipping-back")));
    return { n: ghosts.length, gi, bookHidden, leafActive };
  });
  check("exactly one ghost sheet during flip", mid.n === 1, String(mid.n));
  check("ghost carries NO back face (front side only)", mid.gi && mid.gi.faces === 0, JSON.stringify(mid.gi));
  check("ghost hinges on TOP edge → upward rotation", mid.gi && /top/.test(mid.gi.origin), mid.gi && mid.gi.origin);
  check("ghost runs phoneFlipUp animation", mid.gi && mid.gi.anim === "phoneFlipUp", mid.gi && mid.gi.anim);
  check("ghost shows CURRENT page-1 content on its front", mid.gi && /MEMMARK\d+/.test(mid.gi.visibleText) && mid.gi.pageNum === "1", mid.gi && JSON.stringify([mid.gi.visibleText, mid.gi.pageNum]));
  check("real book hidden underneath mid-flight", mid.bookHidden === true);
  check("desktop double-sided leaf NOT used on phone", mid.leafActive === false);

  await new Promise(r => setTimeout(r, 900));
  const after = await page.evaluate(() => ({
    ghosts: document.querySelectorAll(".phone-ghost").length,
    hidden: document.getElementById("book").classList.contains("phone-sheet-hidden"),
    info: document.getElementById("spreadInfoPhone").textContent,
    num: document.getElementById("leftNum").textContent,
    txt: (document.querySelector("#leftContent").textContent || "").slice(0, 60)
  }));
  check("ghost cleaned up after animation", after.ghosts === 0 && !after.hidden, JSON.stringify({ g: after.ghosts, h: after.hidden }));
  check("advanced to Page 2 with proper entry preview", /Page 2 \/ \d+/.test(after.info) && after.num === "2" && /MEMMARK\d+/.test(after.txt), JSON.stringify(after));

  await page.evaluate(() => document.getElementById("tabPrev").click()); // PREV
  await new Promise(r => setTimeout(r, 150));
  const midPrev = await page.evaluate(() => {
    const g = document.querySelector(".phone-ghost");
    return g ? { anim: getComputedStyle(g).animationName, faces: g.querySelectorAll(".leaf-back,.leaf-face").length, origin: getComputedStyle(g).transformOrigin } : null;
  });
  check("prev flip also front-only (phoneFlipDown)", midPrev && midPrev.anim === "phoneFlipDown" && midPrev.faces === 0, JSON.stringify(midPrev));
  await new Promise(r => setTimeout(r, 900));
  const back1 = await page.evaluate(() => document.getElementById("spreadInfoPhone").textContent);
  check("returned to Page 1 after prev", /Page 1 \/ \d+/.test(back1), back1);

  // CSS presence — read the stylesheet TEXT directly (robust vs. media-rule
  // nesting quirks in older headless Chromium cssRules iteration)
  const cssTxt = await page.evaluate(async () => {
    const r = await fetch("style.css");
    return r.text();
  });
  check("keyframes phoneFlipUp present in style.css", /@keyframes phoneFlipUp\b/.test(cssTxt));
  check("keyframes phoneFlipDown present in style.css", /@keyframes phoneFlipDown\b/.test(cssTxt));
  check(".phone-ghost rules present in style.css", (cssTxt.match(/\.phone-ghost/g) || []).length >= 3);
  check("ghost hinges on TOP edge in CSS", /\.phone-ghost\s*\{[^}]*transform-origin:\s*center top/.test(cssTxt.replace(/\s*\/\*[\s\S]*?\*\//g, "")));

  // walk ALL pages: every numbered page must show a real preview; summary must never appear
  const walk = await page.evaluate(() => new Promise(resolve => {
    const seen = [];
    let leaks = 0, blanks = 0;
    const total = parseInt((document.getElementById("spreadInfoPhone").textContent.match(/\/ (\d+)/) || [])[1], 10);
    document.getElementById("tabPrev").click(); // back to page 1 first
    setTimeout(() => {
      const step = () => {
        const num = document.getElementById("leftNum").textContent;
        const txt = document.querySelector("#leftContent").textContent || "";
        seen.push(num);
        if (/SUMMARK/.test(txt)) leaks++;
        if (txt.trim().replace(/=/g, "").trim().length < 5 && Number(num) > 1) blanks++;
        if (Number(num) >= total) return resolve({ seen, leaks, blanks, total });
        document.getElementById("tabNext").click();
        setTimeout(step, 40); // shorter than flip duration → clicks queue safely
      };
      step();
    }, 700);
  }));
  check("page numbers run 1..N contiguously", walk.seen.join(",") === Array.from({ length: walk.total }, (_, i) => String(i + 1)).join(","), walk.seen.slice(0, 6).join(",") + " …" + walk.seen.slice(-2).join(","));
  check("📌 FINAL SUMMARY entry never appears in book preview", walk.leaks === 0, "leaks=" + walk.leaks);
  check("every page shows an entry preview (no blank pages)", walk.blanks === 0, "blanks=" + walk.blanks);

  await page.screenshot({ path: path.join(__dirname, "flip_front_only_page1.png") });
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  const fails = results.filter(r => !r[1]).length;
  console.log("\n=== SUMMARY: " + (results.length - fails) + "/" + results.length + " passed ===");
  await browser.close();
  api.close(); files.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("TEST CRASH:", e); process.exit(2); });
