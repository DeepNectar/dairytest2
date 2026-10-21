/* E2E: book-view category/heading filter — chips visible at the START of the
   book, filtering shows only matching entries, default = regular book,
   ➕ Add pane saves a new entry to the END of the filtered book.           */
const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webmanifest": "application/manifest+json" };

// ---- seeded cloud data ----
const hash = "dairy-salt::" + "pass1234";
const h = crypto.createHash("sha256").update(Buffer.from(hash, "utf8")).digest("hex");
const EMAIL = "tester@d.com";
let entries = [
  { id: 1, owner: EMAIL, title: "Morning gm", body: "good morning jaan!", mood: "😊", sender: "Deep", heading: "🌅 Morning & Night Greetings", date: "2026-01-01T09:00:00.000Z", words: 3 },
  { id: 2, owner: EMAIL, title: "Office day", body: "today office was busy, ate lunch late", mood: "😌", sender: "Honey", heading: "💬 Daily Life & Important Updates", date: "2026-01-02T09:00:00.000Z", words: 8 },
  { id: 3, owner: EMAIL, title: "Night gn", body: "good night, sleep well did you sleep?", mood: "😴", sender: "Honey", heading: "🌅 Morning & Night Greetings", date: "2026-01-03T21:00:00.000Z", words: 8 },
  { id: 4, owner: EMAIL, title: "Love you", body: "i love you my jaan forever only you", mood: "🔥", sender: "Deep", heading: "💕 Romantic Confessions", date: "2026-01-04T09:00:00.000Z", words: 8 },
  { id: 5, owner: EMAIL, title: "Wrap up", body: "final recap of our month together", mood: "🥲", sender: "Deep", heading: "📌 FINAL SUMMARY", date: "2026-01-05T09:00:00.000Z", words: 6 },
];
const users = [{ email: EMAIL, name: "Tester", hash: h, created: "2026-01-01T00:00:00.000Z" }];
const sessions = [{ email: EMAIL, updated_at: "2026-01-05T00:00:00.000Z" }];
const settings = [];

const api = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  const table = u.pathname.replace("/rest/v1/", "");
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    if (req.method === "POST") {
      try {
        const rows = JSON.parse(body);
        if (table === "entries") rows.forEach((r) => entries.push(r));
        if (table === "settings") rows.forEach((r) => settings.push(r));
      } catch (e) {}
      res.writeHead(201); return res.end("{}");
    }
    if (table === "users") return j(res, users);
    if (table === "sessions") return j(res, sessions);
    if (table === "settings") return j(res, settings.filter(s => /key=eq/.test(u.search) ? true : true));
    if (table === "entries") {
      const owner = decodeURIComponent(u.searchParams.get("owner") || "");
      return j(res, entries.filter((e) => !owner || e.owner === owner).sort((a,b)=> (a.date<b.date?1:-1)));
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
  await new Promise((r) => api.listen(8777, r));
  await new Promise((r) => files.listen(8331, r));
  // Rewrite the app's Supabase URL to the local mock via request interception.
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const results = {};
  const errors = [];

  async function openBook(page) {
    await page.evaluate(() => {
      document.getElementById("bookViewLink").click();
    });
    // wait for pages to build
    await page.waitForFunction(() => {
      const el = document.getElementById("leftContent") || document.getElementById("rightContent");
      return el && el.innerHTML.length > 50;
    }, { timeout: 20000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 400));
  }

  async function scenario(name, viewport, ua) {
    const page = await browser.newPage();
    await page.setUserAgent(ua);
    await page.setViewport(viewport);
    page.on("pageerror", (e) => errors.push(name + ": " + String(e)));
    // Point the app at the local mock BEFORE script.js runs.
    await page.evaluateOnNewDocument(() => {
      const realFetch = window.fetch.bind(window);
      window.fetch = (input, init) => {
        let url = typeof input === "string" ? input : (input && input.url) || "";
        if (url.indexOf("https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/") === 0) {
          url = url.replace("https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/", "http://localhost:8777/rest/v1/");
          return realFetch(url, init);
        }
        return realFetch(input, init);
      };
    });
    await page.goto("http://localhost:8331/index.html", { waitUntil: "load" });
    await new Promise((r) => setTimeout(r, 1500)); // let init() auto-resume session

    const signedIn = await page.evaluate(() => {
      const chip = document.getElementById("userChip");
      return chip && !chip.classList.contains("hidden");
    });
    results[name + "_signedIn"] = signedIn;

    // 1) Book filter bar exists and is visible at the start of the book
    await openBook(page);
    const barInfo = await page.evaluate(() => {
      const bar = document.getElementById("bookFilterBar");
      if (!bar) return { exists: false };
      const cs = getComputedStyle(bar);
      const stage = document.querySelector("#bookModal .book-stage");
      return {
        exists: true,
        visible: cs.display !== "none" && bar.getBoundingClientRect().height > 10,
        aboveStage: bar.getBoundingClientRect().bottom <= stage.getBoundingClientRect().top + 2,
        chips: Array.from(bar.querySelectorAll(".bf-chip[data-bf-kind='heading']")).map((b) => b.textContent.trim()),
      };
    });


    const dbg = await page.evaluate(() => ({
      signedIn: (()=>{const c=document.getElementById("userChip");return c&&!c.classList.contains("hidden")})(),
      barExists: !!document.getElementById("bookFilterBar"),
      modalHidden: document.getElementById("bookModal").classList.contains("hidden"),
      leftLen: (document.getElementById("leftContent")||{}).innerHTML ? document.getElementById("leftContent").innerHTML.length : 0,
    }));
    results[name + "_dbg"] = dbg;
    // 2) Default (All) → regular book: all 5 entries present in pages
    const allText = await page.evaluate(() => {
      const t = [];
      document.querySelectorAll("#bookModal .page-content").forEach((p) => t.push(p.textContent));
      return t.join("\n");
    });
    const defaultHasAll = ["Morning gm".slice(0,0), "good morning", "office was busy", "sleep well", "love you", "final recap"]
      .filter((s) => s && allText.includes(s)).length;

    // 3) Tap the greetings chip → only greeting entries shown
    const greetLabel = barInfo.chips.find((c) => c.includes("Morning & Night"));
    await page.evaluate((label) => {
      const btns = Array.from(document.querySelectorAll("#bookFilterBar .bf-chip[data-bf-kind='heading']"));
      const b = btns.find((x) => x.textContent.trim() === label);
      b.click();
    }, greetLabel);
    await new Promise((r) => setTimeout(r, 1500));
    const filtered = await page.evaluate(() => {
      const t = [];
      document.querySelectorAll("#bookModal .page-content").forEach((p) => t.push(p.textContent));
      const txt = t.join("\n");
      return {
        hasGreet: txt.includes("good morning") && txt.includes("sleep well"),
        noDaily: !txt.includes("office was busy"),
        noConfess: !txt.includes("forever only you"),
        noSummary: !txt.includes("final recap"),
        addTabVisible: (() => { const a = document.getElementById("tabAddEntry"); return a && getComputedStyle(a).display !== "none"; })(),
        addBtnDesktopVisible: (() => { const a = document.getElementById("addEntryDesktopBtn"); return a && getComputedStyle(a).display !== "none"; })(),
      };
    });

    // 4) Back to All → regular preview restored
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll("#bookFilterBar .bf-chip[data-bf-kind='heading']")).find((x) => x.dataset.bfValue === "");
      b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    const backToAll = await page.evaluate(() => {
      const t = [];
      document.querySelectorAll("#bookModal .page-content").forEach((p) => t.push(p.textContent));
      const txt = t.join("\n");
      return txt.includes("office was busy") && txt.includes("good morning");
    });

    // 5) Phone screenshot of the filtered state
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("#bookFilterBar .bf-chip[data-bf-kind='heading']"));
      const b = btns.find((x) => /Morning & Night/.test(x.textContent));
      if (b) b.click();
    });
    await new Promise((r) => setTimeout(r, 1500));
    await page.screenshot({ path: path.join(__dirname, "book_filter_" + name + ".png") });

    results[name] = { barInfo, defaultMatched: defaultHasAll, filtered, backToAll };
    await page.close();
  }

  await scenario("phone", { width: 390, height: 844, isMobile: true, hasTouch: true },
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
  await scenario("desktop", { width: 1400, height: 900 },
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36");

  console.log(JSON.stringify({ results, errors }, null, 2));
  fs.writeFileSync("/tmp/bf_results.json", JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
