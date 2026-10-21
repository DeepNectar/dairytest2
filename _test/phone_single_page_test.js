/* E2E: PHONE BOOK VIEW = PLAIN SINGLE PAGES (NOT a flip book).
   - phone mode class applied; only ONE sheet visible (.page-right hidden)
   - Prev/Next tabs are VISIBLE buttons on phones
   - Next instantly swaps to Page 2: NO .phone-ghost, NO leaf animation,
     NO .phone-sheet-hidden, no rotateX transform anywhere mid-turn
   - tap on the sheet advances; swipe left advances; Prev goes back
   - page numbers run 1..N contiguously; entries always render (front only —
     there is no back side at all in this view)
   - desktop (>820px) STILL uses the upward flip book (leaf + flipUp exist)
   - CSS: no active phoneFlip keyframes/animation rules remain             */
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
  await new Promise(r => api.listen(8781, r));
  await new Promise(r => files.listen(8335, r));

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
        if (url.indexOf(SUPA) === 0) return rf(url.replace(SUPA, "http://localhost:8781/rest/v1/"), init);
        return rf(input, init);
      };
      navigator.serviceWorker.getRegistration().then(r => r && r.unregister());
    })();
  `);

  await page.goto("http://localhost:8335/index.html", { waitUntil: "load" });
  await new Promise(r => setTimeout(r, 1800));

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

  // ---- phone mode: plain single page layout ----
  const base = await page.evaluate(() => ({
    phoneMode: document.body.classList.contains("book-phone-mode"),
    info: document.getElementById("spreadInfoPhone").textContent,
    num: document.getElementById("leftNum").textContent,
    rightVisible: getComputedStyle(document.querySelector("#bookModal .page-right")).display !== "none",
    tabPrevShown: getComputedStyle(document.getElementById("tabPrev")).display !== "none",
    tabNextShown: getComputedStyle(document.getElementById("tabNext")).display !== "none",
    leafShown: getComputedStyle(document.getElementById("leaf")).display !== "none",
    txt: (document.querySelector("#leftContent").textContent || "").slice(0, 60)
  }));
  check("phone mode class applied", base.phoneMode);
  check("opens at Page 1 with heading band", /Page 1 \/ \d+/.test(base.info) && base.num === "1" && /=|MEMMARK\d+/.test(base.txt), JSON.stringify(base));
  check("single page only — right half hidden (no spread)", base.rightVisible === false);
  check("Prev/Next tab buttons visible on phone", base.tabPrevShown && base.tabNextShown);
  check("flipping leaf never shown on phone", base.leafShown === false);

  // ---- NEXT = instant plain swap, zero flip-book machinery ----
  await page.evaluate(() => document.getElementById("tabNext").click());
  await new Promise(r => setTimeout(r, 60));   // well before any old 300ms rebuild
  const mid = await page.evaluate(() => {
    const g = document.querySelector(".phone-ghost");
    const l = document.getElementById("leaf");
    const tr = getComputedStyle(document.getElementById("book")).transform + " " +
               getComputedStyle(document.querySelector("#bookModal .page-left")).transform;
    return {
      ghosts: g ? 1 : 0,
      bookHidden: document.getElementById("book").classList.contains("phone-sheet-hidden"),
      leafAnim: !!(l && (l.classList.contains("flipping-forward") || l.classList.contains("flipping-back"))),
      rotated: /matrix3?/.test(tr) && tr.indexOf("matrix") !== -1 && tr !== "none",
      info: document.getElementById("spreadInfoPhone").textContent,
      num: document.getElementById("leftNum").textContent,
      txt: (document.querySelector("#leftContent").textContent || "").slice(0, 60)
    };
  });
  check("no ghost clone during turn (not a flip book)", mid.ghosts === 0);
  check("book never hidden underneath (no flight state)", mid.bookHidden === false);
  check("leaf animation never triggered on phone", mid.leafAnim === false);
  check("no 3D rotation transform applied", mid.rotated === false, mid.rotated ? "rot!" : "");
  check("advanced to Page 2 immediately (plain swap)", /Page 2 \/ \d+/.test(mid.info) && mid.num === "2" && mid.txt.trim().length > 10, JSON.stringify(mid));

  // ---- TAP on the sheet advances one page ----
  await new Promise(r => setTimeout(r, 750));   // clear the swipe-suppression window
  await page.mouse.click(195, 420);
  await new Promise(r => setTimeout(r, 120));
  const afterTap = await page.evaluate(() => ({
    info: document.getElementById("spreadInfoPhone").textContent,
    ghosts: document.querySelectorAll(".phone-ghost").length
  }));
  check("tap advances to Page 3 (plain pages)", /Page 3 \/ \d+/.test(afterTap.info) && afterTap.ghosts === 0, afterTap.info);

  // ---- SWIPE UP advances / swipe DOWN goes back — the pages flip in the
  // VERTICAL direction (never a horizontal book turn). Horizontal swipes are
  // deliberately ignored so they can't mis-turn anything. ----
  async function swipeY(dy) {
    const x0 = 195, y0 = 500;
    await page.touchscreen.touchStart(x0, y0);
    for (let i = 1; i <= 10; i++) { await page.touchscreen.touchMove(x0, y0 + dy * i / 10); await new Promise(r => setTimeout(r, 12)); }
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 850));   // clear the swipe→click suppression window
  }
  async function swipe(dx) {   // horizontal: must do NOTHING on phones now
    const x0 = 195, y0 = 500;
    await page.touchscreen.touchStart(x0, y0);
    for (let i = 1; i <= 10; i++) { await page.touchscreen.touchMove(x0 + dx * i / 10, y0); await new Promise(r => setTimeout(r, 12)); }
    await page.touchscreen.touchEnd();
    await new Promise(r => setTimeout(r, 850));
  }
  await swipeY(-80);
  const s1 = await page.evaluate(() => document.getElementById("spreadInfoPhone").textContent);
  check("swipe UP advances a page (vertical turning)", /Page 4 \/ \d+/.test(s1), s1);
  await swipeY(80);
  const s2 = await page.evaluate(() => document.getElementById("spreadInfoPhone").textContent);
  check("swipe DOWN goes back a page", /Page 3 \/ \d+/.test(s2), s2);
  await swipe(-80);
  const s3 = await page.evaluate(() => document.getElementById("spreadInfoPhone").textContent);
  check("horizontal swipe is ignored (no side-flip book gesture)", /Page 3 \/ \d+/.test(s3), s3);

  // ---- PREV returns ----
  await page.evaluate(() => document.getElementById("tabPrev").click());
  await new Promise(r => setTimeout(r, 120));
  const prev = await page.evaluate(() => document.getElementById("spreadInfoPhone").textContent);
  check("Prev button goes back to Page 2", /Page 2 \/ \d+/.test(prev), prev);

  // ---- walk ALL pages: contiguous numbering, every page has content ----
  const walk = await page.evaluate(() => new Promise(resolve => {
    const seen = [];
    let blanks = 0;
    const total = parseInt((document.getElementById("spreadInfoPhone").textContent.match(/\/ (\d+)/) || [])[1], 10);
    document.getElementById("tabPrev").click();
    setTimeout(() => {
      document.getElementById("tabPrev").click();
      setTimeout(() => {
        const step = () => {
          const num = document.getElementById("leftNum").textContent;
          const txt = document.querySelector("#leftContent").textContent || "";
          seen.push(num);
          if (txt.trim().replace(/=/g, "").trim().length < 5 && Number(num) > 1) blanks++;
          if (Number(num) >= total) return resolve({ seen, blanks, total });
          document.getElementById("tabNext").click();
          setTimeout(step, 60);
        };
        step();
      }, 120);
    }, 120);
  }));
  check("page numbers run 1..N contiguously", walk.seen.join(",") === Array.from({ length: walk.total }, (_, i) => String(i + 1)).join(","), walk.seen.slice(0, 6).join(",") + " …" + walk.seen.slice(-2).join(","));
  check("every page shows content (no blank pages)", walk.blanks === 0, "blanks=" + walk.blanks);

  // ---- CSS/static checks ----
  const cssTxt = await page.evaluate(async () => (await fetch("style.css")).text());
  const cssNoComments = cssTxt.replace(/\s*\/\*[\s\S]*?\*\//g, "");
  check("no active phoneFlipUp/Down keyframes remain", !/@keyframes phoneFlip(Up|Down)/.test(cssNoComments));
  check("no active .phone-ghost animation rule remains", !/\.phone-ghost[^{]*\{[^}]*animation:/.test(cssNoComments));
  check("phone mode disables the leaf", /body\.book-phone-mode\s+\.leaf\s*\{\s*display:\s*none\s*!important/.test(cssNoComments));
  check("desktop flip-up book still defined (flipUp/flipDown keyframes)", /@keyframes flipUp\b/.test(cssNoComments) && /@keyframes flipDown\b/.test(cssNoComments));

  // ---- FRONT-SIDE-ONLY WRITING: the leaf back face must be a completely
  // empty container - no header, no page-content, no footer, no number.
  // fillLeaf is exercised through the REAL desktop flip path (it lives in
  // the script IIFE and is not exposed globally). ----
  const backFace = await page.evaluate(() => {
    const bp = document.getElementById("leafBack");
    if (!bp) return null;
    return {
      html: bp.innerHTML.replace(/<!--[\s\S]*?-->/g, "").trim(),
      hasHeader: !!bp.querySelector(".book-page-header"),
      hasContent: !!bp.querySelector(".page-content"),
      hasFooter: !!bp.querySelector(".book-page-footer"),
      hasNum: !!bp.querySelector(".page-num"),
      text: bp.textContent.trim(),
    };
  });
  check("leaf back face exists", !!backFace);
  if (backFace) {
    check("back face has NO header", !backFace.hasHeader);
    check("back face has NO page-content container", !backFace.hasContent);
    check("back face has NO footer", !backFace.hasFooter);
    check("back face has NO page number", !backFace.hasNum);
    check("back face contains no text at all (blank paper)", backFace.text === "", JSON.stringify(backFace.html.slice(0, 80)));
  }

  // Trigger a real desktop flip-up and inspect the faces MID-FLIGHT:
  // writing must paint on the FRONT only; the back stays totally empty.
  await page.evaluate(() => document.getElementById("nextPageBtn").click());
  await new Promise(r => setTimeout(r, 400));   // sample mid-flight (flip lasts 800ms)
  const midFlip = await page.evaluate(() => {
    const fp = document.getElementById("leafFront");
    const bp = document.getElementById("leafBack");
    return {
      leafActive: getComputedStyle(document.getElementById("leaf")).display !== "none",
      frontHasContent: (fp.textContent || "").replace(/\s+/g, " ").length > 20,
      backEmpty: bp.innerHTML.trim() === "" && bp.textContent.trim() === "",
    };
  });
  check("desktop flip is running (leaf visible mid-flight)", midFlip.leafActive);
  check("front face carries the writing during the flip", midFlip.frontHasContent);
  check("back face stays TOTALLY EMPTY mid-flip (entries never print on the reverse)", midFlip.backEmpty, JSON.stringify(midFlip));
  await new Promise(r => setTimeout(r, 600));   // let the flip finish

  // ---- desktop keeps the book view ----
  await page.setViewport({ width: 1280, height: 900, isMobile: false, hasTouch: false });
  await new Promise(r => setTimeout(r, 600));
  const desk = await page.evaluate(() => ({
    phoneMode: document.body.classList.contains("book-phone-mode"),
    info: document.getElementById("spreadInfo").textContent,
    rightVisible: getComputedStyle(document.querySelector("#bookModal .page-right")).display !== "none"
  }));
  check("desktop reverts to two-page spread book", !desk.phoneMode && /Spread/.test(desk.info) && desk.rightVisible, JSON.stringify(desk));

  await page.screenshot({ path: path.join(__dirname, "phone_single_pages.png") });
  check("no page errors", errors.length === 0, errors.slice(0, 2).join(" | "));

  const fails = results.filter(r => !r[1]).length;
  console.log("\n=== SUMMARY: " + (results.length - fails) + "/" + results.length + " passed ===");
  await browser.close();
  api.close(); files.close();
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error("TEST CRASH:", e); process.exit(2); });
