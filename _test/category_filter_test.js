// E2E: category/heading option at start of book + preview filter + counter
// excluding 📌 FINAL SUMMARY. Runs against a stubbed Supabase REST API.
const puppeteer = require("puppeteer");
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".webmanifest": "application/manifest+json" };

// ---- fake cloud ----
const sha = (s) => crypto.createHash("sha256").update("dairy-salt::" + s).digest("hex");
const USERS = [{ email: "t@t.com", name: "Testy", hash: sha("secret12"), created: new Date().toISOString() }];
let ENTRIES = [
  // two real messages + one final summary (should NOT be counted as message)
  { id: 1, owner: "t@t.com", title: "M1", body: 'Deep: "good morning jaan"', mood: "\uD83D\uDCAC", sender: "Deep", heading: "\uD83C\uDF05 Morning & Night Greetings", date: new Date(Date.now() - 86400000).toISOString(), words: 4 },
  { id: 2, owner: "t@t.com", title: "M2", body: '🫰🫶🏻Chota Don❣️❤️😘: "love you"', mood: "\uD83D\uDC8C", sender: "\uD83D\uDEF0\uD83D\uDC9B\uD83C\uDFFBChota Don\u2763\uFE0F\u2764\uFE0F\uD83D\uDE18", heading: "\uD83D\uDC95 Romantic Confessions", date: new Date().toISOString(), words: 2 },
  { id: 3, owner: "t@t.com", title: "Wrap up", body: "Deep: \"that is all for this month\"", mood: "\uD83D\uDCAC", sender: "Deep", heading: "\uD83D\uDCCC FINAL SUMMARY", date: new Date().toISOString(), words: 6 },
];
const appServer = http.createServer((req, res) => {
  let p = req.url.split("?")[0];
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
const api = http.createServer((req, res) => {
  let body = "";
  req.on("data", (d) => (body += d));
  req.on("end", () => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
    const u = new URL(req.url, "http://x");
    const table = u.pathname.replace("/rest/v1/", "");
    if (req.method === "DELETE" || req.headers["x-method-override"] === "DELETE") {
      if (table === "entries") ENTRIES = [];
      res.writeHead(204); return res.end();
    }
    if (req.method === "POST" && table === "entries") {
      try { JSON.parse(body).forEach((r) => ENTRIES.push(r)); } catch (e) {}
      res.writeHead(201); return res.end("[]");
    }
    if (req.method === "POST") { res.writeHead(201); return res.end("{}"); }
    if (table === "users") { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify(USERS)); }
    if (table === "entries") {
      const owner = decodeURIComponent(u.searchParams.get("owner") || "");
      const rows = ENTRIES.filter((e) => e.owner === owner);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(rows));
    }
    res.writeHead(200, { "Content-Type": "application/json" }); res.end("[]");
  });
});

(async () => {
  await Promise.all([new Promise((r) => appServer.listen(8331, r)), new Promise((r) => api.listen(8332, r))]);
  const browser = await puppeteer.launch({ args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.setRequestInterception(true);
  page.on("request", (r) => {
    const url = r.url();
    if (url.includes("unvomzolyjwcdavitdmr.supabase.co")) {
      r.url().replace("https://unvomzolyjwcdavitdmr.supabase.co/rest/v1", "http://localhost:8332/rest/v1");
      r.continue({ url: url.replace("https://unvomzolyjwcdavitdmr.supabase.co/rest/v1", "http://localhost:8332/rest/v1") });
    } else if (/\.(png|jpg|jpeg|gif|webp)(\?|$)/.test(url) || url.startsWith("https://fonts.")) {
      r.abort(); // no network images needed for this test
    } else r.continue();
  });
  await page.goto("http://localhost:8331/index.html", { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 800));

  // sign in via the modal
  await page.evaluate(() => document.querySelector("#authBtn").click());
  await page.type("#authEmail", "t@t.com");
  await page.type("#authPass", "secret12");
  await page.evaluate(() => document.querySelector("#authForm").requestSubmit());
  await new Promise((r) => setTimeout(r, 1200));

  const results = {};

  // 1) Category dropdown injected into the editor (script-only change)
  results.headingSelectExists = await page.evaluate(() => {
    const s = document.querySelector("#entryHeading");
    return !!s && s.options.length >= 15;
  });

  // 2) Heading chips rendered at the start of the entries preview
  results.chipsExist = await page.evaluate(() => !!document.querySelector("#headingChips .h-chip"));
  results.chipLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#headingChips .h-chip")).map((b) => b.textContent.trim()));

  // 3) Counter EXCLUDES the 📌 FINAL SUMMARY entry (left side), shows it on right
  results.counter = await page.evaluate(() => {
    const main = document.querySelector(".cr-main"), sum = document.querySelector(".cr-sum");
    return main && sum ? { main: main.textContent, sum: sum.textContent } : null;
  });
  results.liveCountText = await page.evaluate(() => document.querySelector("#liveCount").textContent);
  results.statEntries = await page.evaluate(() => (document.querySelector("#statEntries") || {}).textContent);

  // 4) Filter: click the "Morning" chip → only matching entry shown
  const clicked = await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll("#headingChips .h-chip"));
    const c = chips.find((b) => b.textContent.includes("Morning"));
    if (c) { c.click(); return true; } return false;
  });
  results.morningChipClicked = clicked;
  await new Promise((r) => setTimeout(r, 1200));
  results.filteredCardCount = await page.evaluate(() => document.querySelectorAll("#entriesList .entry").length);
  results.filteredHeadings = await page.evaluate(() =>
    Array.from(document.querySelectorAll("#entriesList .heading-badge")).map((b) => b.textContent.trim()));

  // 5) Save a NEW entry with a chosen category → lands under that heading, chip count grows
  await page.evaluate(() => {
    const chips = Array.from(document.querySelectorAll("#headingChips .h-chip"));
    (chips.find((b) => b.textContent.includes("All")) || chips[0]).click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  await page.evaluate(() => {
    document.querySelector("#entryTitle").value = "New fun note";
    document.querySelector("#entryBody").value = "we laughed so much today haha";
    const sel = document.querySelector("#entryHeading");
    sel.value = Array.from(sel.options).find((o) => o.value.includes("Fun Moments")).value;
    document.querySelector("#entryForm").requestSubmit();
  });
  await new Promise((r) => setTimeout(r, 1500));
  results.newEntryFiledUnder = await page.evaluate(() => {
    const first = document.querySelector("#entriesList .entry .heading-badge");
    return first ? first.textContent.trim() : null;
  });
  results.funChipCount = await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll("#headingChips .h-chip")).find((b) => b.textContent.includes("Fun Moments"));
    return c ? c.textContent.trim() : null;
  });

  // 6) Empty-category message when filtering a category with no entries
  await page.evaluate(() => {
    const c = Array.from(document.querySelectorAll("#headingChips .h-chip")).find((b) => b.textContent.includes("About Arya"));
    if (c) c.click();
  });
  await new Promise((r) => setTimeout(r, 1200));
  results.emptyMsg = await page.evaluate(() => {
    const e = document.querySelector("#emptyState");
    return e.style.display !== "none" ? e.textContent : null;
  });

  console.log(JSON.stringify(results, null, 2));
  console.log("PAGE ERRORS:", errors.filter((e) => !/abort|net::/.test(e)).slice(0, 5));
  await page.screenshot({ path: "_test/category_chips.png", fullPage: false });
  await browser.close(); appServer.close(); api.close();

  const ok =
    results.headingSelectExists && results.chipsExist &&
    results.counter && /Messages counted/.test(results.counter.main) &&
    /Summaries counted/.test(results.counter.sum) &&
    /entries counted/.test(results.liveCountText) && !/words/.test(results.liveCountText) &&
    results.filteredCardCount === 1 && results.newEntryFiledUnder && results.newEntryFiledUnder.includes("Fun") &&
    results.emptyMsg && results.emptyMsg.includes("No entries under");
  console.log(ok ? "ALL CHECKS PASSED ✅" : "CHECKS FAILED ❌");
  process.exit(ok ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
