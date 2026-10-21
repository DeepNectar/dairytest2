/* ============ Dairy Writing — script.js (plain JavaScript, no TypeScript) ============ */

(function () {
  "use strict";

  // ---------- Helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // ---------- 📂 The 15 diary categories (headings) ----------
  // Defined at the TOP of the script so BOTH the manual entry form and
  // the template importer share one source of truth. script.js injects
  // these as options into the editor (no index.html changes needed).
  // heading travels with the entry to the Supabase "entries" table (column
  // "heading") and shows up as a coloured band on the message bubble in the
  // book / PDF, so each section of the diary is visible at a glance.
  const DIARY_HEADINGS = [
    { id: "greetings",   label: "🌅 Morning & Night Greetings",     keywords: ["good morning","gm","gn","good night","goood morning","gud night","morning jaan","night jaan","slept","sleep well","did you sleep","wakeup","wake up","first thing"] },
    { id: "daily-life",  label: "💬 Daily Life & Important Updates", keywords: ["office","work","job","meeting","study","college","school","eat","ate","food","lunch","dinner","breakfast","tea","coffee","today","tomorrow","plan for today","busy","tired from","reached","home","gym","drive","shopping","chore"] },
    { id: "compliments", label: "💖 Sweet Compliments & Love",       keywords: ["beautiful","pretty","cute","gorgeous","lovely","smart","amazing girl","best girl","your eyes","your smile","so special","miss your face","patachu","supadu","marvelous"] },
    { id: "kesha",       label: "👨‍👩‍👧‍👦 About Kesha (Her Sister)",      keywords: ["kesha","keshu","sister","akshi","behen","behno"] },
    { id: "arya",        label: "👨‍👩‍👧‍👦 About Arya (Her Brother)",       keywords: ["arya","bhai","brother","भाi"] },
    { id: "dreams",      label: "🎯 Dreams & Future Plans",          keywords: ["future","plan","plans","engagement","wedding","shadi","marriage","settled","together forever","visa","flight","move","dubai plan","april","our home","kids","family plan","dream","goal"] },
    { id: "support",     label: "🤗 Emotional Support & Care",       keywords: ["take care","tension","stress","worried","worry","therapy","panic","depression","sad","cry","crying","upset","hurt","health","father","hospital","support","calm down","don't think","it's okay","safe","protect"] },
    { id: "fun",         label: "😄 Fun Moments & Jokes",            keywords: ["haha","lol","😂","🤣","joke","funny","bakwas","natak","drama","prank","crazy dream","story","mast","have to say"] },
    { id: "flirty",      label: "🔥 Flirty Banter & Teasing",        keywords: ["tease","teasing","na na khoon","kill you","jujhu","patamu","jealous","miss me huh","say it again","catch you","you mine","i am yours only","banter","flirt"] },
    { id: "confessions", label: "💕 Romantic Confessions",           keywords: ["love you","ilu","i love","luv u","heart","my jaan","jaanu","honeymoon","forever","only you","always yours","proposing","will you marry","relationship","commitment"] },
    { id: "attraction",  label: "💘 Attraction & Desire",            keywords: ["attractive","desire","want you","need you","craving","miss you so much","can't wait to see","hold you","hug you tight","hold your hand","meet","come here"] },
    { id: "intimate",    label: "🌙 Intimate & Passionate Talks",    keywords: ["kiss","👄","🫦","passionate","intimate","spicy","private talk","bed","romantic night","physical","skin","cuddle","clingy night"] },
    { id: "chemistry",   label: "💝 Deep Chemistry & Connection",    keywords: ["connection","chemistry","same feeling","telepath","souls","two bodies one soul","understand you without","finish my sentences","meant to be","destiny","twin flame","soulmate"] },
    { id: "no-reply",    label: "💭 My Messages To Her (No Reply Yet)", keywords: [] },
    { id: "her-only",    label: "💌 Her Messages To Me",             keywords: [] },
  ];

  // ---------- Sync backend (cloud storage) ----------
  // Everything — accounts, sessions, diary entries and the saved book page —
  // lives in the cloud tables ONLY. Nothing is kept on the device.
  const SYNC_URL = "https://unvomzolyjwcdavitdmr.supabase.co/rest/v1/";
  const SYNC_HEADERS = {
    apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudm9tem9seWp3Y2Rhdml0ZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ3NjEsImV4cCI6MjEwNzQ1MDc2MX0.SaukqHzJlXRXfx2R4yvbIEeWFEj7hm9xnkj6Oqw_4wY",
    Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVudm9tem9seWp3Y2Rhdml0ZG1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4NzQ3NjEsImV4cCI6MjEwNzQ1MDc2MX0.SaukqHzJlXRXfx2R4yvbIEeWFEj7hm9xnkj6Oqw_4wY",
  };
  async function syncGet(table, query) {
    const res = await fetch(SYNC_URL + table + "?" + (query || ""), {
      headers: Object.assign({ Accept: "application/json" }, SYNC_HEADERS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("sync GET failed (" + res.status + ")");
    return res.json();
  }
  async function syncPost(table, rows) {
    const res = await fetch(SYNC_URL + table, {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json", Prefer: "return=minimal" }, SYNC_HEADERS),
      body: JSON.stringify(rows),
    });
    if (!res.ok) throw new Error("sync POST failed (" + res.status + ")");
  }
  async function syncPatch(table, query, patch) {
    const res = await fetch(SYNC_URL + table + "?" + query, {
      method: "PATCH",
      headers: Object.assign({ "Content-Type": "application/json", Prefer: "return=minimal" }, SYNC_HEADERS),
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("sync PATCH failed (" + res.status + ")");
  }
  async function syncDelete(table, query) {
    // Some proxy/CDN setups block the raw DELETE verb on POSTgREST hosts;
    // X-HTTP-Method-Override keeps it working everywhere. Prefer: return=minimal
    // so every delete path behaves identically (204, no body).
    const res = await fetch(SYNC_URL + table + "?" + query, {
      method: "DELETE",
      headers: Object.assign({ "X-HTTP-Method-Override": "DELETE", Prefer: "return=minimal" }, SYNC_HEADERS),
    });
    if (!res.ok) throw new Error("sync DELETE failed (" + res.status + ")");
  }

  // ---------- Auth helpers ----------
  // Passwords are salted + hashed before they leave the app, so the cloud
  // never stores plain text. Each account's data is keyed by its email so
  // every user only ever sees their OWN entries.
  async function hashPass(pass) {
    const data = new TextEncoder().encode("dairy-salt::" + pass);
    const buf = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // In-memory caches of the cloud data (single source of truth while running).
  let usersMap = {};       // email -> { name, hash, created }
  let entriesCache = [];   // current user's entries, newest first
  let currentUser = null;  // email of logged-in user
  let savedSpreadCloud = 0; // cloud-synced reading position
  let themePref = "light";  // cloud-synced theme choice

  async function refreshUsers() {
    try {
      const rows = await syncGet("users", "select=*");
      const map = {};
      (rows || []).forEach((r) => { map[r.email] = { name: r.name, hash: r.hash, created: r.created }; });
      usersMap = map;
    } catch (e) { console.warn("sync: could not load accounts", e); }
  }
  async function upsertUser(email, rec) {
    usersMap[email] = rec; // optimistic in-memory update
    // Upsert (merge-duplicates) so signing up with an email that already has
    // a row (e.g. left over from a deleted account) never fails with a
    // primary-key violation — the theme column is preserved on merge.
    const res = await fetch(SYNC_URL + "users", {
      method: "POST",
      headers: Object.assign({ "Content-Type": "application/json", Prefer: "return=minimal,resolution=merge-duplicates" }, SYNC_HEADERS),
      body: JSON.stringify([{ email, name: rec.name, hash: rec.hash, created: rec.created }]),
    });
    if (!res.ok) throw new Error("sync user upsert failed (" + res.status + ")");
  }

  async function loadEntriesFromCloud(email) {
    if (!email) return [];
    try {
      // "heading" is the diary section each message belongs to (see
      // DIARY_HEADINGS). Read with a fallback so older cloud rows (saved
      // before headings existed) still load fine.
      let rows = await syncGet("entries", "select=id,title,body,mood,sender,heading,date,words&owner=eq." + encodeURIComponent(email.toLowerCase()) + "&order=date.desc");
      rows = rows || [];
      // The cloud REST API silently caps every response at 1000 rows. When a
      // big import pushed the account past that cap, the tail of the list was
      // dropped — and because saving works by diffing against the loaded set,
      // the next save DELETED those unseen rows. So whenever a page comes back
      // exactly full, keep fetching the next pages (date-desc order makes the
      // paging stable) until a short page proves we have everything.
      for (let offset = rows.length; rows.length === offset; offset += 1000) {
        const more = await syncGet("entries", "select=id,title,body,mood,sender,heading,date,words&owner=eq." + encodeURIComponent(email.toLowerCase()) + "&order=date.desc&limit=1000&offset=" + offset);
        if (!more || !more.length) break;
        rows = rows.concat(more);
      }
      // Defensive de-duplication by id: even if the same entry ever reached
      // the cloud twice (e.g. two imports racing), the screen must never show
      // it twice — importing 400 entries must show 400 entries, not more.
      //
      // ONE SHARED RENDER PIPELINE FOR EVERY ENTRY (the "some entries still
      // show raw HTML" fix): previously this load path ran the body through
      // finalScrub() — a PLAIN-TEXT flattener that also peels the canonical
      // wrapping quotes. The scrubbed body was then fed BACK into
      // formatBookBodyHtml() by the cards and booklet, whose output passed
      // through finalScrub() AGAIN — stripping the very <span class="eb-
      // extra"> / eb-label markup the renderer had just produced. Result:
      // legacy-imported entries displayed their 💭 "How I felt:" note glued
      // onto the message with leftover &quot; entities — raw code — while
      // hand-written entries rendered as pretty formatted bubbles. Now the
      // cache stores the CANONICAL plain-text shape only (normaliseStored-
      // Body), exactly what a fresh save writes, and EVERY page renders it
      // through the single styled pipeline below. No double-scrubbing, no
      // divergent formatting: all entries — first or last — preview
      // identically as formatted HTML.
      const seenIds = new Set();
      const uniq = [];
      rows.forEach((r) => {
        const key = String(r.id);
        if (seenIds.has(key)) return;
        seenIds.add(key);
        uniq.push({ id: Number(r.id), title: r.title, body: normaliseStoredBody(r.body, r.sender), mood: r.mood, sender: r.sender, heading: r.heading || "", date: r.date, words: r.words });
      });
      // ENTRY NUMBER of the BOOKLET (1, 2, 3 … till the end): assigned here in
      // strict chronological order — the exact order the book flows pages — so
      // EVERY page (screen leaf, flipping preview and printed PDF) numbers its
      // entries identically. Before this, numbering was derived from whatever
      // array order the cloud happened to return (date-desc), which made the
      // FIRST entry of a page carry a different number than elsewhere. The
      // number is display-only: it is never written to Supabase.
      // NO ENTRY NUMBERING anywhere in the diary (user rule): the book and
      // the cards show the messages exactly as written — counting happens
      // only in the separate 🧮 Message Counter panel.
      return uniq;
    } catch (e) {
      console.warn("sync: could not load entries", e);
      showToast("⚠️ Could not reach the cloud right now — check your connection");
      return [];
    }
  }

  // Replace the whole entry set for a user in the cloud (add / edit / delete all).
  async function saveEntriesToCloud(email, entries) {
    if (!email) return;
    const owner = email.toLowerCase();
    try {
      // Read the CURRENT cloud id set completely — PostgREST caps every
      // response at 1000 rows, so a big account needs the same offset paging
      // as loadEntriesFromCloud(). Without it, ids past row 1000 were invisible
      // here: they got POSTed a SECOND time (duplicate rows) and could never be
      // seen for deletion. The first saved entry of the page is exactly what
      // this diff writes to Supabase, so the read must be exhaustive.
      let curRows = await syncGet("entries", "select=id&owner=eq." + encodeURIComponent(owner) + "&limit=1000");
      curRows = curRows || [];
      for (let offset = curRows.length; curRows.length === offset; offset += 1000) {
        const more = await syncGet("entries", "select=id&owner=eq." + encodeURIComponent(owner) + "&limit=1000&offset=" + offset);
        if (!more || !more.length) break;
        curRows = curRows.concat(more);
      }
      const curIds = new Set(curRows.map((r) => String(r.id)));
      const wanted = new Set(entries.map((en) => String(en.id)));
      const toAdd = entries.filter((en) => !curIds.has(String(en.id))).map((en) => ({
        id: en.id, owner, title: en.title, body: en.body, mood: en.mood, sender: en.sender, heading: en.heading || "", date: en.date, words: en.words
      }));
      const toDel = Array.from(curIds).filter((id) => !wanted.has(id));
      if (toAdd.length) {
        // Batched upsert (merge-duplicates): an id that somehow already has a
        // row is UPDATED instead of throwing a primary-key violation that
        // would silently drop the WHOLE batch — which was how freshly saved
        // entries (including the very first one) never reached Supabase.
        for (let i = 0; i < toAdd.length; i += 500) {
          const chunk = toAdd.slice(i, i + 500);
          const res = await fetch(SYNC_URL + "entries", {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json", Prefer: "return=minimal,resolution=merge-duplicates" }, SYNC_HEADERS),
            body: JSON.stringify(chunk),
          });
          if (!res.ok) throw new Error("sync POST failed (" + res.status + ")");
        }
      }
      // One DELETE per id (PostgREST has no IN filter on bigint columns).
      for (const id of toDel) await syncDelete("entries", "id=eq." + id + "&owner=eq." + encodeURIComponent(owner));
    } catch (e) {
      console.warn("sync: could not save entries", e);
      showToast("⚠️ Cloud sync failed — please retry");
      throw e;   // let callers (import/save) know the write did not land
    }
  }

  function loadEntries() { return entriesCache; }

  // ENTRY NUMBER (1, 2, 3 … till the end) for the BOOKLET pages. Recomputed in
  // strict chronological order — exactly the order buildBookPages() flows the
  // sheets — so every page of the book (screen leaf and printed PDF alike)
  // shows the SAME number for the same entry, and the FIRST entry of a page is
  // never numbered differently from its siblings. Display-only: the number is
  // stripped before anything is written to Supabase.
  function assignEntryNumbers(entries) {
    // NO-OP BY DESIGN: entry numbers must NEVER appear inside the diary book,
    // on the cards or in Supabase. The user's request: "it should not calculate
    // as entry number — it should come in the book without the numbering".
    // Counting lives ONLY in the separate 🧮 Message Counter panel. Kept as a
    // stub so existing call-sites stay harmless.
    return entries;
  }

  // ---------- 🧮 SEPARATE MESSAGE COUNTER ----------
  // A dedicated counter that runs OUTSIDE the diary: counting messages here
  // never adds any "#N" numbering to the book, the cards or the cloud rows.
  // Two things are counted, on the two sides of the calculator panel:
  //   LEFT  side — real diary MESSAGES only. The special "📌 FINAL SUMMARY"
  //                entry is EXCLUDED from this count (per the user's rule:
  //                the count must stop before the summary block).
  //   RIGHT side — everything INCLUDING the final-summary words, so the
  //                summary can still be counted "on the other side of the
  //                calculator" when desired.
  function isSummaryEntry(en) {
    return /FINAL\s*SUMMARY/i.test(String((en && en.heading) || "")) ||
           /Final Summary/i.test(String((en && en.title) || ""));
  }
  function computeMessageCount() {
    const all = loadEntries();
    const real = all.filter((en) => !isSummaryEntry(en));
    return {
      total: all.length,
      realCount: real.length,
      realWords: real.reduce((s, e) => s + (e.words || countWords(e.body)), 0),
      allWords: all.reduce((s, e) => s + (e.words || countWords(e.body)), 0),
      summaryCount: all.length - real.length,
      summaryWords: all.length - real.length
        ? all.filter(isSummaryEntry).reduce((s, e) => s + (e.words || countWords(e.body)), 0)
        : 0
    };
  }
  // The counter panel's markup is injected by script.js itself (no changes
  // needed in index.html): make sure the container exists before filling it.
  function ensureCounterPanel() {
    let box = $("#counterResults");
    if (box) return box;
    const formEl = $("#entryForm");
    if (!formEl || !formEl.parentNode) return null;
    const panel = document.createElement("div");
    panel.className = "counter-panel";
    panel.innerHTML =
      '<h4 class="cr-title">🧮 Message Counter <span class="cr-note">(counting only — never numbers the book)</span></h4>' +
      '<div id="counterResults"></div>';
    formEl.parentNode.insertBefore(panel, formEl.nextSibling);
    return $("#counterResults");
  }
  function renderCounterPanel() {
    const box = ensureCounterPanel();
    if (!box) return;
    const c = computeMessageCount();
    box.innerHTML =
      '<div class="cr-card cr-main"><span class="cr-num" id="crCount">' + c.realCount + '</span>' +
        '<span class="cr-lbl">Messages counted</span>' +
        '<span class="cr-sub">' + c.realWords.toLocaleString() + ' words written</span></div>' +
      '<div class="cr-card cr-sum"><span class="cr-num" id="crSum">' + c.summaryCount + '</span>' +
        '<span class="cr-lbl">Summaries counted</span>' +
        '<span class="cr-sub">📌 FINAL SUMMARY · excluded from the message count (' +
        c.summaryWords.toLocaleString() + ' words)</span></div>';
    // keep the hero stat in sync with the SAME rule: messages only, never
    // the 📌 FINAL SUMMARY entry.
    const se = $("#statEntries");
    if (se) se.textContent = c.realCount;
  }

  async function saveEntries(entries) {
    if (!currentUser) return false;
    assignEntryNumbers(entries); // keep booklet numbering fresh after add/delete
    entriesCache = entries; // instant UI update…
    try {
      await saveEntriesToCloud(currentUser, entries); // …then synced to the cloud
      return true;
    } catch (e) {
      console.warn("sync: delete/save failed", e);   // toast shown by saveEntriesToCloud
      return false;
    }
  }

  // Delete ONE entry straight from the cloud row (id + owner), so the entry is
  // really removed from the cloud — not just hidden locally.
  async function deleteEntryFromCloud(id) {
    if (!currentUser) return false;
    try {
      await syncDelete("entries", "id=eq." + id + "&owner=eq." + encodeURIComponent(currentUser.toLowerCase()));
      entriesCache = entriesCache.filter((en) => Number(en.id) !== Number(id));
      return true;
    } catch (e) {
      console.warn("sync: cloud delete failed", e);
      showToast("⚠️ Could not delete from the cloud — please retry");
      return false;
    }
  }

  // Delete ALL entries of the current user from the cloud in one call.
  async function deleteAllEntriesFromCloud() {
    if (!currentUser) return false;
    try {
      await syncDelete("entries", "owner=eq." + encodeURIComponent(currentUser.toLowerCase()));
      entriesCache = [];
      return true;
    } catch (e) {
      console.warn("sync: cloud delete-all failed", e);
      showToast("⚠️ Could not delete from the cloud — please retry");
      return false;
    }
  }

  // ---------- Word counting ----------
  // Only the real diary words are counted — never the bookkeeping bits:
  //   • an entry-number prefix on a line ("#12", "12.", "(12)" before the
  //     dash / date / sender, e.g. "#12 - Message: [12 January 2026, 08:15 AM] - Deep: …")
  //   • the soft labels "Message:", "What I felt:" and "Note:" themselves
  //     (the words written AFTER those labels do count).
  // The Supabase rows only store the entry for saving purposes, so this is
  // also what lands in the "words" column of the entries table.

  // Count the words of a WHOLE entry body ('Deep: "msg"' + optional
  // "What I felt: …" / "Note: …" lines): the label words themselves and any
  // entry number are never counted — only the message text and the feeling /
  // note text the user actually wrote.
  function countWords(text) {
    let n = 0;
    String(text || "").split(/\r?\n/).forEach((ln) => {
      let t = ln.replace(/^\s*[#(]?\d{1,7}[).]?\s+(?=[-\[]|-?\s*Message\s*:)/, ""); // drop "#12"/"12."/"(12)"
      const fm = t.match(/^(\s*-+\s*)?What\s+I\s+felt\s*:\s*(.*)$/i);
      const nm = t.match(/^(\s*-+\s*)?Note\s*:\s*(.*)$/i);
      const ms = t.match(/^(\s*-+\s*)?Message\s*:\s*(?:\[[^\]]*\]\s*-?\s*)?(.*)$/i);
      if (fm) t = fm[2];
      else if (nm) t = nm[2];
      else if (ms) t = ms[2];
      // A bare "[12 January 2026, 08:15 AM] Deep: \"msg\"" line: skip the date
      const ds = t.match(/^\s*\[[^\]]*\]\s*-?\s*(.*)$/);
      if (ds) t = ds[1];
      // "Deep: \"msg\"" / "[date] - Deep: \"msg\"": keep only what the person
      // actually wrote — the sender label and the surrounding quotes are
      // never counted. Plain diary prose (no quoted message) counts as-is.
      const sm = t.match(/^\s*(?:[-–—]+\s*)?(?:[[][^[\]]*[]]\s*(?:[-–—]+\s*)?)?(?:[A-Za-z\u0900-\u097F][A-Za-z .'\u0900-\u097F]{0,30}|[^:]*[^\w:\s])\s*:\s*(["“])(.+)\1\s*$/i);
      if (sm && sm[2].trim()) t = sm[2];
      const trimmed = t.trim().replace(/^["“”']|["“”']$/g, "").trim();
      if (trimmed) n += trimmed.split(/\s+/).length;
    });
    return n;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      weekday: "short", year: "numeric", month: "short", day: "numeric"
    }) + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(msg) {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  // ---------- Theme toggle (cloud-synced per account) ----------
  const themeBtn = $("#themeToggle");
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  }
  async function loadThemePref(email) {
    if (!email) return;
    try {
      const rows = await syncGet("users", "select=theme&email=eq." + encodeURIComponent(email.toLowerCase()));
      if (rows && rows.length && rows[0].theme) {
        themePref = rows[0].theme;
        applyTheme(themePref);
      }
    } catch (e) { /* keep current theme */ }
  }
  function saveThemePref(theme) {
    themePref = theme;
    if (!currentUser) return;
    syncPatch("users", "email=eq." + encodeURIComponent(currentUser.toLowerCase()), { theme }).catch(() => {});
  }
  applyTheme("light");
  themeBtn.addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
    saveThemePref(next);
  });

  // ---------- Mobile menu ----------
  const hamburger = $("#hamburger");
  const navLinks = $("#navLinks");
  hamburger.addEventListener("click", () => {
    hamburger.classList.toggle("open");
    navLinks.classList.toggle("open");
  });
  navLinks.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      hamburger.classList.remove("open");
      navLinks.classList.remove("open");
    }
  });

  // ---------- Active nav link on scroll ----------
  const sections = $$("section[id]");
  window.addEventListener("scroll", () => {
    let current = "home";
    sections.forEach((sec) => {
      if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
    });
    $$(".nav-links a").forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + current);
    });
  });

  // ---------- Scroll reveal ----------
  const observer = new IntersectionObserver(
    (items) => {
      items.forEach((item) => {
        if (item.isIntersecting) {
          item.target.classList.add("visible");
          observer.unobserve(item.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  $$(".reveal").forEach((el) => observer.observe(el));

  // ---------- Live ENTRY COUNT (message counter — NOT a word summary) ----------
  // The screen under the editor shows ONLY the running count of entries:
  // "N entries counted". It deliberately does NOT display a words/characters
  // summary there. 🧮 Rule: the special "📌 FINAL SUMMARY" entry is NEVER part
  // of this count — counting stops before the summary block; if you want the
  // summary counted too, it continues on the OTHER side of the calculator
  // (the 🧮 Message Counter panel's second card).
  const bodyInput = $("#entryBody");
  const liveCount = $("#liveCount");
  function updateLiveEntryCount() {
    const typedWords = countWords(bodyInput.value);              // words being written right now
    const typed = typedWords > 0 ? 1 : 0;                        // the draft counts as one live entry
    // 🧮 The running WORD total deliberately EXCLUDES the 📌 FINAL SUMMARY
    // entry onward — same rule as the message count. If you want the summary
    // counted too, it continues on the OTHER side of the calculator (the
    // 🧮 Message Counter panel's second card), never in this line.
    const c = computeMessageCount();
    liveCount.textContent = (c.realCount + typed) + " entries counted, " +
      (c.realWords + typedWords).toLocaleString() + " words written";
  }
  bodyInput.addEventListener("input", updateLiveEntryCount);


  // ---------- Save entry ----------
  const form = $("#entryForm");

  function getSelectedSender() {
    const r = $('input[name="sender"]:checked');
    return r ? r.value : "Deep";
  }

  // 📂 CATEGORY / HEADING OPTION AT THE START OF THE BOOK:
  // script.js injects a "Category" dropdown into the editor's meta row — the
  // 15 diary headings plus an auto-detect default. Entries saved with a
  // category are filed under that heading, and the preview chips at the top
  // of the entries section then show ONLY the entries matching the selected
  // heading. Nothing had to be added to index.html for this.
  function ensureHeadingSelect() {
    let sel = $("#entryHeading");
    if (sel) return sel;
    const meta = document.querySelector(".editor-meta");
    if (!meta) return null;
    sel = document.createElement("select");
    sel.id = "entryHeading";
    sel.title = "Category / heading — the preview filter shows only entries matching the selected heading";
    sel.innerHTML =
      '<option value="">📂 Auto-detect category</option>' +
      DIARY_HEADINGS.map((h) => '<option value="' + escapeHtml(h.label) + '">' + escapeHtml(h.label) + "</option>").join("");
    const moodSel = $("#entryMood");
    if (moodSel && moodSel.parentNode === meta) meta.insertBefore(sel, moodSel);
    else meta.appendChild(sel);
    return sel;
  }
  ensureHeadingSelect();

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!currentUser) {
      showToast("Please sign in first to save entries 🔒");
      openAuth("signin");
      return;
    }
    const title = $("#entryTitle").value.trim();
    const body = bodyInput.value.trim();
    const mood = $("#entryMood").value;
    const sender = getSelectedSender();
    // 📂 chosen category — or auto-detected from the message text when the
    // user leaves the dropdown on "Auto-detect".
    const headingSel = $("#entryHeading");
    const heading = (headingSel && headingSel.value) || detectHeading(body, sender);
    if (!title || !body) {
      showToast("Please add a title and some words 🐄");
      return;
    }
    const entries = loadEntries();
    entries.unshift({
      id: Date.now(),
      title,
      body,
      mood,
      sender, // message belongs ONLY to the person chosen — never mixed up
      heading, // filed under this category → the preview chips filter by it
      date: new Date().toISOString(),
      words: countWords(body)
    });
    saveEntries(entries);
    form.reset();
    // reset radio back to default (Deep) after form.reset()
    const defRadio = $('input[name="sender"][value="Deep"]');
    if (defRadio) defRadio.checked = true;
    updateLiveEntryCount();
    renderEntries();
    updateStats();
    showToast("Entry saved as a message from " + sender + " 🥛");
  });

  $("#clearBtn").addEventListener("click", () => {
    setTimeout(updateLiveEntryCount, 0);
  });

  // ---------- Render entries ----------
  const listEl = $("#entriesList");
  const emptyEl = $("#emptyState");
  const searchEl = $("#searchInput");

  // Re-read the diary straight from the cloud so every device shows the same,
  // freshest data (this is what "sync" means here — no local copies).
  async function refreshFromCloud() {
    if (!currentUser) { entriesCache = []; return; }
    entriesCache = await loadEntriesFromCloud(currentUser);
  }

  async function renderEntries() {
    await refreshFromCloud();
    const query = searchEl.value.trim().toLowerCase();
    // 📂 CATEGORY FILTER: when a heading chip is selected, the preview shows
    // ONLY the entries filed under that heading (search still applies on top).
    const entries = loadEntries().filter(
      (en) =>
        (!activeHeadingFilter || (en.heading || "(No heading)") === activeHeadingFilter) &&
        (!query ||
          en.title.toLowerCase().includes(query) ||
          en.body.toLowerCase().includes(query))
    );
    renderHeadingChips();

    listEl.innerHTML = "";
    emptyEl.style.display = entries.length ? "none" : "block";
    if (!currentUser) {
      emptyEl.textContent = "🔒 Private area — please Sign In to view your diary.";
      emptyEl.classList.add("locked");
    } else if (entries.length === 0 && activeHeadingFilter) {
      // Category selected but nothing filed under it yet — say so clearly
      // instead of the generic "no entries" message.
      emptyEl.textContent = "📂 No entries under “" + activeHeadingFilter + "” yet — pick 🗂 All or file a message here from the editor’s Category dropdown.";
      emptyEl.classList.remove("locked");
    } else {
      emptyEl.textContent = "No entries yet — your first page is waiting. ✨ (click here to sign in as another user)";
      emptyEl.classList.remove("locked");
    }
    // Disable search/delete-all for visitors
    searchEl.disabled = !currentUser;
    $("#deleteAllBtn").disabled = !currentUser;

    // NO numbering on the cards (user rule) — counting lives only in the
    // separate 🧮 Message Counter panel.
    entries.forEach((en) => {
      const article = document.createElement("article");
      article.className = "entry";
      const senderBadge = en.sender
        ? '<span class="sender-badge ' + (en.sender === "Deep" ? "badge-deep" : "badge-chota") + '">📨 ' + escapeHtml(en.sender) + "</span>"
        : "";
      // COMPACT PREVIEW on the cards — FORMATTED, IDENTICAL TO THE BOOKLET:
      // the card body now runs through the EXACT same renderer the booklet
      // bubbles use (formatBookBodyHtml), so every entry — hand-written or
      // legacy-imported, first on the page or last — is formatted the same
      // way: the message line plus a styled 💭 "How I felt:" / 📝 "Note:"
      // block. The old path double-scrubbed the renderer's own markup with
      // finalScrub(), which glued the felt note onto the message and left
      // &quot; entities visible — the raw-HTML look some entries still had.
      // Now only CONTENT units are scrubbed (inside formatBookBodyHtml),
      // never the presentation markup, and the card simply re-emits that
      // markup with its own CSS classes below.
      const previewBodyHtml = formatBookBodyHtml(en.body, en.sender);
      // Turn the bubble HTML into card-safe markup: <span class="eb-extra">
      // becomes a block-level .felt line (a <span> inside the pre-wrap <p>
      // would not break onto its own row), the eb-label keeps its styling.
      // Nothing else in the string can contain markup (every content unit was
      // finalScrub()-flattened + escapeHtml()-escaped by the renderer).
      const previewBody = previewBodyHtml
        .replace(/<span class="eb-extra"><span class="eb-label">/g, '<br><span class="felt"><span class="eb-label">')
        .replace(/<\/span><\/span>/g, "</span></span>");
      article.innerHTML =
        "<header>" +
          "<h3>" + en.mood + " " + escapeHtml(en.title) + "</h3>" +
          '<span class="date">' + formatDate(en.date) + "</span>" +
          senderBadge +
          (en.heading ? '<span class="heading-badge">📂 ' + escapeHtml(en.heading) + "</span>" : "") +
        "</header>" +
        '<p class="body">' + previewBody + "</p>" +
        "<footer>" +
          '<button class="del" data-id="' + en.id + '">🗑 Delete</button>' +
        "</footer>";
      listEl.appendChild(article);
    });
  }

  // ---------- Password-protected delete (entries are removed from the cloud too) ----------
  const DELETE_PASSWORD = "DeepuH@2805";
  const deleteModalEl = $("#deleteModal");
  const deletePassEl = $("#deletePass");
  const deleteErrorEl = $("#deleteError");
  let pendingDelete = null; // { type: "one", id } | { type: "all" }

  function openDeleteModal(payload, label) {
    pendingDelete = payload;
    deletePassEl.value = "";
    deleteErrorEl.textContent = "";
    $("#deleteSub").textContent = label;
    deleteModalEl.classList.remove("hidden");
    setTimeout(() => deletePassEl.focus(), 50);
  }

  function closeDeleteModal() {
    deleteModalEl.classList.add("hidden");
    pendingDelete = null;
    deletePassEl.value = "";
    deleteErrorEl.textContent = "";
  }

  $("#deleteClose").addEventListener("click", closeDeleteModal);
  $("#deleteCancelBtn").addEventListener("click", closeDeleteModal);
  deleteModalEl.addEventListener("click", (e) => {
    if (e.target === deleteModalEl) closeDeleteModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !deleteModalEl.classList.contains("hidden")) closeDeleteModal();
  });

  $("#deleteForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!pendingDelete || !currentUser) { closeDeleteModal(); return; }
    if (deletePassEl.value !== DELETE_PASSWORD) {
      deleteErrorEl.textContent = "❌ Wrong password — entry not deleted.";
      deletePassEl.select();
      return;
    }
    const payload = pendingDelete;
    closeDeleteModal();
    let ok = false;
    if (payload.type === "one") {
      ok = await deleteEntryFromCloud(payload.id);
      if (ok) showToast("🗑 Entry deleted — removed from the cloud too ✓");
    } else {
      ok = await deleteAllEntriesFromCloud();
      if (ok) showToast("All entries cleared from the cloud ✓");
    }
    renderEntries();
    updateStats();
  });

  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".del");
    if (!btn) return;
    if (!currentUser) { showToast("Please sign in first 🔒"); return; }
    const id = Number(btn.dataset.id);
    openDeleteModal(
      { type: "one", id },
      "Enter the secret password to delete this entry. It will be removed from the cloud as well — this cannot be undone."
    );
  });

  searchEl.addEventListener("input", renderEntries);

  // Clicking the locked empty state opens sign in
  emptyEl.addEventListener("click", () => {
    if (!currentUser) openAuth("signin");
  });

  $("#deleteAllBtn").addEventListener("click", () => {
    if (!currentUser) { showToast("Please sign in first 🔒"); return; }
    if (!loadEntries().length) {
      showToast("Nothing to delete yet 😌");
      return;
    }
    openDeleteModal(
      { type: "all" },
      "Enter the secret password to delete ALL your entries. They will be removed from the cloud as well — this cannot be undone."
    );
  });

  // ---------- Stats & streak ----------
  function computeStreak(entries) {
    const days = new Set(entries.map((e) => new Date(e.date).toDateString()));
    let streak = 0;
    const cursor = new Date();
    // Allow streak to start today or yesterday
    if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
    while (days.has(cursor.toDateString())) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  async function updateStats() {
    await refreshFromCloud();
    const entries = loadEntries();
    // 🧮 "Messages counted" EXCLUDES the 📌 FINAL SUMMARY entry — the summary
    // is counted separately on the other side of the Message Counter panel.
    const c = computeMessageCount();
    $("#statEntries").textContent = c.realCount;
    $("#statWords").textContent = entries.reduce((sum, e) => sum + (e.words || countWords(e.body)), 0);
    $("#statStreak").textContent = computeStreak(entries);
    renderCounterPanel();      // keep the separate counter in sync
    updateLiveEntryCount();    // keep the editor's "N entries counted" in sync
    renderHeadingChips();      // headings may appear/disappear with the entries
  }

  // ---------- 📂 CATEGORY / HEADING FILTER ----------
  // At the start of the entries section there is a row of category chips:
  // one per heading present in the diary (+ All). The preview shows ONLY the
  // entries matching the selected heading (search text still applies on top).
  let activeHeadingFilter = "";   // "" = All categories
  function headingCounts() {
    const map = {};
    loadEntries().forEach((en) => {
      const h = en.heading || "(No heading)";
      map[h] = (map[h] || 0) + 1;
    });
    return map;
  }
  // The chip row is injected by script.js itself (no index.html change
  // needed): it sits at the START of the entries preview, right above the
  // search toolbar.
  function ensureHeadingChipRow() {
    let wrap = $("#headingChips");
    if (wrap) return wrap;
    const toolbar = document.querySelector(".entries-toolbar");
    const section = toolbar ? toolbar.parentNode : $("#entriesList") && $("#entriesList").parentNode;
    if (!section) return null;
    wrap = document.createElement("div");
    wrap.id = "headingChips";
    wrap.className = "heading-chips";
    wrap.setAttribute("role", "tablist");
    wrap.setAttribute("aria-label", "Filter entries by heading / category");
    if (toolbar) section.insertBefore(wrap, toolbar);
    else section.insertBefore(wrap, section.firstChild);
    wireHeadingChipClicks(wrap);
    return wrap;
  }
  function renderHeadingChips() {
    const wrap = ensureHeadingChipRow();
    if (!wrap) return;
    const counts = headingCounts();
    const keys = Object.keys(counts).sort((a, b) =>
      a === "(No heading)" ? 1 : b === "(No heading)" ? -1 : a.localeCompare(b));
    const total = loadEntries().length;
    const chip = (label, value, n) =>
      '<button type="button" class="h-chip' +
      (activeHeadingFilter === value ? " active" : "") +
      '" data-heading="' + escapeHtml(value) + '">' +
      escapeHtml(label) + ' <span class="h-chip-n">' + n + "</span></button>";
    wrap.innerHTML =
      chip("🗂 All", "", total) +
      keys.map((k) => chip(k, k, counts[k])).join("");
  }
  function wireHeadingChipClicks(wrap) {
    wrap.addEventListener("click", (e) => {
      const btn = e.target.closest(".h-chip");
      if (!btn) return;
      activeHeadingFilter = btn.dataset.heading || "";
      renderHeadingChips();
      renderEntries();
    });
  }
  // If the row already exists in the page markup, wire it up immediately.
  const existingChipRow = $("#headingChips");
  if (existingChipRow) wireHeadingChipClicks(existingChipRow);

  // ---------- 📖 BOOK-VIEW CATEGORY / HEADING FILTER ----------
  // Inside the A4 Book View there is its OWN filter bar at the START of the
  // book: one chip per heading present in the diary (+ "All"), plus a sender
  // toggle (Deep / Honey). The book preview then shows ONLY the entries
  // matching the selected heading (and sender). When nothing is selected —
  // i.e. the default "🗂 All" state — the book previews EXACTLY as regular:
  // every entry, cover first, flowed oldest → newest.
  // This state is independent from the main-screen chips above: picking a
  // category on one surface never silently filters the other.
  let bookHeadingFilter = "";   // "" = All categories (regular book)
  let bookSenderFilter = "";    // "" = Both senders
  function bookHeadingCounts() {
    const map = {};
    loadEntries().forEach((en) => {
      const h = en.heading || "(No heading)";
      map[h] = (map[h] || 0) + 1;
    });
    return map;
  }
  // Injected by script.js itself — no index.html change needed. It sits at
  // the very start of the book view, right under the title and ABOVE the
  // pages, so it stays visible while the reader flips sheets (phone mode:
  // under the app bar, above the sheet stage).
  function ensureBookFilterBar() {
    let bar = $("#bookFilterBar");
    if (bar) return bar;
    const stage = document.querySelector("#bookModal .book-stage");
    if (!stage) return null;
    bar = document.createElement("div");
    bar.id = "bookFilterBar";
    bar.className = "book-filter-bar";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Filter the book preview by heading / category and sender");
    stage.parentNode.insertBefore(bar, stage);
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".bf-chip");
      if (!btn) return;
      if (btn.dataset.bfKind === "heading") {
        bookHeadingFilter = btn.dataset.bfValue || "";
      } else if (btn.dataset.bfKind === "sender") {
        const v = btn.dataset.bfValue || "";
        bookSenderFilter = bookSenderFilter === v ? "" : v; // tap again = clear
      } else return;
      rebuildBookPreview();
    });
    return bar;
  }
  function renderBookFilterBar() {
    const bar = ensureBookFilterBar();
    if (!bar) return;
    const counts = bookHeadingCounts();
    const keys = Object.keys(counts).sort((a, b) =>
      a === "(No heading)" ? 1 : b === "(No heading)" ? -1 : a.localeCompare(b));
    const total = loadEntries().length;
    const chip = (kind, label, value, n, active) =>
      '<button type="button" class="bf-chip' + (active ? " active" : "") + '"' +
      ' data-bf-kind="' + kind + '" data-bf-value="' + escapeHtml(value) + '">' +
      escapeHtml(label) + (n != null ? ' <span class="bf-chip-n">' + n + "</span>" : "") +
      "</button>";
    bar.innerHTML =
      '<span class="bf-label">📂 In this book:</span>' +
      chip("heading", "🗂 All", "", total, bookHeadingFilter === "") +
      keys.map((k) => chip("heading", k, k, counts[k], bookHeadingFilter === k)).join("") +
      '<span class="bf-sep"></span>' +
      '<span class="bf-label">📨 From:</span>' +
      chip("sender", "Both", "", null, bookSenderFilter === "") +
      chip("sender", "Deep", "Deep", null, bookSenderFilter === "Deep") +
      chip("sender", "Honey", "Honey", null, bookSenderFilter === "Honey");
  }
  // Re-page the book with the current selection and jump back to page 1 —
  // filtered books are shorter, so an old bookmark must never dangle.
  async function rebuildBookPreview() {
    spread = 0;
    savedSpreadCloud = 0;
    $("#leftContent").innerHTML = "";
    $("#rightContent").innerHTML = "";
    bookPages = await buildBookPages();
    renderSpread();
    const shown = countBookFilteredEntries();
    if (bookHeadingFilter || bookSenderFilter) {
      showToast(shown > 0
        ? "📖 Book filtered — showing " + shown + " match" + (shown === 1 ? "ing entry" : "ing entries") + " ✨"
        : "📖 No entries match this filter — pick another heading or tap 🗂 All");
    }
  }
  function countBookFilteredEntries() {
    return loadEntries().filter(bookEntryMatchesFilter).length;
  }
  // ONE shared predicate used by BOTH the live book builder and the printed
  // booklet, so the PDF always matches what the screen preview showed.
  // Nothing selected (the default) ⇒ every entry passes ⇒ regular book.
  function bookEntryMatchesFilter(en) {
    if (!en) return false;
    const h = bookHeadingFilter ? (en.heading || "(No heading)") : "";
    if (bookHeadingFilter && h !== bookHeadingFilter) return false;
    if (bookSenderFilter && String(en.sender || "") !== bookSenderFilter) return false;
    return true;
  }

  // ---------- ✍️ ADD-TO-THE-BACK-OF-THE-BOOK ----------
  // While a category filter is active inside the book view, the SAVE tab
  // grows into a ➕ Add button: writing a message for that category adds it
  // to the END of the book (newest position) and keeps the filter applied,
  // so the fresh entry appears right where the reader expects it.
  let bookAddOpen = false;
  function ensureBookAddControls() {
    // ➕ Add tab in the phone bottom bar (hidden until a book filter is on)
    const tabbar = $("#appTabbar");
    if (tabbar && !$("#tabAddEntry")) {
      const btn = document.createElement("button");
      btn.className = "app-tab hidden";
      btn.id = "tabAddEntry";
      btn.type = "button";
      btn.title = "Add a new entry under the selected heading — goes to the end of the book";
      btn.innerHTML = '<span class="app-tab-ic">➕</span><span class="app-tab-lbl">Add</span>';
      const tSave = $("#tabSave");
      tabbar.insertBefore(btn, tSave || null);
    }
    // Desktop control row gets the same ➕ Add button
    const controls = document.querySelector("#bookModal .book-controls");
    if (controls && !$("#addEntryDesktopBtn")) {
      const btn2 = document.createElement("button");
      btn2.className = "btn btn-primary hidden";
      btn2.id = "addEntryDesktopBtn";
      btn2.type = "button";
      btn2.textContent = "➕ Add Entry";
      btn2.title = "Add a new entry under the selected heading — goes to the end of the book";
      const sBtn = $("#saveBookBtn");
      controls.insertBefore(btn2, sBtn || null);
    }
    // The mini writing pane lives INSIDE the stage next to the sheet, so it
    // is always fully visible within the book view (phone + desktop).
    const stage = document.querySelector("#bookModal .book-stage");
    if (stage && !$("#bookAddPane")) {
      const pane = document.createElement("div");
      pane.className = "book-add-pane hidden";
      pane.id = "bookAddPane";
      pane.innerHTML =
        '<h4 class="ba-title">✍️ New entry <span class="ba-sub" id="baSub"></span></h4>' +
        '<form id="bookAddForm">' +
          '<input id="baTitle" type="text" placeholder="Title…" autocomplete="off">' +
          '<textarea id="baBody" rows="5" placeholder="Dear Diary…"></textarea>' +
          '<div class="ba-meta">' +
            '<select id="baHeading" title="Category / heading"></select>' +
            '<select id="baSender" title="Who wrote this message?">' +
              '<option value="Deep">🥛 Deep</option><option value="Honey">🍯 Honey</option>' +
            '</select>' +
            '<select id="baMood" title="Mood">' +
              '<option value="😊">😊 Happy</option><option value="😌">😌 Calm</option>' +
              '<option value="🤔">🤔 Thoughtful</option><option value="😴">😴 Tired</option>' +
              '<option value="🥲">🥲 Bittersweet</option><option value="🔥">🔥 Inspired</option>' +
            '</select>' +
          '</div>' +
          '<div class="ba-btns">' +
            '<button type="button" class="btn btn-ghost" id="baCancel">Cancel</button>' +
            '<button type="button" class="btn btn-primary" id="baSave">💾 Save to End of Book</button>' +
          '</div>' +
        '</form>';
      stage.appendChild(pane);
    }
    if (!$("#bookAddPane")?.dataset.wired) {
      wireBookAddControls();
      const p = $("#bookAddPane"); if (p) p.dataset.wired = "1";
    }
    const dBtn = $("#addEntryDesktopBtn");
    if (dBtn && !dBtn.dataset.wired) {
      dBtn.dataset.wired = "1";
      dBtn.addEventListener("click", () => { bookAddOpen ? closeBookAddPane() : openBookAddPane(); });
    }
    syncBookAddBtns();
  }
  function syncBookAddBtns() {
    const show = !!(bookHeadingFilter || bookSenderFilter);
    const dBtn = $("#addEntryDesktopBtn");
    if (dBtn) dBtn.classList.toggle("hidden", !show);
    const sub = $("#baSub");
    if (sub) {
      const parts = [];
      if (bookHeadingFilter) parts.push(bookHeadingFilter);
      if (bookSenderFilter) parts.push("from " + bookSenderFilter);
      sub.textContent = parts.length ? "→ " + parts.join(" ") + " · goes to the END of the book" : "";
    }
  }
  function updateBookAddBtn() {
    const btn = $("#tabAddEntry");
    if (!btn) return;
    const show = !!(bookHeadingFilter || bookSenderFilter);
    btn.classList.toggle("hidden", !show);
    if (show) {
      const lbl = btn.querySelector(".app-tab-lbl");
      if (lbl) lbl.textContent = "➕ Add";
      btn.title = "Add a new entry under “" + (bookHeadingFilter || "filtered selection") +
        "” — it goes to the end of the book";
    }
    syncBookAddBtns();
  }
  function openBookAddPane() {
    const pane = $("#bookAddPane");
    if (!pane) return;
    bookAddOpen = true;
    pane.classList.remove("hidden");
    const t = $("#baTitle"), b = $("#baBody");
    if (t) t.value = "";
    if (b) b.value = "";
    const sel = $("#baHeading");
    if (sel) {
      // Preselect the heading currently being viewed in the book.
      sel.innerHTML =
        '<option value="">✍️ Auto-detect category</option>' +
        DIARY_HEADINGS.map((h) =>
          '<option value="' + escapeHtml(h.label) + '"' +
          (h.label === bookHeadingFilter ? " selected" : "") + ">" +
          escapeHtml(h.label) + "</option>").join("") +
        ((bookHeadingFilter && !DIARY_HEADINGS.some((h) => h.label === bookHeadingFilter))
          ? '<option value="' + escapeHtml(bookHeadingFilter) + '" selected>' +
            escapeHtml(bookHeadingFilter) + "</option>"
          : "");
    }
    const who = $("#baSender");
    if (who) who.value = bookSenderFilter || getSelectedSender();
    fitBookZoom();
    if (t) setTimeout(() => t.focus(), 60);
  }
  function closeBookAddPane() {
    bookAddOpen = false;
    const pane = $("#bookAddPane");
    if (pane) pane.classList.add("hidden");
    fitBookZoom();
  }
  async function saveBookAddEntry() {
    if (!currentUser) { closeBookAddPane(); openAuth("signin"); showToast("Please sign in first 🔒"); return; }
    const titleEl = $("#baTitle"), bodyEl = $("#baBody");
    const title = titleEl ? titleEl.value.trim() : "";
    const body = bodyEl ? bodyEl.value.trim() : "";
    if (!title || !body) { showToast("Please add a title and some words 🐄"); return; }
    const selHead = $("#baHeading");
    const heading = (selHead && selHead.value) || detectHeading(body, ($("#baSender") || {}).value || "Deep");
    const sender = ($("#baSender") || {}).value || getSelectedSender();
    const mood = ($("#baMood") || {}).value || "love";
    const en = {
      id: Date.now(),
      title: title,
      body: body,
      mood: mood,
      sender: sender,
      heading: heading,           // filed under the category being read
      date: new Date().toISOString(),
      words: countWords(body),
    };
    try {
      await syncPost("entries", [{
        id: en.id, owner: currentUser.toLowerCase(), title: en.title, body: en.body,
        mood: en.mood, sender: en.sender, heading: en.heading, date: en.date, words: en.words,
      }]);
      entriesCache = entriesCache.concat([en]); // newest ⇒ flows to the END of the book
      closeBookAddPane();
      renderHeadingChips();
      renderEntries();
      await rebuildBookPreview();   // keeps the active filter — new entry lands last
      showToast("✅ Added to the end of the book 📖✨");
    } catch (e) {
      showToast("☁️ Could not save to the cloud — check your connection");
    }
  }
  function wireBookAddControls() {
    const tabAdd = $("#tabAddEntry");
    if (tabAdd) tabAdd.addEventListener("click", () => { bookAddOpen ? closeBookAddPane() : openBookAddPane(); });
    const cancel = $("#baCancel"); if (cancel) cancel.addEventListener("click", closeBookAddPane);
    const save = $("#baSave"); if (save) save.addEventListener("click", saveBookAddEntry);
    const form2 = $("#bookAddForm");
    if (form2) form2.addEventListener("submit", (e) => { e.preventDefault(); saveBookAddEntry(); });
  }

  // ---------- Writing prompts ----------
  const prompts = [
    "Describe the best thing that happened today in three sentences.",
    "What made you smile today, and why?",
    "Write about a smell that brings back a memory.",
    "If today were a weather report, what would it say?",
    "List three small things you're grateful for right now.",
    "What's one thing you learned this week?",
    "Describe your perfect lazy Sunday in detail.",
    "Write a letter to yourself one year from now.",
    "What sound do you love? Capture it with words.",
    "Recount today like it's a fairy tale: 'Once upon a day…'",
    "What would you tell your younger self about hard days?",
    "Describe your favourite meal as if it were a work of art.",
    "Who made today easier for someone else? Tell their story.",
    "What's a place you want to visit, and what do you imagine there?",
    "Finish this sentence: 'Today tasted like…'"
  ];

  const promptText = $("#promptText");
  $("#newPromptBtn").addEventListener("click", () => {
    promptText.classList.add("fade");
    setTimeout(() => {
      let p;
      do {
        p = prompts[Math.floor(Math.random() * prompts.length)];
      } while (p === promptText.textContent && prompts.length > 1);
      promptText.textContent = "“" + p + "”";
      promptText.classList.remove("fade");
    }, 250);
  });

  // ---------- Contact form (demo only) ----------
  $("#contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const msg = $("#contactMsg").value.trim();
    if (!msg) return;
    showToast("Thanks! Your message was noted 🐮💌");
    e.target.reset();
  });

  // ---------- Footer year ----------
  $("#year").textContent = new Date().getFullYear();


  // ---------- Auth UI (Signup / Sign In / Logout) ----------
  const authModal = $("#authModal");
  const authBtn = $("#authBtn");
  const userChip = $("#userChip");
  const userMenu = $("#userMenu");
  const authForm = $("#authForm");
  const authError = $("#authError");
  const tabSignin = $("#tabSignin");
  const tabSignup = $("#tabSignup");
  const nameInput = $("#authName");
  const emailInput = $("#authEmail");
  const passInput = $("#authPass");
  const pass2Input = $("#authPass2");
  const submitBtn = $("#authSubmit");
  const authTitle = $("#authTitle");
  const authSub = $("#authSub");
  const switchText = $("#authSwitchText");
  let authMode = "signin";

  function setAuthMode(mode) {
    authMode = mode;
    authError.textContent = "";
    const signin = mode === "signin";
    tabSignin.classList.toggle("active", signin);
    tabSignup.classList.toggle("active", !signin);
    nameInput.classList.toggle("hidden", signin);
    pass2Input.classList.toggle("hidden", signin);
    submitBtn.textContent = signin ? "Sign In" : "Create Account";
    authTitle.textContent = signin ? "Welcome back 🥛" : "Join Dairy Writing 🐄";
    authSub.textContent = signin
      ? "Sign in to open your private diary."
      : "Create an account — your entries stay visible only to you.";
    switchText.innerHTML = signin
      ? 'New here? <a href="#" id="authSwitchLink">Create an account</a>'
      : 'Already have an account? <a href="#" id="authSwitchLink">Sign in</a>';
    // The anchor is REBUILT by innerHTML on every mode switch — attach exactly
    // one fresh listener to the NEW node (the old code left listeners pointing
    // at removed elements, so switching signup ↔ signin could stop working).
    const link = document.getElementById("authSwitchLink");
    if (link) link.addEventListener("click", (e) => {
      e.preventDefault();
      setAuthMode(signin ? "signup" : "signin");
    });
  }

  function openAuth(mode) {
    setAuthMode(mode || "signin");
    authForm.reset();
    authModal.classList.remove("hidden");
    setTimeout(() => emailInput.focus(), 50);
  }
  function closeAuth() {
    authModal.classList.add("hidden");
  }

  tabSignin.addEventListener("click", () => setAuthMode("signin"));
  tabSignup.addEventListener("click", () => setAuthMode("signup"));
  $("#authClose").addEventListener("click", closeAuth);
  authModal.addEventListener("click", (e) => { if (e.target === authModal) closeAuth(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAuth(); });

  authBtn.addEventListener("click", () => openAuth("signin"));

  function updateUserUI() {
    const signedIn = !!currentUser;
    authBtn.classList.toggle("hidden", signedIn);
    userChip.classList.toggle("hidden", !signedIn);
    if (!signedIn) {
      userMenu.classList.add("hidden");
      return;
    }
    const u = usersMap[currentUser] || {};
    $("#userName").textContent = u.name || currentUser.split("@")[0];
    $("#userAvatar").textContent = (u.name || currentUser).trim().charAt(0).toUpperCase();
    $("#userEmail").textContent = currentUser;
  }

  userChip.addEventListener("click", (e) => {
    e.stopPropagation();
    userMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", () => userMenu.classList.add("hidden"));

  // Submit: signup or signin
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    authError.textContent = "";
    const email = emailInput.value.trim().toLowerCase();
    const pass = passInput.value;
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      authError.textContent = "Please enter a valid email address.";
      return;
    }
    if (pass.length < 6) {
      authError.textContent = "Password must be at least 6 characters.";
      return;
    }
    // Always verify against the FRESHEST account list from the cloud
    await refreshUsers();
    const users = usersMap;
    const hash = await hashPass(pass);

    if (authMode === "signup") {
      const name = nameInput.value.trim();
      if (!name) { authError.textContent = "Please tell us your name."; return; }
      if (users[email]) { authError.textContent = "An account with this email already exists. Sign in instead."; return; }
      if (pass2Input.value !== pass) { authError.textContent = "Passwords do not match."; return; }
      try {
        await upsertUser(email, { name, hash, created: new Date().toISOString() });
      } catch (err) {
        authError.textContent = "Could not reach the cloud — please try again.";
        return;
      }
      currentUser = email;
      syncLogin(email);
      closeAuth();
      afterLogin();
      showToast("Account created! Your diary is private 🔒");
    } else {
      const u = users[email];
      if (!u || u.hash !== hash) {
        authError.textContent = "Wrong email or password. Try again.";
        return;
      }
      currentUser = email;
      syncLogin(email);
      closeAuth();
      afterLogin();
      showToast("Welcome back, " + (u.name || "friend") + "! 🥛");
    }
  });

  // Remember the signed-in account in the cloud so the app reopens on the
  // same session everywhere — no cookies or local storage involved.
  function syncLogin(email) {
    loadThemePref(email);
    loadSavedSpreadFromCloud();
    // single active session row per account: clear old ones, then record this login
    syncDelete("sessions", "email=eq." + encodeURIComponent(email))
      .then(() => syncPost("sessions", [{ email, updated_at: new Date().toISOString() }]))
      .catch(() => {});
  }

  $("#logoutBtn").addEventListener("click", () => {
    currentUser = null;
    entriesCache = [];
    savedSpreadCloud = 0;
    userMenu.classList.add("hidden");
    updateUserUI();
    renderEntries();
    updateStats();
    showToast("Logged out. Your entries are safe 🔒");
  });

  function afterLogin() {
    updateUserUI();
    renderEntries();
    updateStats();
  }

    // Google Drive file IDs of the sticker images (links shared as "anyone with link")
  const STICKER_IDS = [
    "17M-8zQvs0BF9gzYI93Z0nei6ooGPxGfA",
    "1JggNm1KxFRuYZMKbqCEnOYsBURskrWI9",
    "18hE2dkGsnlbwBDVTFINwNMa63pDetSt9",
    "17wxYhy3Cu3rHLnvRvRMO3urJXUiWUtzg",
    "1-y190WR6Q3Bk7bKM-S6Zl8ErI9odP-aE",
    "1FZ2lN61jCDhcaN3mS_zB15j4ML7O09jb",
    "1TZNdfIP2rBMJxWds5k5zP-yS-kFnLuLv",
    "1Vz_13FY8TP6S0wmfFW7btjAGDVQEEEg8",
    "1ZwY_vZ_bLjllHqcOew7agnv5WOJIGxIf",
    "1pdTfatQT-_D4jGBhtcAjqgAQ2oiy7wY6",
    "1s2F1XHx3bpQyLLlLz3gb-J3Id2wcPzx7",
    "1j7GqBUp6KXv3bOtBTCFf4lpf2Fw8aJvf",
    "1u2Wz8hbUCrlNXAvoD6Rb8lwbSKrTpWQv",
    "1fx_ExF8sMpLaOXWV7VdA6ErLonu1UKpe",
    "1WsCMvkzNlod1MtuxmgWhOD-4LuilHvWO",
    "1gVva-CAhwrbDJxYirWoyUm-jbhN69PiL",
    "12JYTVeX-Rd9G8K2Bvl2gm383pRsGcJuO",
    "1wG_shZNGFJI6Z6uj09iecJyg58Xh6gH2",
    "1b9xkvIvddaBvqLoFWwNTV_YfkiaVri60",
    "1HleuIXrbZHaphyReRdFnDpI-kFmSgGdg",
    "17VRqFUKlsHMeUEzVgBR4KlskIwaFdMTo",
    "1wLKJc339nmnHsKJcSYyfKML30N14l59G",
    "1cQUlWnhQ4EtAeMhT4b18NRmZPVhkx5-G",
    "1Ni4twvvrJWsKvhQgdoyX26p8agHVPOuj",
    "1-ju_NLU-cvziLyHh7m_bSmqjvJEiVgea",
    "12x-MEudX1anWBopQRUjhOvWpbncY4i1D",
    "1ovV6DmbNn4NcXKxk1jFsvxW6yuBirdB3",
    "1bHyUMO7WyXKqN1WfIWLWjD2mdcqkh4eD",
    "1pB9bvyPrk-MD79Zwr2SuHeV2tsvYTEtE",
    "13hUXhbTqYSY123PKllomsxDazib60nx_",
    "1drh3ID1kb8KZs_nv8PvOhRjOXkOz6wgS",
    "1nt1yGP6KOSr5lT2aSSlBnVmXEITk_0rX",
    "1XT_5cAb5YBq8nviQgN_sBLcTnwrk7esG",
    "1ONQlG0tJ4y-vZU4z78fTvqBlpwv9RrN6",
    "1b0XttlpHeBHa680wtvVMd0k_AnJCWHVI",
    "1JkjRMAW3jcI43RmZmQuQqSvUIYdCslO7",
    "1sto-FCgik9-Ip8pkjPEmjKRDV7bjpKj3",
    "1OBBUZyej6yXNY_GgC6YV1qZYRK4VzGVj",
    "1qAqclhRqDZiwzIDDFeetMqBpCjD83ROe",
    "1l4eI6m0pi8uEyTxQiT-lV2McFpiZ2_J2",
    "1oClZsCdGzTEiSHNDgmYT2hhWW3w43Jml",
    "1gKuvL53bZ4yg0XgHJFyy1OC8uGQmDPuQ",
    "1hqPFVPTEWFhP2O_DDEiX0WGZy61BvV74",
    "1Ok-63JhnQp8fTfxy6Z-XbPcXl_OMS6j_",
    "1FH3v_pqbwVN4L1evuo16gtxDJY7ocyDl",
    "1_ym0y7743yo9ThYxb3z9CgfY7AA_yF6p",
    "17pR4UjNO460z1E5RHVohqXftq5LJae_n",
    "1-tXiHDVjNYbcBPOn4Ljm-A0i8VY42suX",
    "1wbaMfFF_Dvpnl95Oe3h3NWsQWT1dhPf2",
    "1kNGVK-iccxtCWBP02O4Xvc7GZARnjTOM"
  ];
  const STICKER_URLS = STICKER_IDS.map(id => "https://lh3.googleusercontent.com/d/" + id);

  // ---------- Sticker placement helpers ----------
  const MAX_STICKER_IN = 2;         // max sticker size = 2 x 2 inches
  const STICKER_GAP = 6;            // breathing gap so nothing touches

  // "Tiny" stickers (the small ones the engine shrinks to when a slot is
  // narrow) are allowed to sit ANYWHERE in the message area on the RIGHT-HAND
  // side and may gently OVERLAY the bubble card there — like real stickers
  // pasted over the corner of a note. Only tiny ones may overlay: big stickers
  // keep the old collision-free behaviour. The overlay cap is deliberately
  // smaller than .entry-bubble's right padding (18px, see style.css), so even
  // overlaid tiny stickers never touch a single letter.
  const TINY_STICKER_MAX_IN = 0.95;                       // ≈ 91 px at A4/96dpi
  const TINY_OVERLAY_CAP_PX = 14;                         // max bleed onto the card from its right edge
  function isTinySide(side) { return side <= TINY_STICKER_MAX_IN * 96; }

  // Pixels-per-inch of the CURRENT page element. The book is rendered at real
  // A4 size (210mm wide) but the whole spread is CSS-scaled down to fit the
  // screen, so clientWidth (unscaled layout px) differs from getBoundingClientRect
  // (scaled visual px). We derive inchPx from the LAYOUT width — stickers sized
  // in these pixels are exactly 2 inches on the printed sheet and shrink
  // together with the book when it is scaled to fit smaller screens.
  function pageInchPx(el) {
    // clientWidth of .page-content is the LAYOUT width of the sheet minus the
    // inner padding, so add the horizontal padding back to get full A4 width.
    let w = el.clientWidth || (el.getBoundingClientRect().width || 0);
    try {
      const cs = getComputedStyle(el);
      w += parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    } catch (e) { /* ignore */ }
    return w ? w / 8.267 : 96;      // A4 width = 210mm = 8.267 inches
  }

  // Deterministic per-page random number generator (mulberry32). Same page
  // key always decorates itself the same way; a new spread gets fresh art.
  function seededRand(seedStr) {
    let h = 1779033703 ^ seedStr.length;
    for (let i = 0; i < seedStr.length; i++) {
      h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    let a = (h ^ (h >>> 16)) >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const FALLBACK_STICKERS = [       // cute SVG stickers used if Drive images can't load
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="30" fill="#ffd54d"/><circle cx="22" cy="26" r="4" fill="#5b3d1e"/><circle cx="42" cy="26" r="4" fill="#5b3d1e"/><path d="M18 38 Q32 52 46 38" stroke="#5b3d1e" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 56 C10 40 6 22 18 14 C26 9 32 16 32 20 C32 16 38 9 46 14 C58 22 54 40 32 56Z" fill="#ff6b8a"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M32 4 L39 24 L60 24 L43 37 L49 58 L32 45 L15 58 L21 37 L4 24 L25 24 Z" fill="#ffb830"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><ellipse cx="32" cy="42" rx="22" ry="16" fill="#fffdf6" stroke="#5b3d1e" stroke-width="3"/><path d="M54 38 q8 -4 6 4 q-2 6 -8 3" fill="#fffdf6" stroke="#5b3d1e" stroke-width="3"/><circle cx="25" cy="40" r="2.5" fill="#5b3d1e"/><circle cx="39" cy="40" r="2.5" fill="#5b3d1e"/><path d="M28 47 q4 4 8 0" stroke="#5b3d1e" stroke-width="2.5" fill="none" stroke-linecap="round"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" fill="#7ecbff"/><circle cx="24" cy="28" r="3" fill="#1b3a5c"/><circle cx="40" cy="28" r="3" fill="#1b3a5c"/><path d="M24 40 Q32 48 40 40" stroke="#1b3a5c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
  ];

  // Rectangle overlap check (axis-aligned). EPSILON guards against sub-pixel
  // rounding so touching edges are never counted as an overlap.
  const EPS = 0.5;
  function rectsOverlap(a, b) {
    return !(a.x + a.w <= b.x + EPS || b.x + b.w <= a.x + EPS ||
             a.y + a.h <= b.y + EPS || b.y + b.h <= a.y + EPS);
  }

  // The sticker <img> is rotated in CSS by --rot (±10°), which makes its
  // VISUAL bounding box larger than the layout box used for placement:
  //   visualW = w·cosθ + h·sinθ. To guarantee rotated stickers never touch
  //   text or each other, every occupied rect is inflated by that extra
  //   spread before collision checks.
  const ROT_MAX_DEG = 10;
  const ROT_SPREAD = (Math.sin(ROT_MAX_DEG * Math.PI / 180)) || 0.18; // ≈0.174
  function inflate(r, pad) {
    return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
  }
  function stickerVisualPad(side) {
    return side * ROT_SPREAD + 1; // rotation growth + 1px safety
  }

  // Collect bounding boxes of ALL visible diary content on a page (headings,
  // dates, sender tags, body text, cover text, empty-page notes). Returned in
  // LAYOUT px coordinates local to `el` (the CSS-scaled book is normalised).
  function getContentRects(el) {
    const rects = [];
    const base = el.getBoundingClientRect();
    if (!base.width || !base.height) return rects;
    const k = el.clientWidth / base.width;   // visual -> layout scale
    const sel = ".entry-bubble, .entry-block, .entry-body, .empty-page, .book-cover > *";
    el.querySelectorAll(sel).forEach(node => {
      if (node.closest(".page-sticker")) return;
      let rs = null;
      if (node.classList.contains("entry-bubble")) {
        // only the TEXT lines inside the bubble are "occupied" — the card's
        // padding/border area may host a sticker without touching letters
        const ranges = [];
        node.querySelectorAll(".eb-head, .entry-body").forEach(tn => {
          const rng = document.createRange();
          rng.selectNodeContents(tn);
          ranges.push(rng);
          Array.from(rng.getClientRects()).forEach(r => (rs = rs || []).push(r));
        });
        ranges.forEach(r => r.detach ? r.detach() : null);
        if (!rs) return;
      } else {
        const r = node.getBoundingClientRect();
        if (!r.width || !r.height) return;
        rs = [r];
      }
      rs.forEach(r => {
        if (!r.width || !r.height) return;
        const top = Math.max(r.top, base.top);
        const bottom = Math.min(r.bottom, base.bottom);
        if (bottom - top > 0) {
          rects.push({
            x: (r.left - base.left) * k,
            y: (top - base.top) * k,
            w: r.width * k,
            h: (bottom - top) * k
          });
        }
      });
    });
    return rects;
  }

  // ---------- Sticker slot system (guaranteed placement) ----------
  // Instead of hunting for arbitrary gaps (which silently failed when the
  // text column was wide), pagination now LEAVES EMPTY STICKER SLOTS inside
  // each page: beside short lines (right side), BETWEEN stacked cards and
  // below the last line. The sticker engine simply reads those invisible
  // <div class="sticker-slot"> markers — so every slot gets its sticker,
  // always, in pure empty space, never over text, never overlapping another
  // sticker, max 2 x 2 inches.
  //
  // 🩹 SELF-HEALING SLOT READ: an invisible slot is `visibility:hidden`, and
  // some browsers report such elements with a ZERO bounding rect. That used
  // to silently drop EVERY slot here → zero candidates → no sticker ever
  // appeared on the live pages (the exact bug this rewrite fixes). So we
  // NEVER measure the hidden nodes: their left/top/width/height are plain
  // inline pixel styles written by the paginator, and .page-flow shares the
  // exact coordinate origin of .page-content — we parse the inline geometry
  // directly. As a final guarantee, if a decorated page still has no slot,
  // we re-derive one from the ACTUAL rendered text-line rects (anything the
  // sticker does not touch is genuinely empty space).
  function getStickerSlots(el) {
    const slots = [];
    const base = el.getBoundingClientRect();
    if (!base.width || !base.height) return slots;
    const k = el.clientWidth / base.width;   // visual -> layout scale

    // 1) explicit slots created by the paginator — read from the INLINE
    //    pixel geometry, immune to zero-size rects of hidden elements.
    el.querySelectorAll(".sticker-slot").forEach(node => {
      let x = parseFloat(node.style.left), y = parseFloat(node.style.top);
      let w = parseFloat(node.style.width), h = parseFloat(node.style.height);
      if ([x, y, w, h].some(v => !isFinite(v))) {
        // no inline styles (e.g. print-window clones): fall back to rects
        const r = node.getBoundingClientRect();
        if (!r.width || !r.height) return;
        x = (r.left - base.left) * k; y = (r.top - base.top) * k;
        w = r.width * k;              h = r.height * k;
      }
      if (w < 2 || h < 2) return;
      slots.push({ x, y, w, h });
    });

    // 2) self-heal: no stored slots (older markup / stripped DOM) → derive
    //    ONE guaranteed-empty square from the real rendered text rects:
    //    beside the shortest row (right side) or in the band under the last
    //    line — provably touching no letter.
    if (!slots.length) {
      const texts = getContentRects(el);
      if (texts.length) {
        const W = el.clientWidth, H = el.clientHeight;
        const inchPx = pageInchPx(el);
        const MAXSIDE = Math.min(MAX_STICKER_IN * inchPx, W * 0.45);
        let best = null;
        // right of every text row
        texts.forEach(t => {
          const freeW = W - (t.x + t.w) - STICKER_GAP;
          const side = Math.floor(Math.min(freeW, MAXSIDE, H - t.y));
          if (side >= 30 && (!best || side > best.s)) {
            best = { x: Math.round(t.x + t.w + STICKER_GAP), y: Math.round(t.y), s: side };
          }
        });
        // band below ALL text
        let lowestY = 0;
        texts.forEach(t => { if (t.y + t.h > lowestY) lowestY = t.y + t.h; });
        const gapH = H - lowestY - 6;
        if (gapH >= 34) {
          const side = Math.floor(Math.min(gapH, MAXSIDE, W - 24));
          if (side >= 30 && (!best || side >= best.s)) {
            best = { x: Math.round((W - side) / 2), y: Math.round(lowestY + 4), s: side };
          }
        }
        if (best) {
          const cand = { x: best.x, y: best.y, w: best.s, h: best.s };
          const touches = texts.some(t =>
            cand.x < t.x + t.w && t.x < cand.x + cand.w &&
            cand.y < t.y + t.h && t.y < cand.y + cand.h);
          if (!touches) slots.push({ x: best.x, y: best.y, w: best.s, h: best.s });
        }
      }
    }
    return slots;
  }

  // Decorate EVERY book page — cover included, entry pages AND blank pages.
  // Guarantees:
  //   • one sticker per empty slot (slots are created by the paginator so a
  //     sticker ALWAYS lands somewhere free — right beside the entry text or
  //     in the empty area under/around it)
  //   • size auto-adjusts to the slot, hard capped at 2 x 2 inches
  //   • stickers NEVER overlap each other or the diary text
  //   • shown instantly via built-in SVG art (works offline too); the real
  //     Google Drive image quietly swaps in as soon as it loads. No box, no
  //     frame — just the bare sticker image, slightly rotated like pasted art.
  function addStickersToPage(el, pageKey) {
    el._stickerToken = (el._stickerToken || 0) + 1;
    const token = el._stickerToken;

    // remove stale stickers from a previous render of this element
    el.querySelectorAll(".page-sticker").forEach(s => s.remove());

    const decorate = () => {
      if (el._stickerToken !== token) return true;   // superseded — stop retrying
      const W = el.clientWidth, H = el.clientHeight;
      if (!W || !H) return false;                    // not laid out yet -> retry

      let slots = getStickerSlots(el);

      // Fallback for pages WITHOUT any provable empty area (the cover sheet,
      // or a page whose text fills every row): NO sticker is placed there —
      // stickers live ONLY in genuinely empty places, never over or beside
      // occupied content. The self-healing slot read above already derives a
      // real free square from the rendered text rects whenever one exists,
      // so entry/blank pages with free space ALWAYS get their sticker.
      if (!slots.length) return true;   // no empty area → stay undecorated

      // At most ONE sticker per page body: keep the best (largest) slot.
      // Extra slots existed only as candidates — placing a sticker in every
      // one produced "two stickers, one small one tiny".
      let best = slots[0];
      for (const s of slots) {
        if (Math.min(s.w, s.h) > Math.min(best.w, best.h)) best = s;
      }
      slots = [best];

      const rand = seededRand(String(pageKey || "p"));
      const inchPx = pageInchPx(el);
      const maxSize = MAX_STICKER_IN * inchPx;
      const used = [];   // placed sticker boxes (layout px) to avoid collisions

      // LIVE safety net: exact rectangles of every visible text LINE on this
      // rendered page — a sticker may never cover any of them.
      const textRects = getContentRects(el);
      const hitsText = (rect) => {
        for (const t of textRects) {
          if (!rectsOverlap(rect, inflate(t, 2))) continue;
          return true;
        }
        return false;
      };

      slots.forEach((slot) => {
        // largest square that fits the slot AND avoids already-placed stickers
        let side = Math.min(slot.w, slot.h, maxSize);
        side = Math.floor(side);
        if (side < 30) return;                       // too tiny to bother
        // ABSOLUTE RULE: stickers live ONLY in empty areas and NEVER overlap
        // any text — not even tiny ones over a card's padding strip.
        let spot = null;
        // Randomised search: try random spots inside the slot first (so the
        // sticker lands in a RANDOM area of the free space every time), then
        // shrink until collision-free (rare).
        for (let s = side; s >= 30 && !spot; s -= Math.max(6, Math.floor(side / 6))) {
          const cands = [];
          for (let i = 0; i < 8; i++) {
            cands.push({
              x: slot.x + rand() * Math.max(0, slot.w - s),
              y: slot.y + rand() * Math.max(0, slot.h - s)
            });
          }
          cands.push(
            { x: slot.x, y: slot.y },
            { x: slot.x + slot.w - s, y: slot.y },
            { x: slot.x, y: slot.y + slot.h - s },
            { x: slot.x + slot.w - s, y: slot.y + slot.h - s },
            { x: slot.x + (slot.w - s) / 2, y: slot.y + (slot.h - s) / 2 }
          );
          for (const c of cands) {
            const rect = { x: c.x, y: c.y, w: s, h: s };
            let clash = false;
            for (const u of used) { if (rectsOverlap(rect, inflate(u, STICKER_GAP))) { clash = true; break; } }
            if (!clash && hitsText(inflate(rect, 1))) clash = true;   // NEVER over text — ever
            if (!clash && rect.x >= 0 && rect.y >= 0 && rect.x + s <= W && rect.y + s <= H) {
              spot = { x: Math.round(c.x), y: Math.round(c.y), side: s };
              break;
            }
          }
        }
        if (!spot) return;
        used.push({ x: spot.x, y: spot.y, w: spot.side, h: spot.side });

        const img = document.createElement("img");
        img.className = "page-sticker";
        img.alt = "";
        img.draggable = false;
        img.referrerPolicy = "no-referrer";
        img.style.width = spot.side + "px";
        img.style.height = spot.side + "px";
        img.style.left = spot.x + "px";
        img.style.top = spot.y + "px";
        img.style.setProperty("--rot", ((rand() * 16) - 8).toFixed(1) + "deg");
        // show instantly with built-in SVG art (never blank, works offline)…
        const svg = FALLBACK_STICKERS[Math.floor(rand() * FALLBACK_STICKERS.length)];
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        el.appendChild(img);
        requestAnimationFrame(() => img.classList.add("sticker-in"));

        // …and swap in the REAL Google Drive image the moment it is ready.
        const idx = Math.floor(rand() * STICKER_URLS.length);
        preloadImage(STICKER_URLS[idx]).then((loaded) => {
          if (!loaded || !loaded.naturalWidth || !document.body.contains(img)) return;
          if (el._stickerToken !== token) return;
          const ratio = loaded.naturalWidth / loaded.naturalHeight;
          let w = spot.side, h = spot.side;
          if (w / h > ratio) w = h * ratio; else h = w / ratio;
          img.style.width = Math.round(w) + "px";
          img.style.height = Math.round(h) + "px";
          img.src = STICKER_URLS[idx];
        });
      });
      return true;   // slots read successfully — stop retrying
    };

    // try right away; if the page isn't laid out yet, retry briefly
    if (decorate()) return;
    let waited = 0;
    const iv = setInterval(() => {
      waited += 100;
      if (el._stickerToken !== token) { clearInterval(iv); return; }
      if (decorate() || waited >= 4000) clearInterval(iv);
    }, 100);
  }

  // Load an image once; resolve with the Image on success, null on failure or
  // after a 6s timeout. Used only for the silent Drive-image UPGRADE — the
  // sticker itself is already visible via the instant SVG, so nothing ever
  // appears missing because of the network.
  const imgCache = {};
  function preloadImage(url) {
    if (imgCache[url]) return imgCache[url];
    imgCache[url] = new Promise((res) => {
      const im = new Image();
      let done = false;
      const finish = (v) => { if (!done) { done = true; res(v); } };
      const timer = setTimeout(() => finish(null), 6000);
      im.onload = () => { clearTimeout(timer); finish(im); };
      im.onerror = () => { clearTimeout(timer); finish(null); };
      im.referrerPolicy = "no-referrer";
      im.src = url;
    });
    return imgCache[url];
  }

  // Hidden measuring host: an EXACT, ISOLATED clone of the real book sheet —
  // header band + .page-inner + .page-content with the same classes and the
  // same fixed geometry as a full A4 print sheet (24px ruled rows, 120px
  // header, 104px footer, 30px top offset). Because the clone lives under
  // <body>, every selector that scopes rules to the book ("#leftContent …",
  // ".modal-overlay …", "@media" width overrides) is neutralised on it by
  // the !important normaliser styles below — so what we measure here is the
  // STANDARD-SIZE layout the printed booklet shows. Screen and print then
  // share one identical layout, so a line that fits during measurement can
  // never overflow off the bottom of a printed sheet. (Previously the host
  // measured against the scaled-down on-screen preview width (~43vw), which
  // is NARROWER than a full A4 sheet at the same font size — every printed
  // line wrapped later in print CSS px than it did while measuring, pages
  // grew taller than 297mm and ALL the message text spilled out of the book
  // area.)
  let measureHost = null;
  let measureSheet = null;      // the .print-sheet element inside the host
  // Full-size A4 sheet geometry used by the PRINT booklet (one physical A4
  // page = 210mm wide). The measuring host ALWAYS paginates against this
  // exact geometry.
  const PRINT_A4_W_PX = Math.round(8.267 * 96);   // 210mm @ 96 css px/in ≈ 794px

  // ---- COMPACT PAGE GEOMETRY (one single source of truth) ----
  // --row is 24px (COMPACT): it is the pagination currency for EVERY line (body,
  // heads, heading bands), so entries stay perfectly aligned everywhere even
  // though the visible ruled lines are gone (compact style). The header band
  // is now only tall enough to hold the Soulmate Code photo (108px + margins)
  // and the footer band only the initials monogram (≈86px) — the freed space
  // flows INTO the text area, so every page fills fully to its last row.
  // These values MUST match the .book vars in style.css (--head-h/--foot-h).
  /* COMPACT GEOMETRY: the footer band is only as tall as its own contents
     (the "H ❤ D" initials monogram ≈ 86px). One single source of truth —
     style.css (.book --foot-h), the measuring host (MEASURE_CSS), the print
     window (PRINT_WIN_CSS) and html.print-mode ALL read this same number,
     so preview, pagination maths and PDF never drift apart again. */
  const HEAD_H = 120, FOOT_H = 88;
  /* 📐 COMPACT TYPEGRAPHY: one ruled row = 24px (was 30px). ONE single
     source of truth — MUST equal --row in style.css (.book), MEASURE_CSS
     and the print window below. Shrinking the row pitch together with the
     entry font sizes lets every page hold MORE entries while all three
     render targets (preview, paginator, PDF) stay perfectly in sync. */
  const ROW_H = 24;

  // 📂 ONE shared heading-band style — the SINGLE source of truth for how a
  // diary heading looks in the booklet. The same string is injected into:
  //   • the measuring host (MEASURE_CSS)   → pagination maths,
  //   • the print window (PRINT_WIN_CSS)   → the PDF booklet,
  //   • the live app document at startup   → the on-screen preview book,
  // so EVERY heading band is pixel-identical in preview and PDF. One ruled
  // row tall (--row = 24px), SHRUNK text (.66rem) that always FITS inside the band:
  // long headings condense automatically via font-stretch instead of being
  // cut off mid-word. __SCOPE__ is replaced with each target's selector.
  const HEADING_BAND_CSS = [
    '__SCOPE__{display:block!important;font-family:"Playfair Display",serif;' +
      'font-size:.66rem!important;font-stretch:82%;line-height:var(--row)!important;' +
      'height:var(--row)!important;margin:0 0 2px!important;padding:0 8px!important;' +
      'font-weight:700!important;letter-spacing:.02em!important;color:#7a5b34!important;' +
      'background:rgba(219,112,147,.10)!important;border-left:3px solid #b3456b!important;' +
      'border-radius:6px!important;white-space:nowrap!important;overflow:hidden!important;' +
      'text-overflow:ellipsis!important;box-sizing:border-box!important;' +
      '-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}'
  ].join('\n');

  // 🔢 ENTRY NUMBER badge (#1, #2, #3 … till the end) — ONE shared style
  // string injected into the measuring host, the preview and the print/PDF
  // window, so every bubble head (the FIRST entry of a page included) wears
  // an identical compact pill. __SCOPE__ is replaced per target.
  const EB_NO_CSS =
    '__SCOPE__{display:inline-block!important;font-size:.72rem!important;line-height:1!important;' +
      'vertical-align:2px!important;font-weight:700!important;letter-spacing:.02em!important;' +
      'color:#7a5b34!important;background:rgba(122,91,52,.12)!important;border-radius:8px!important;' +
      'padding:2px 6px!important;margin:0 6px 0 0!important;' +
      '-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}';

  // Normaliser stylesheet injected INSIDE the measuring host. Every rule is
  // scoped to the host subtree and !important, so it beats any app or media
  // query rule and pins the host to the standard full-size book geometry:
  // --row 24px lines, fixed bands, single-source typography. This is what
  // keeps the measured lines IDENTICAL to the ruled lines of the sheets.
  const MEASURE_CSS = [
    '#measureHost{position:fixed;left:-99999px;top:0;visibility:hidden;background:#fff}',
    '#measureHost .book{--a4w:' + PRINT_A4_W_PX + 'px;--row:' + ROW_H + 'px;--head-h:' + HEAD_H + 'px;--foot-h:' + FOOT_H + 'px;' +
      '--pad-t:30px;--pad-b:60px;width:auto!important;height:auto!important;position:static!important;' +
      'transform:none!important;background:none!important;box-shadow:none!important;border-radius:0!important}',
    '#measureHost .print-sheet{width:' + PRINT_A4_W_PX + 'px!important;height:' +
      Math.round(PRINT_A4_W_PX * 297 / 210) + 'px!important;box-sizing:border-box!important;' +
      'display:flex!important;flex-direction:column!important;position:relative!important;' +
      /* COMPACT STYLE: plain paper — the ruled lines are removed here too so
         the host measures exactly what the sheets render */
      'background-image:none!important;' +
      'overflow:visible!important;background-color:#fffdf6!important}',
    '#measureHost .book-page-header{flex:0 0 var(--head-h)!important;height:var(--head-h)!important;' +
      'padding:0 12px!important;font-size:1.2rem!important;overflow:hidden!important}',
    '#measureHost .book-page-header .bph-photo{height:calc(var(--head-h) - 12px)!important;' +
      'max-height:calc(var(--head-h) - 12px)!important;max-width:162px!important}',
    '#measureHost .book-page-footer{flex:0 0 var(--foot-h)!important;height:var(--foot-h)!important;' +
      'padding:4px 16px!important}',
    /* bottom padding is ZERO — identical to the app (.page-inner) and to the
       print window: the reserved bottom band (--pad-b) is subtracted from the
       usable HEIGHT by the paginator (availH = box.H - 5 rows), never baked
       into the host's own padding. Baking it here made contentBox() report a
       too-small H, so the host double-counted the band and every PDF page was
       flowed ~90px short of its true last row. */
    '#measureHost .page-inner{flex:1 1 auto!important;min-height:0!important;' +
      'padding:var(--pad-t) 26px 0!important;box-sizing:border-box!important;' +
      'overflow:visible!important;display:flex!important;text-align:left!important}',
    '#measureHost .page-content{position:relative!important;display:flex!important;flex:1!important;' +
      'min-height:100%!important;align-self:stretch!important;padding:0!important}',
    /* STANDARD-SIZE typography — ONE body/head line = exactly one 24px ruled row */
    '#measureHost .entry-body{font-size:.8rem!important;line-height:var(--row)!important;' +
      'white-space:pre-wrap!important;word-break:break-word!important;color:#3c2f1e!important;margin:0!important}',
    /* one SOURCE line per <div class="eb-line">: identical typography and a
       hard row-lock, so a split piece and an intact bubble occupy EXACTLY the
       same rows — the first entry of a page can never drift from its siblings */
    '#measureHost .entry-body .eb-line{display:block!important;font-size:.8rem!important;' +
      'line-height:var(--row)!important;min-height:var(--row)!important;margin:0!important;padding:0!important}',
    '#measureHost h4{font-size:1rem!important;line-height:var(--row)!important;margin:0 0 2px!important}',
    '#measureHost .entry-date{font-size:.7rem!important}',
    '#measureHost .entry-bubble{background:transparent!important;border:none!important;' +
      'border-left:3px solid rgba(179,69,107,.45)!important;border-radius:0!important;' +
      'padding:0 12px 0 10px!important;margin:0 0 var(--row)!important;box-sizing:border-box!important;' +
      'overflow:visible!important}',
    '#measureHost .entry-bubble .eb-head{font-size:.86rem!important;line-height:var(--row)!important;margin:0!important;' +
      'white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}',
    '#measureHost .entry-bubble .eb-cont-note{font-size:.72rem!important;line-height:var(--row)!important}',
    '#measureHost .entry-bubble .eb-extra{display:block!important;margin-top:0!important;line-height:var(--row)!important}',
    '#measureHost .entry-bubble .eb-label{font-weight:600!important;font-style:italic!important}',
    /* 📂 diary-heading band inside a bubble — ONE shared style definition
       (HEADING_BAND_CSS) applied to preview, measuring host AND print, so
       every heading looks identical everywhere. Exactly one ruled row tall
       so the paginator measures it identically on screen and in the PDF. */
    HEADING_BAND_CSS.replace(/__SCOPE__/g, '#measureHost .entry-bubble .eb-heading-band'),
    EB_NO_CSS.replace(/__SCOPE__/g, '#measureHost .entry-bubble .eb-no'),
    '#measureHost .love-stamp{height:calc(var(--a4w) * 2.5 / 8.267)!important;max-height:calc(var(--a4w) * 2.5 / 8.267)!important;max-width:calc(var(--a4w) * 2.5 / 8.267)!important;width:auto!important}',
    '#measureHost .entry-bubble .love-stamp{display:block!important;margin:4px 0 0 auto!important;height:48px!important;max-height:48px!important;max-width:90px!important}',
    '#measureHost .footer-initials{display:inline-flex!important;align-items:flex-start!important;gap:10px!important;font-size:1rem!important;line-height:1!important}',
    '#measureHost .footer-initials .fi-side{display:inline-flex!important;flex-direction:column!important;align-items:center!important;gap:2px!important}',
    '#measureHost .footer-initials .fi-letter{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:38px!important;height:38px!important;border-radius:50%!important;font-size:1.1rem!important;line-height:1!important}',
    '#measureHost .footer-initials img.fi-sign{height:46px!important;max-height:46px!important;max-width:74px!important;width:auto!important}',
    '#measureHost .footer-initials .fi-heart{font-size:1.1rem!important;line-height:38px!important}',
    '#measureHost .cover-bubble{border:1px solid rgba(179,69,107,.35)!important;' +
      'border-left:5px solid #b3456b!important;border-radius:14px!important;padding:10px 14px 9px!important;' +
      'margin:0 0 var(--row)!important;box-sizing:border-box!important;overflow:hidden!important}',
    '#measureHost .cover-bubble .cb-title{font-size:1.05rem!important;line-height:var(--row)!important;margin:0 0 4px!important}',
    '#measureHost .cover-bubble .cb-meta{font-size:.8rem!important;line-height:var(--row)!important;margin:0 0 6px!important}',
    '#measureHost .empty-page{line-height:var(--row)!important}',
    /* cover hero: every row exactly one ruled line, no fractional padding */
    '#measureHost .book-cover{text-align:center!important;padding-top:var(--row)!important;box-sizing:border-box!important}',
    '#measureHost .book-cover .cover-title-row,#measureHost .book-cover .cover-divider,' +
      '#measureHost .book-cover .cover-names,#measureHost .book-cover .cover-started,' +
      '#measureHost .book-cover .cover-quote{line-height:var(--row)!important;margin:0 8px!important}'
  ].join('\n');

  function getMeasurePage() {
    if (!measureHost || !document.body.contains(measureHost) ||
        !measureHost.clientWidth ||
        measureHost.querySelector('.page-flow') === undefined) {
      measureHost = document.createElement("div");
      measureHost.id = "measureHost";
      // Exact structural clone of one printed sheet (same classes as the
      // print window's markup): .book > .print-sheet > header + .page-inner
      // > .page-content + footer. All styling comes from MEASURE_CSS above.
      measureHost.innerHTML = "<style>" + MEASURE_CSS + "</style>" +
        '<div class="book"><div class="print-sheet">' +
          '<div class="book-page-header"><img class="bph-photo" alt="" src="' + SOULMATE_CODE_IMG + '"><div class="bph-title">💕 OUR LOVE STORY 💕</div></div>' +
          '<div class="page-inner"><div class="page-content"></div></div>' +
          '<div class="book-page-footer"><span class="page-num"></span>' + FOOTER_INITIALS_HTML + '<img class="love-stamp" alt="" src="' + LOVE_STAMP_IMG + '"></div>' +
        '</div></div>';
      document.body.appendChild(measureHost);
      measureSheet = measureHost.querySelector(".page-content");
    }
    return measureSheet;
  }

  // ---- Web-font gating for the measuring host ----
  // The paginator measures EVERY line inside the hidden standard sheet, so the
  // fonts of that host must be fully loaded BEFORE any measurement runs. If a
  // web font (Playfair Display / Courier New fallbacks) swaps in only after
  // pagination finished, the real sheet renders taller than measured and the
  // last entries get cut off at the bottom edge of the printed PDF page —
  // exactly the bug this gate removes. flowPages() waits on this promise and
  // re-measures once the fonts have settled, so screen preview, storage-sourced
  // pagination and the PDF always share one identical, final layout.
  let measureFontsReady = null;
  function ensureMeasureFonts(hostDoc) {
    if (!measureFontsReady) {
      measureFontsReady = (hostDoc.fonts && hostDoc.fonts.ready)
        ? hostDoc.fonts.ready.then(() => true).catch(() => false)
        : Promise.resolve(false);
    }
    return measureFontsReady;
  }

  // ---------- A4 Book View (flip pages) ----------
  const bookModal = $("#bookModal");
  const leafEl = $("#leaf");
  let bookPages = [];   // array of page objects { html, num }
  let spread = 0;       // current spread index (each spread = left+right page)
  let flipping = false;

  // ---- PHONE MODE: ONE PAGE PER SCREEN, ALWAYS ----
  // THE BOOK IS ALWAYS A SINGLE-PAGE FLIP-UP VIEW — ON EVERY SCREEN SIZE.
  // The two-page spread ("book type view") has been REMOVED completely:
  // every numbered page (1, 2, 3 … to the end) gets its own screen and
  // turns with the upward sheet-flip animation (rotateX around the TOP
  // hinge). All data lives on the FRONT side only — the back of every
  // sheet is plain blank paper with no content whatsoever.
  const PHONE_MQ = window.matchMedia("(max-width: 820px)");
  function isPhoneBook() { return true; }   // single-page mode everywhere now
  function applyPhoneModeClass() {
    document.body.classList.toggle("book-phone-mode", isPhoneBook());
  }
  applyPhoneModeClass();
  const onPhoneMqChange = () => {
    applyPhoneModeClass();
    fitBookZoom();
    // crossing the breakpoint while the book is open → re-render so pages
    // switch between one-per-screen (phone) and spreads (desktop) correctly
    if (!bookModal.classList.contains("hidden") && bookPages.length) renderSpread();
  };
  if (PHONE_MQ.addEventListener) PHONE_MQ.addEventListener("change", onPhoneMqChange);
  else if (PHONE_MQ.addListener) PHONE_MQ.addListener(onPhoneMqChange);

  // Fit the book to the available space. Desktop: the whole 2×A4 spread is
  // scaled down inside the modal. Phone: the wrap is pinned to the exact
  // viewport height (top bar + stage + bottom bar = 100dvh) and the single
  // sheet is scaled to fit the stage box — width AND height.
  // `zoom` is purely visual — layout px inside the sheet stay standard, so
  // the paginator's measurements never change.
  function fitBookZoom() {
    const stage = document.querySelector("#bookModal .book-stage");
    const bookEl = $("#book");
    if (!stage || !bookEl) return;
    const single = document.body.classList.contains("book-phone-mode");
    // Pin the phone "app page" to the EXACT visible viewport so the bottom
    // tab bar always sits right above the home indicator — never off-screen.
    if (single) {
      const vh = Math.max(window.innerHeight, document.documentElement.clientHeight) || innerHeight;
      $(".book-wrap") && ($(".book-wrap").style.height = vh + "px");
    } else {
      const w = $(".book-wrap"); if (w) w.style.height = "";
    }
    // On phones the sheet hugs the screen edges — give it a little paper margin
    if (single) stage.style.padding = "0 3px";
    else stage.style.padding = "";
    const cs = getComputedStyle(stage);
    const availW = stage.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const baseW = single ? 794 : 794 * 2;
    let zoom = availW > 0 ? (availW - (single ? 6 : 14)) / baseW : 1;
    if (single) {
      // While the in-book ➕ Add pane is open it shares the stage's flex row
      // with the sheet — reserve its width so the page never overflows.
      const pane = $("#bookAddPane");
      if (pane && !pane.classList.contains("hidden")) {
        zoom = Math.min(zoom, (availW * 0.5) / baseW);
      }
      // .book-stage is flex:1 inside the column-layout .book-wrap on phones,
      // so its own clientHeight already IS the space left between the app bar
      // and the tab bar — fit the sheet height to it too (small breathing margin).
      const availH = stage.clientHeight - 8;
      const maxByH = availH > 80 ? availH / (794 * 297 / 210) : Infinity;
      zoom = Math.min(zoom, maxByH);
    }
    // Never shrink below a readable floor; on very short landscape screens
    // allow going smaller instead of clipping the sheet off-screen.
    zoom = Math.max(0.08, Math.min(1, zoom));
    bookEl.style.setProperty("--book-zoom", String(zoom));
  }
  window.addEventListener("resize", fitBookZoom);
  window.addEventListener("orientationchange", () => setTimeout(fitBookZoom, 150));

  // Usable content box of a rendered page: the .page-content element minus
  // the space taken by its own padding. Everything (text flow + stickers)
  // is measured against this exact box so what we plan always fits.
  function contentBox(el) {
    const cs = getComputedStyle(el);
    const padT = parseFloat(cs.paddingTop) || 0;
    const padB = parseFloat(cs.paddingBottom) || 0;
    const padL = parseFloat(cs.paddingLeft) || 0;
    const padR = parseFloat(cs.paddingRight) || 0;
    return {
      W: el.clientWidth - padL - padR,
      H: el.clientHeight - padT - padB,
      x0: padL,
      y0: padT
    };
  }

  function getUserName() {
    if (!currentUser) return "";
    const u = usersMap[currentUser] || {};
    return u.name || currentUser.split("@")[0];
  }

  // ---------- Cover content: "The Day Our Story Began" ----------
  // Each item is ONE section card { t: title, m: meta line (trusted html), b: body }.
  // Sections flow through the same pagination engine as entries: they appear in
  // sequence from page 1, fill every page down to its last row (last 2 rows stay
  // empty) and continue intact on the next sheet. A section taller than a full
  // blank sheet is split at line boundaries and marked "(continued)".
  const COVER_SECTIONS = [
    { t: "❤️ The Day Our Story Began ❤️", m: "", b:
      "Date: 16th, December 2025\n" +
      "Time (UAE): 10:19 AM\n" +
      "Time (India): 11:49 AM" },
    { t: "🍯🫰🫶🏻 Chota Don❣️❤️😘", m: "", b:
      "(This is the name that started everything… your name in my world.)" },
    { t: "✨ How It All Started", m: "", b:
      "It was just a normal day and I just received an request on Shadi.Com and started talking and later after few time she given me her number and told me to come on WhatsApp and we started talking and within 2 days we she told me yes on 17th December 2025 and then we started our journey…\n" +
      "16th December 2025 started to talk on WhatsApp.\n" +
      "At exactly 10:19 AM (UAE time)…\n" +
      "11:49 AM (India time)…\n" +
      "A simple conversation started between us.\n" +
      "At that moment, I didn’t know…\n" +
      "\n" +
      "That this small beginning would turn into something so meaningful." },
    { t: "💭 My First Thought About You", m:
      "• What Caught My Attention About Her<br>" +
      "• December 16th, 2025 — January 10th, 2026 — The Days That Built Us<br>" +
      "• A chronological record of the moments that made me stop, notice, and realize she was different.", b: "" },
    { t: "1. Your Honesty and Openness: The Blueprint of You", m: "", b:
      "From the very first real conversation, you didn’t hide. You laid it all out.\n" +
      "• December 16, 2025 at 10:38:28 AM: You told me about your divorce. You didn't sugarcoat it. You wrote, “so it was like i moved to canada in 2021 on student visa then in last here dec 2024 mara dad ni health bagdi... to i got emotional and said yes... jan 2025 ma mrg thaya chokro Uk no hto... 22 days and then one day i caught him cheating on me with his bhabhi not real ur na bhabhi hata... so i came back to india in june 2025... and then july 2025 ma divorce thaya.”\n" +
      "My Thought: I remember reading this and just feeling this wave of protectiveness. You went through so much, alone, in a foreign country, and you still had the strength to walk away. It wasn't a red flag for me; it was a testament to your character. You knew your worth, and you refused to settle for anything less, even when it was the harder path.\n" +
      "• December 16, 2025 at 10:43:39 AM: You didn't just stop there. You told me about your family’s financial situation, a detail many would hide until it was too late. You wrote, “as i mentioned about my father health so right now ae bav work nai karta car and jamin nu le vech kare ema paisa aave to aave naito na b aave so hu and mari sis atyare badhu financially handle kariye che amare potanu ghar k jamin nthi rent par raia che so even after mrg b hu emne financially help karis ena thi tamne koi issue?”\n" +
      "My Thought (My Reply to You - Dec 16, 10:45:04 AM): “See after marriage your family is my family and my is yours you can do what ever you want.”\n" +
      "My Explanation: This was the easiest question you could have asked. Your family is my family. Your responsibilities become ours. The fact that you were upfront about this, worried it might be a problem, only made me respect you more. It told me you're someone who values loyalty and duty, just like me. My answer wasn't just a line; it was a promise." },
    { t: "2. Your Strength and Vulnerability: The Layers Beneath the Smile", m: "", b:
      "You are strong, but you also let me see the hurt and the exhaustion behind that strength. That vulnerability is what made me feel close to you.\n" +
      "• December 16, 2025 at 10:57:50 AM: You mentioned you were in therapy for two years after everything that happened. You said, “mare 2 years thi therapy chalti ti... atyare b amari situation vadhare khrb che to koi var over thinking start thai jay.”\n" +
      "My Thought: This wasn't a sign of weakness; it was a sign of someone actively working on healing. It showed me how deeply you feel things, and that you're committed to getting better, not just for yourself, but for the people who love you. It made me want to be a place of peace for you.\n" +
      "• December 17, 2025 at 6:07:12 PM: You shared more about your childhood and the struggles within your family. “see me nanpan thi ghar ma jaghda joine j moti thai chu bcoz mara mom dad ae love mrg karela ghar ma mummy ne koi like ntu kartu baa dada koi... jena lidhe hu pelle thi ekli ravu game... ae badha mathi bhar nikadva hu 17 years ni age ma canada gati rai ekli reva.”\n" +
      "My Thought: My heart ached reading this. You left home at 17 to escape the chaos. You learned to be self-reliant because you had to. But you also told me you got panic attacks and depression, that you were in therapy. It painted a picture of a girl who survived by being strong, but who now craves a safe harbor. I wanted to be that harbor.\n" +
      "• December 17, 2025 at 6:10:15 PM: You shared a picture of your father in the hospital, and you wrote, “see... to i want someone j mane to support kare but mara parents ne potana saga parents ni jem treat kare.”\n" +
      "My Thought (My Reply to You - Dec 17, 6:11:08 PM): “Hu b same aj sothu chu okay 👌 so no issue”\n" +
      "My Explanation: I meant it then, and I mean it even more now. I saw your family's strength in the face of illness, and I saw your unwavering love for them. You're not looking for a way out; you're looking for a partner to share the load. I want to be that person. I'll treat them with the same respect I'd want for my own parents. That’s non-negotiable for me." },
    { t: "3. Your Playful Side: The Cute Little Batak", m: "", b:
      "You’re not all serious. The real you, the one I fell for, is also hilarious, playful, and loves to tease.\n" +
      "• December 19, 2025 at 8:11:02 AM: You called me “baka” (a cute way to say), and the banter began.\n" +
      "• December 20, 2025 at 8:53:23 AM: You were counting down the days to your mama's wedding, and I was planning to make a story for it. Your excitement was contagious.\n" +
      "• December 26, 2025 at 6:43:23 PM: You threatened me! You wrote, “na na khoon j kari devanu atle fari biji girl jode na kare😂😂😂” (No no, I'll just kill you so you won't go to another girl).\n" +
      "My Thought (My Reply to You - Dec 26, 6:44:17 PM): “Ha to kari deje okay maru avu lage to” (Yes, then do it if you feel that way).\n" +
      "My Explanation: I knew it was a joke, a playful threat that made me laugh. It was your way of saying, \"You're mine, and I'm not sharing.\" I played along, and it just felt so natural. It’s the little moments like this that make our relationship fun and alive. You're my crazy, and I’m yours." },
    { t: "4. The Questions and the Fears: The Weight of Her Past", m: "", b:
      "You asked questions to protect yourself, to see if history would repeat itself. I understood that, and I never wanted you to feel like you couldn't ask.\n" +
      "• December 19, 2025 at 8:04:22 PM: You asked if I was a virgin, and then shared you weren’t.\n" +
      "My Explanation: You were being honest about your past, not hiding it. That's all that mattered to me. I had my own past, but that was done. I told you I only had one serious relationship and we only ever kissed.\n" +
      "• December 27, 2025 at 2:36:58 PM: You shared your fears, writing, “mane bikk che k maru name na lakhave kem k me ene diwali sudhi ma clear karvani gurranty lidhi ti but vacche aa maru divorce nu aayu ema mare uk ma job na thai.”\n" +
      "My Thought: You were scared that promises made in the past, which you couldn't keep because life got in the way, would come back to haunt you. You were afraid of being held accountable for things outside your control. This fear, this bikk, showed me how much you value keeping your word and how much you've been hurt when others didn't.\n" +
      "• January 1, 2026 at 8:39:47 PM: Your fear came back, and you asked me a direct question: “tu mane help karu chu financially which is good but me tane pela b kidhu tu right what my husband did he used that against me... to tu to evu nai karu ne?” (Will you use this against me like my ex-husband did?)\n" +
      "My Thought (My Reply to You - Jan 1, 8:41:58 PM): “No never... Su tara against use kari uh ?” (No never... What did he use against you?) – My Answer Here separate that I will never do like that to you.\n" +
      "My Explanation: My heart sank. The thought that you might even consider I'd do that hurt me. Money is a tool, a resource to help the people we love. For it to be weaponized is a complete betrayal of trust. I needed you to know, without a doubt, that I would never, ever do that. I used your past to explain my future intentions." },
    { t: "5. The Day I Knew: When Everything Clicked", m: "", b:
      "There were many moments, but the day we both said yes to this, to us, was monumental.\n" +
      "• December 18, 2025 at 8:58:28 AM: I asked you a question, a feeling I couldn't hold back anymore. I wrote, “Hey... Honey 🍯 can I tell you something? 😊💭 Lately, spending time with you just feels... different. 🥰✨🌼... If you ever feel the same way... my heart would be yours. 💘😌🫶 Whenever you're ready. 🌸💕🌟”\n" +
      "• December 18, 2025 at 8:59:59 AM: Your reply was instantaneous and perfect: “I am ready 😍😘🥰”\n" +
      "My Explanation: In that moment, the world just felt right. There was no doubt, no hesitation. It was a leap of faith for both of us, given our histories. But you didn't hesitate. You just said yes. I knew then, without a shadow of a doubt, that you were the one. The moment was so big for me, I had to tell you I used AI to help write it because the feeling was too big for my own clumsy words." },
    { t: "6. Building Our Future: The Plan for Us", m: "", b:
      "We didn't just talk about feelings; we talked about our future. The practical, the hopeful, the real stuff.\n" +
      "• December 18, 2025 at 10:41:26 AM: We started to map it all out. You said, “april ma tu aavu pachi engagement kari laia then hu tari jode aai saku ne dubai?” (I'll come in April, we'll do the engagement, then I can come to Dubai with you?) I replied with how we'd make it work.\n" +
      "My Explanation: This was us, building a life together. Visa plans, living arrangements, future weddings—it was all on the table. We were a team, figuring out the logistics of our love, not just dreaming about it.\n" +
      "• December 18, 2025 at 10:48:06 AM: You had the most amazing idea. You wrote, “vraj b keto to k aapde 3 sathe mrg karisu😂” (Vraj also said, we should do all three weddings together).\n" +
      "My Explanation: It was a joke, but it was about family. It was about all of us, Abhi and Hetvi, Vraj, you and me, being in it together. It was the dream of a shared future, of happiness not just for ourselves but for everyone we love. It was a beautiful picture, and I’m determined to make it happen.\n" +
      "• January 8, 2026 at 4:34:33 PM: I sent you a picture of a couple’s ring we could get, and you replied with a simple, loving, “🥰😍”\n" +
      "My Explanation: It was a small thing, a picture of a ring, but it was a symbol of the commitment we were building. It was a promise of a future, a \"one day\" that felt closer than ever before." },
    { t: "7. The Little Things That Are Everything", m: "", b:
      "The best parts of our story are in the small moments, the shared jokes, the daily check-ins.\n" +
      "• December 20, 2025 at 7:08:20 PM: You flooded my chat with photos and videos from your Canada days. Laughing with friends, goofing around. You shared your memories with me, letting me into a part of your past you cherished. – I Want this type of Flood every day or else once a week.\n" +
      "My Explanation: It felt like you were giving me a piece of your history, wanting me to know the happy version of you, too. It wasn't just the hard stuff; it was the joyful stuff. It was an invitation to know you completely.\n" +
      "• January 6, 2026 at 8:54:29 PM: You were stressed and tired, and I wanted to bring a smile to your face. You said, “mare privacy glass nakhavo padse lage che... koi baju ma bethu hoi to vat b nai thati aapdi” (I need to get a privacy screen so no one sitting next to me can see our conversations).\n" +
      "My Explanation: The fact that you were thinking about privacy for our conversations, to protect our time together from the world, was incredibly sweet. It showed how much you value what we have." },
    { t: "💞 Our Beautiful Tapestry", m: "", b:
      "This is just a fraction of our story so far. There are countless other moments. You challenging me, me teasing you. You worrying, me promising. You laughing, me smiling like an idiot. All of it, every single message, is a thread in this beautiful tapestry we're weaving.\n" +
      "I'm writing this to remember. To remember the girl who was honest and brave from day one. The woman who is stronger than she knows. The friend who is hilarious and loyal. And my future, my Jaan, who decided to trust me with her heart." },
    { t: "🗺️ What Did I See in Her That I Never Saw Before?", m:
      "• How did she change the way I love?<br>" +
      "• What was it about her that made me believe again?", b:
      "This is my map. A map of how two strangers found exactly what they weren't even looking for. From a simple \"Hello\" to promises of rings and a shared future, she showed me what real honesty and loyalty look like. For the first time, I saw someone who wasn't just looking for marriage—she was looking for a home for her heart. And I wanted to be that home." }
  ];

  // ---------- Cover HERO block (page 1) ----------
  // The exact title header of the booklet, rendered as a typewriter-style
  // centred block on the FIRST sheet, before "The Day Our Story Began":
  //   ============================================================
  //   💕 OUR LOVE STORY 💕
  //   ============================================================
  //   🍯🫰🫶🏻 Chota Don❣️❤️😘 & Shinu 💏👄🫦 ---- ✨Two Bodies, One Soul✨
  //   Started: 16th December 2025⏰10:19 AM (UAE) ---- 🌙Dubai✈️ 🕌 Nadiad 🌺
  //   This distance is painful… but it's also proof—that what we have is real.
  //   ================================================================================
  const SOULMATE_CODE_URL = "https://drive.google.com/file/d/17_Wt5nHtKbuDc7DiynDexI-l-GY8RpgS/view?usp=sharing";
  // Images PREVIEWED (NOT linked) inside the book: the Soulmate Code card in
  // ONE top corner of every page header, and the "Our Love" stamp wherever it
  // is required (page footers + after every entry). Direct image URLs so they
  // also render in the print window.
  const SOULMATE_CODE_IMG = "https://lh3.googleusercontent.com/d/17_Wt5nHtKbuDc7DiynDexI-l-GY8RpgS";
  const LOVE_STAMP_IMG = "https://lh3.googleusercontent.com/d/1xT4SnUR8dtEHP14MUMFZnYZnumAS96Fw";
  // ---- FOOTER INITIALS ("H ❤ D") + OUR SIGNATURES ---------------------------
  // 👉 YOUR SIGNATURE IMAGES GO HERE: paste each Google Drive FILE LINK (or
  //    just the raw file ID) into the two constants below and the sign images
  //    appear beside the matching initial — HONEY's under "H", DEEP's under
  //    "D" — in the footer of every page: book preview, flipping leaf AND the
  //    printed PDF booklet. Leave one "" to keep just the styled letter there.
  const HONEY_SIGNATURE_URL = "https://drive.google.com/file/d/1XSSbL_JtTqYNwxJ_xquwQj5c5daeMm1V/view?usp=sharing";
  const DEEP_SIGNATURE_URL  = "https://drive.google.com/file/d/1KnoE8uWAwugB0PRMiPmq32eCW-ZxMasj/view?usp=sharing";
  const driveImgUrl = (u) => {
    if (!u) return "";
    const m = String(u).match(/[-\w]{20,}/);   // extract the Drive file ID
    return m ? "https://lh3.googleusercontent.com/d/" + m[0] : u;
  };
  const HONEY_SIGN_IMG = driveImgUrl(HONEY_SIGNATURE_URL);
  const DEEP_SIGN_IMG  = driveImgUrl(DEEP_SIGNATURE_URL);
  // The on-screen footer markup is STATIC HTML living in index.html (the JS
  // only fills .page-num / .page-content), so initBookChrome() below injects
  // this exact markup into every static footer band at startup — keeping the
  // screen book, the flipping leaf, the measuring host and the print window
  // all built from this ONE string.
  // NAMEs: Honey 🍯 & Deep 💏 → initials H and D, each with its sign image.
  const FI_WRAP_OPEN = '<span class="footer-initials" aria-label="Honey and Deep">';
  const fiSide = (letter, sign) => sign
    ? '<span class="fi-side"><span class="fi-letter">' + letter + '</span>' +
      '<img class="fi-sign" src="' + sign + '" alt="' + letter + ' signature" referrerpolicy="no-referrer" draggable="false"></span>'
    : '<span class="fi-side"><span class="fi-letter">' + letter + '</span></span>';
  const FOOTER_INITIALS_HTML = FI_WRAP_OPEN +
    fiSide("H", HONEY_SIGN_IMG) +
    '<span class="fi-heart">❤</span>' +
    fiSide("D", DEEP_SIGN_IMG) +
    '</span>';
  // 🚫 The stamp NO LONGER rides inside entry bubbles — its ONLY home is the
  // page FOOTER band now (per user request), so entries stay compact and the
  // bubble HTML never contains an image. Kept as "" so old call-sites are
  // harmless; footer markup builds its own <img class="love-stamp"> directly.
  const STAMP_HTML = "";

  // ---- Standard-size measuring host (self-contained) ----
  // The hidden measuring sheet used to live INSIDE the app document, where it
  // inherited everything the app's stylesheet does at small viewport widths
  // (.page-inner padding overrides, responsive font sizes…). That made the
  // paginator measure a DIFFERENT layout than the print window renders — the
  // bug behind entries landing on wrong rows / being cut off in the PDF.
  // Now the host is a fully INERT clone: an about:blank iframe whose head
  // contains ONLY the standard MEASURE_CSS below plus the same web fonts the
  // app uses — no app stylesheet, no media queries, nothing can ever override
  // the standard 794px A4 geometry and 24px ruled rows again. Screen,
  // pagination maths and the printed booklet therefore share ONE identical
  // layout.
  let measureIframe = null;

  function getCoverHeroBlock() {
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const html =
      "<div class='book-cover'>" +
        "<div class='cover-divider'>" + esc("=".repeat(60)) + "</div>" +
        "<div class='cover-title-row'>💕 OUR LOVE STORY 💕</div>" +
        "<div class='cover-divider'>" + esc("=".repeat(60)) + "</div>" +
        "<div class='cover-names'>🍯🫰🫶🏻 Chota Don❣️❤️😘 &amp; Shinu 💏👄🫦 ---- ✨Two Bodies, One Soul✨</div>" +
        "<div class='cover-started'>Started: 16th December 2025⏰10:19 AM (UAE) ---- 🌙Dubai✈️ 🕌 Nadiad 🌺</div>" +
        "<div class='cover-quote'>This distance is painful… but it's also proof—that what we have is real.</div>" +
        "<div class='cover-divider'>" + esc("=".repeat(80)) + "</div>" +
      "</div>";
    return { kind: "raw", html: html, coverHero: true };
  }

  function getCoverBlocks() {
    // Page 1 starts with the OUR LOVE STORY hero, then the story sections flow.
    return [getCoverHeroBlock()].concat(COVER_SECTIONS.map((s) => ({
      kind: "para",
      cover: true,
      cls: "",
      title: "<strong>" + s.t + "</strong>",
      meta: s.m || "",
      htmlBody: String(s.b || "").split("\n").map((l) => escapeHtml(l)).join("\n"),
      who: "", date: "", tag: ""
    })));
  }

  async function buildBookPages() {
    // Cover + user's entries in chronological order (oldest first, like a real diary)
    const pages = [];
    const raw = loadEntries();
    // sort by the entry's DATE field specifically (not array order), oldest first
    // 📖 BOOK-VIEW FILTER: when a heading/sender is selected in the book's
    // own filter bar, ONLY matching entries flow through the pages. Nothing
    // selected (default "🗂 All") ⇒ every entry passes ⇒ the regular book.
    const entries = raw.slice().filter(bookEntryMatchesFilter).sort((a, b) => {
      const ta = Date.parse(a && a.date != null ? a.date : 0) || 0;
      const tb = Date.parse(b && b.date != null ? b.date : 0) || 0;
      return ta - tb;
    });
    // SINGLE SOURCE OF TRUTH for the booklet entry numbers (1, 2, 3 … till the
    // end): re-number here in the exact sequence the book flows its pages —
    // oldest → newest. This runs before EVERY render path (book modal, flipping
    // leaf, print/PDF booklet), so the same entry always carries the same
    // number on every page, and the FIRST entry of a page can never wear a
    // different number from its siblings. Numbers are display-only and never
    // written to Supabase.
    // NO ENTRY NUMBERING inside the book (user rule): the diary shows the
    // messages exactly as written — no "#N" badges anywhere. Counting lives
    // only in the separate 🧮 Message Counter panel.
    entries.forEach((en) => { delete en.entryNo; });

    // Page(s) 1..n: COVER — "The Day Our Story Began". The full cover text is
    // flowed through the SAME pagination engine as the entries, so nothing is
    // ever cut off below the page edge: each cover section stays intact and
    // continues on the next sheet exactly like a diary entry would.
    const coverBlocks = getCoverBlocks();

    // CONTINUOUS LINE-WISE BOOK MODE:
    //   • entries stay in strict sequence (oldest → newest), NEVER one-per-page
    //   • the current page keeps filling with the NEXT entry right after the
    //     previous one until it reaches its LAST row; only then does the
    //     balance flow onto the next page (even mid-entry, line by line)
    //   • nothing is ever cut off below the page edge
    //   • stickers appear ONLY in genuinely empty areas: beside short lines
    //     (right side of the entry) and under the last line of each page,
    //     max 2 x 2 inches, never over text, never overlapping each other
    getMeasurePage();                     // sized measuring host for overflow tests

    // Build one flowing block list: header per entry + whole body paragraph.
    // flowPages() distributes them continuously across the A4 sheets —
    // never one-entry-per-page: the next entry starts on the SAME page right
    // after the previous one until the sheet is full to its last row.
    // One entry = one message bubble, exactly like the entries list on the
    // main page: rounded card with a soft border/background, the sender's
    // name + date as its title (colour-coded per sender), and the whole
    // message inside. Entries flow continuously — the current page fills to
    // its LAST row before the balance flows onto the next page.
    const mkBlock = (en) => {
      const isDeep = en.sender === "Deep";
      const who = escapeHtml(en.sender || getUserName() || "Me");
      // 📂 Heading band — the diary section this message belongs to, shown
      // right under the sender line in the booklet so every section is
      // visible at a glance (screen book, flipping leaf and printed PDF).
      const headingLine = en.heading
        ? "<div class='eb-heading-band'>📂 " + escapeHtml(en.heading) + "</div>"
        : "";
      // ENTRY NUMBER badge — the running number (1, 2, 3 … till the end) this
      // entry carries on EVERY booklet page. It comes from buildBookPages()'s
      // chronological numbering (the single source of truth), so the first
      // entry of a page is numbered exactly like all the others. Display-only:
      // it never touches the stored body or Supabase.
      // NO ENTRY NUMBER badge in the book (user rule) — the numbered count
      // lives only in the separate 🧮 Message Counter panel.
      return {
        kind: "para",
        // ONE message, fully together: the message text plus everything
        // related to it ("How I felt", "Note") live inside the SAME bubble.
        htmlBody: headingLine + formatBookBodyHtml(en.body || "", en.sender),
        cls: isDeep ? "eb-deep" : "eb-chota",
        who: who,
        date: formatDate(en.date),
        title: "<strong>" + who + "</strong>",
        tag: en.sender ? "<span class='book-sender " + (isDeep ? "bs-deep" : "bs-chota") + "'>📨 " + who + "</span>" : ""
      };
    };
    const blocks = [];
    if (!entries.length) {
      blocks.push({ kind: "header", html: "<p class='empty-page'>No entries yet. Go write your first page! ✍️</p>" });
    }
    // Cover sections come FIRST, in sequence; then every entry follows them,
    // packed down to each page's last row (last 2 rows stay empty).
    coverBlocks.forEach((b) => blocks.push(b));
    entries.forEach((en) => blocks.push(mkBlock(en)));

    // (The old DOM-shifting "normaliseFirstEntrySpacing" pass was removed:
    // pushing the first bubble down with extra flow padding made its heading
    // sit BETWEEN ruled lines while every other heading stayed row-aligned —
    // the exact thing users reported as "heading not proper / not trimmed".
    // First entries are now fixed AT THE SOURCE inside flowPages(): every
    // page starts at cursorY = 0, so the first bubble of every page renders
    // with byte-identical markup to the ones below it.)

    const flowed = await flowPages(blocks);
    bookPageOcc = [];                                   // reset collision data
    flowed.forEach(items => {
      pages.push(renderPageItems(items));
      bookPageOcc.push(items.occ || []);                // parallel to `pages` (index 0 = cover)
    });

    // SINGLE-PAGE MODE: no trailing padding sheet is needed any more — every
    // flowed page is its own screen, so odd counts are perfectly fine.
    return pages;
  }

  // ---- line-wise pagination engine (exact DOM measurement) ----
  // Every block is measured with the REAL browser layout engine INSIDE a
  // hidden clone of an actual book page (same CSS rules, same width, same
  // content-box height). So whatever fits during measurement fits on the
  // real sheet — text fills each A4 page down to its last row and the
  // balance always flows onto the next page. Nothing gets clipped below.

  // Measure the rendered height (layout px) of an HTML snippet as it would
  // appear inside a book page's content area.
  function measureBlockHTML(html) {
    const mp = getMeasurePage();
    if (!mp) return 30;                       // fallback so flow still works
    mp.innerHTML = html;
    const kids = Array.from(mp.children);
    let h = 0;
    if (kids.length === 1) {
      h = kids[0].getBoundingClientRect().height;
      try {
        const kcs = getComputedStyle(kids[0]);
        h += parseFloat(kcs.marginTop) + parseFloat(kcs.marginBottom);
      } catch (e) { /* ignore */ }
    } else {
      // stacked children: sum heights + margins via offset positions
      const first = kids[0], last = kids[kids.length - 1];
      if (first && last) {
        h = last.getBoundingClientRect().bottom - first.getBoundingClientRect().top;
        try {
          const fcs = getComputedStyle(first), lcs = getComputedStyle(last);
          h += parseFloat(fcs.marginTop) + parseFloat(lcs.marginBottom);
        } catch (e) { /* ignore */ }
      }
    }
    mp.innerHTML = "";
    return Math.max(1, Math.ceil(h));
  }

  // Wrap one paragraph into word-wrapped lines at `cols` characters.
  function wrapLines(text, cols) {
    const out = [];
    const paras = String(text).split("\n");
    for (const para of paras) {
      if (!para.trim()) { out.push(""); continue; }   // blank spacer line
      let cur = "";
      for (const word of para.split(/\s+/)) {
        if (!cur) { cur = word; continue; }
        if ((cur + " " + word).length <= cols) cur += " " + word;
        else { out.push(cur); cur = word; }
      }
      out.push(cur);
    }
    return out;
  }

  // Real rendered line-height of one entry-body line, measured inside the
  // hidden template page so it matches the book exactly.
  function bodyLineHeight() {
    const mp = getMeasurePage();
    if (!mp) return ROW_H + 1;
    // Measure ONE line of ordinary text — a single line-box height. (The old
    // probe used "x\nx" inside a <p>, but the browser's white-space handling
    // collapsed that into one giant box and returned nonsense, which broke
    // all row accounting.)
    mp.innerHTML = "";
    const p = document.createElement("p");
    p.className = "entry-body";
    p.textContent = "x";
    mp.appendChild(p);
    let lh = p.getBoundingClientRect().height;
    mp.innerHTML = "";
    if (!lh || lh < 8 || lh > 90) lh = ROW_H + 1;
    return lh;
  }

  // Distribute content blocks across pages, filling each page to the last
  // available row before spilling the balance onto the next page.
  //
  // While flowing text we ALSO create invisible "sticker slots":
  //   • ONLY in the empty right-hand column beside the entry — the sticker
  //     always sits on the RIGHT side of the free space, never over text
  //   • one slot per ruled row that has no text reaching into it
  // Slots are exact layout rectangles that provably contain no text, so the
  // sticker engine can always place a sticker there — never over an entry,
  // never overlapping another sticker, max size 2 x 2 inches.
  // The measuring host is now a FULL structural clone of one standard sheet
  // (see getMeasurePage + MEASURE_CSS): identical fixed geometry and
  // typography are pinned with !important rules, so NOTHING needs to be
  // copied off the live preview sheet any more. syncHostFont() is kept as a
  // no-op for call-site compatibility — the host never drifts from the
  // standard size it was built with.
  function syncHostFont(host) { /* exact-clone host: nothing to sync */ }

  // ASYNC on purpose: before ANY line is measured we wait for the measuring
  // host's web fonts to finish loading (ensureMeasureFonts). Measuring with
  // fallback fonts and then printing with the real ones is what made entries
  // run past the bottom of the PDF page; with the gate in place the layout
  // that gets flowed is byte-for-byte the layout that renders on screen AND
  // in the print window, so pages fill down to the last usable row and only
  // the true balance rolls over to the next page — automatically.
  async function flowPages(blocks) {
    const mp = getMeasurePage();
    if (!mp) return [blocks.map(b => b.html || b.htmlBody || "").join("")].map(html => ({ html, occ: [] }));
    // Wait on the HOST document's font set (the hidden sheet lives in its own
    // inert iframe): awaiting only the main document could let pagination run
    // with fallback metrics while the host still swapped fonts afterwards —
    // lines then rendered taller than measured and the bottom of pages (and
    // the PDF) got cut off.
    await ensureMeasureFonts(mp.ownerDocument || document);
    // The host is an EXACT clone of one standard A4 sheet (getMeasurePage +
    // MEASURE_CSS): 794px-wide sheet, 24px ruled rows, 120px header band,
    // 104px footer band, 30px top offset, 60px reserved bottom band. Nothing
    // is read off the scaled-down preview any more — measured lines are the
    // STANDARD lines, identical on screen and in the printed booklet.
    const bodyLH = Math.max(10, bodyLineHeight());   // == --row (24px compact)
    const box = contentBox(mp);                      // content area of the sheet
    // .page-inner / .page-content carry NO padding in the standard geometry
    // (the 30px top offset lives on .page-inner's own padding-top, which is
    // ABOVE this element; the reserved bottom band is paid from the usable
    // HEIGHT below — never double-counted as padding).
    const padT = 0;                                  // rows start at y = 0 of .page-content
    const padL = parseFloat(getComputedStyle(mp).paddingLeft) || 26;
    const padB = 0;

    // average character width measured inside the actual bubble text width.
    // COMPACT STYLE: messages use the FULL content width — they extend to the
    // end of the page margin edge-to-edge. Stickers never reserve a column:
    // they land ONLY in genuinely empty areas (right of short lines, in the
    // band under the last line), which the slot system measures from the
    // REAL rendered text rects — so no space is ever wasted up front.
    const STICKER_COL = 0;
    const textW = box.W;
    // average character width (measured, kept for slot maths consistency).
    mp.innerHTML = "<div class='entry-bubble'><div class='entry-body'>" + "a".repeat(50) + "</div></div>";
    const probeBody = mp.querySelector(".entry-body");
    const w50 = probeBody ? probeBody.getBoundingClientRect().width : 400;
    mp.innerHTML = "";
    let charW = w50 > 0 ? w50 / 50 : 8;
    charW = Math.min(Math.max(charW, 4), 14);
    void charW; void textW;   // (messages now wrap natively in the browser — no manual cols needed)

    // The COMPACT rule: entries flow down toward the bottom and fill EVERY
    // row of the page right up to the footer band — nothing is reserved as a
    // dead zone any more (the old "last 5 rows stay empty" was exactly why
    // the pages never looked full). Anything that cannot fit above the last
    // usable row (the PENDING part) continues on the NEXT page, in sequence.
    const availH = Math.max(bodyLH * 1, box.H - bodyLH * 0);   // fill to the very last row
    const MAXSIDE = Math.max(40, MAX_STICKER_IN * pageInchPx(mp));

    // ---- page state: flowing HTML + ABSOLUTE-positioned text-line rects ----
    // The ONLY pagination currency is PIXELS: `cursorY` is the exact y (in
    // page coordinates) where the next block will start, and the last row
    // of the page ends at padT + availH. A block is placed while its measured
    // real height still fits above that edge — so the sequence packs every
    // entry one after another down to the LAST ROW, and only the balance
    // that truly cannot fit moves to the next page. No row-quantisation
    // drift (that was what left pages half-empty / stopped "2 rows in").
    let cur = "", cursorY = padT;                       // px cursor over content box
    const occupied = [];                                // text-line rects (layout px)
    const pagesOut = [];
    const newPage = () => {
      // ALWAYS commit the current page — even when it holds no HTML text.
      // The cover hero paints its sheet through inline-styled divs, and a
      // flow that breaks right after an append can leave `cur` momentarily
      // "empty-looking"; dropping such pages used to shift every following
      // sheet's number and left blank-looking pages in the spread ("some
      // pages not showing the entry preview"). Page indices must stay
      // contiguous so numbers 1,2,3… run to the end on screen AND print.
      pagesOut.push({ html: cur, occ: occupied.slice() });
      cur = ""; cursorY = padT; occupied.length = 0;
    };

    // Drop trailing EMPTY pages (pages with no content) from the END of the
    // flow — they would only add blank sheets after the last real page.
    const trimTrailingEmptyPages = () => {
      while (pagesOut.length > 1 && !String(pagesOut[pagesOut.length - 1].html).trim()) {
        pagesOut.pop();
      }
    };

    // Render `html` into the measuring host AT THE CURRENT CURSOR (the host
    // is resized to exactly the page's content height so what we measure is
    // what the real sheet shows — nothing can silently overflow). Records
    // every bubble's TRUE rect in final page coordinates, advances the pixel
    // cursor by the REAL rendered bottom edge (+ margin), and commits HTML.
    const appendFlow = (html) => {
      // min-height (not a locked height): the real sheet clips at its own
      // edge, but the measuring host must report TRUE rendered geometry —
      // a locked height would clip tall content and lie about bottom edges.
      mp.style.minHeight = (padT + availH + padB) + "px";
      mp.style.height = "auto";
      mp.innerHTML = "<div class='page-flow' style='padding-top:" +
        Math.max(0, Math.round(cursorY - padT)) + "px;'>" + html + "</div>";
      const flowEl = mp.firstElementChild;
      syncHostFont(mp);
      const base = mp.getBoundingClientRect();
      const k = mp.clientWidth / (base.width || mp.clientWidth) || 1;
      let maxY = cursorY;
      // measure the bubble's own border-box so slots respect its padding,
      // rounded corners and bottom margin — stickers can never touch a card
      flowEl.querySelectorAll(".entry-bubble").forEach(node => {
        const nr = node.getBoundingClientRect();
        if (nr.width < 2 || nr.height < 2) return;
        let mb = 0;
        try { mb = parseFloat(getComputedStyle(node).marginBottom) || 0; } catch (e) { /* ignore */ }
        occupied.push({
          x: (nr.left - base.left) * k,
          y: (nr.top - base.top) * k,                    // final page y (cursor baked in)
          w: nr.width * k,
          h: (nr.height + mb) * k
        });
        const btm = (nr.bottom - base.top) * k + mb * k;
        if (btm > maxY) maxY = btm;
      });
      flowEl.querySelectorAll(".empty-page").forEach(node => {
        const rng = document.createRange();
        rng.selectNodeContents(node);
        Array.from(rng.getClientRects()).forEach(r => {
          if (r.width < 2 || r.height < 2) return;
          occupied.push({
            x: (r.left - base.left) * k,
            y: (r.top - base.top) * k,                   // final page y
            w: r.width * k,
            h: r.height * k
          });
          const btm = (r.bottom - base.top) * k;
          if (btm > maxY) maxY = btm;
        });
        rng.detach ? rng.detach() : null;
      });
      // OUR LOVE STORY cover hero: every row of the typewriter block is a
      // text line — occupy each one so stickers never land on the cover art.
      flowEl.querySelectorAll(".book-cover .cover-divider, .book-cover .cover-title-row, .book-cover .cover-names, .book-cover .cover-started, .book-cover .cover-quote").forEach(node => {
        const rng = document.createRange();
        rng.selectNodeContents(node);
        Array.from(rng.getClientRects()).forEach(r => {
          if (r.width < 2 || r.height < 2) return;
          occupied.push({
            x: (r.left - base.left) * k,
            y: (r.top - base.top) * k,
            w: r.width * k,
            h: r.height * k
          });
          const btm = (r.bottom - base.top) * k;
          if (btm > maxY) maxY = btm;
        });
        rng.detach ? rng.detach() : null;
      });
      mp.innerHTML = "";
      cursorY = maxY;                                    // exact px advance
      cur += html;
      return maxY;                                       // true bottom edge on page
    };

    // Invisible sticker-slot markers ONLY in genuinely empty areas. At most
    // ONE slot per page (the user wants one sticker per page, never "one
    // small + one tiny" together): we gather all candidate free areas —
    // beside short text rows (RIGHT side), BETWEEN stacked cards where two
    // neighbouring lines leave a horizontal gap, and in the empty band under
    // the last entry — and emit only the LARGEST one. Size auto-adjusts to
    // the space, hard capped 2x2in. A candidate is kept ONLY if it provably
    // touches no occupied text rect (strict empty-area guarantee).
    function rectsTouch(a, b) {
      return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    }
    function emitSlots() {
      const cands = [];
      const bottomLimit = padT + availH - 4;

      // group text lines by visual row (lines of one bubble share rows)
      const rows = {};
      occupied.forEach(o => {
        // cluster by vertical overlap so the bubble title and the first body
        // line that sit on the same ruled row are treated as ONE row
        const keys = Object.keys(rows);
        let key = null;
        for (const k of keys) {
          const g = rows[k];
          const gy0 = Math.min.apply(null, g.map(r => r.y));
          const gy1 = Math.max.apply(null, g.map(r => r.y + r.h));
          if (Math.min(gy1, o.y + o.h) - Math.max(gy0, o.y) > bodyLH * 0.45) { key = k; break; }
        }
        if (key === null) key = String(Math.round(o.y / 3));
        (rows[key] = rows[key] || []).push(o);
      });

      // RIGHT-side candidates: for each text row, the area to the right of the
      // longest line in that row is guaranteed empty.
      Object.keys(rows).map(Number).sort((a, b) => a - b).forEach(key => {
        const grp = rows[key];
        let rx = padL, ry = Infinity, rw = 0, rh = 0;
        grp.forEach(o => {
          if (o.x < rx) rx = o.x;
          if (o.y < ry) ry = o.y;
          const e = o.x + o.w; if (e > rw) rw = e;
          const btm = o.y + o.h; if (btm > rh) rh = btm;
        });
        rw -= rx;                                   // row width (not end-x!)
        const freeW = (padL + box.W) - (rx + rw) - STICKER_GAP;
        let side = Math.floor(Math.min(freeW, MAXSIDE, Math.max(0, bottomLimit - ry)));
        if (side < 30) return;
        cands.push({ x: Math.round(rx + rw + STICKER_GAP), y: Math.round(ry), s: side });
      });

      // BETWEEN-CARD candidates: whenever two text lines on DIFFERENT rows
      // leave a clean horizontal corridor between them (e.g. the gap under a
      // short final line of one card down to the next card's first line), a
      // full-width sticker can sit there without touching any letters.
      const occList = occupied;
      const rowKeys = Object.keys(rows).map(Number).sort((a, b) => a - b);
      rowKeys.forEach((key, ki) => {
        if (ki === 0) return;
        const prevKey = rowKeys[ki - 1];
        const upTop = Math.min.apply(null, rows[key].map(r => r.y));            // lower row top
        const lowBot = Math.max.apply(null, rows[prevKey].map(r => r.y + r.h)); // upper row bottom
        const gapH = upTop - lowBot;
        if (gapH < 34) return;
        const side = Math.floor(Math.min(gapH, MAXSIDE));
        if (side < 30) return;
        const band = { x: padL, y: Math.round(lowBot + 2), w: box.W, h: Math.round(gapH - 4) };
        for (let sx = padL; sx + side <= padL + box.W; sx += Math.max(30, Math.floor(side / 2))) {
          const cand = { x: sx, y: band.y, w: side, h: side };
          if (occList.some(o => rectsTouch(cand, o))) continue;   // strict: no text touched
          cands.push(cand);
          break;                                                   // one per corridor is enough
        }
      });

      // free band BELOW ALL text on the page → candidate on the RIGHT-hand
      // side of that empty space (never centred, never on the left)
      let lowest = padT;
      occupied.forEach(o => { if (o.y + o.h > lowest) lowest = o.y + o.h; });
      const gapH = padT + availH - lowest - 6;
      if (gapH >= 34) {
        const side = Math.floor(Math.min(gapH, MAXSIDE));
        if (side >= 30) {
          cands.push({ x: Math.round(padL + box.W - side - 2), y: padT + availH - side - 8, s: side });
        }
      }

      // ONE slot only: the largest free area wins (ties → the lower/rightmost,
      // i.e. the last candidate, matching the old bottom-band preference).
      if (!cands.length) return "";
      let best = cands[0];
      for (const c of cands) {
        const cs = (c.s !== undefined) ? c.s : Math.min(c.w, c.h);
        const bs = (best.s !== undefined) ? best.s : Math.min(best.w, best.h);
        if (cs >= bs) best = c;
      }
      const bx = best.x, by = best.y;
      const bw = (best.s !== undefined) ? best.s : best.w;
      const bh = (best.s !== undefined) ? best.s : best.h;
      return '<div class="sticker-slot" style="position:absolute;left:' +
        bx + 'px;top:' + by + 'px;width:' + bw + 'px;height:' + bh + 'px;"></div>';
    }

    // Build one message bubble (title + body) as HTML. "(continued)" is shown
    // ONLY when THIS VERY SAME ENTRY got cut mid-way and its balance carries
    // over to the next sheet (b.__cont marks those continuation pieces). An
    // entry that simply moves intact to the next page is NOT "continued" —
    // it starts fresh there, so it never gets the label.
    const bubbleHTML = (b, cont) => {
      const c = cont || b.__cont;
      // COMPACT style: no stamp inside the entry any more — the "Our Love"
      // stamp lives ONLY in the page footer. Entries render text-only.
      const stamp = "";
      if (b.cover) {
        // Cover section card — same flow engine, diary-card look.
        return "<div class='entry-bubble cover-bubble" + (c ? " eb-cont" : "") + "'>" +
          "<div class='eb-head cb-title'>" + b.title + "</div>" +
          (b.meta ? "<div class='cb-meta'>" + b.meta + "</div>" : "") +
          (b.htmlBody ? "<div class='entry-body'>" + b.htmlBody + "</div>" : "") +
          (c ? "<div class='eb-cont-note'>(continued)</div>" : "") +
        "</div>";
      }
      return "<div class='entry-bubble" + (c ? " eb-cont" : "") + " " + b.cls + "'>" +
        // The bubble title already carries "#N <strong>Sender</strong>" — the
        // old hard-coded "💬 Message from " prefix made it read
        // "💬 Message from #1 Deep" and pushed the FIRST entry's head out of
        // shape compared with everything else. Compact, correct head now:
        // 💬 #1 Sender — date [📨 tag]  (identical markup on EVERY page).
        "<div class='eb-head'>💬 " + b.title +
          " <span class='entry-date'>— " + b.date + "</span>" + b.tag +
          (c ? " <span class='eb-cont-note'>(continued)</span>" : "") +
        "</div>" +
        "<div class='entry-body'>" + b.htmlBody + "</div>" +
        stamp +
      "</div>";
    };

    // Add one ENTRY as ONE WHOLE message bubble — the message and everything
    // related to it (title, date, sender, body, "What I felt", "Note") always
    // live TOGETHER in the same place on the SAME page. We never cut a message
    // apart. The current page keeps filling with whole messages IN SEQUENCE,
    // packed one after another right down to its LAST ROW; only when the very
    // last row is reached does the next message go to the NEXT PAGE
    // ("and so continues").
    // A message taller than an entire blank sheet is split at a LINE boundary
    // — never mid-line — and the pieces are labelled "(continued)".
    //
    // Row accounting uses REAL PIXELS: cursorY tracks the exact bottom edge
    // of the last placed block (measured inside the exact page box by
    // appendFlow), and the last row ends at padT + availH. So the page truly
    // fills to the last row instead of stopping early or overflowing.
    // Measure the TRUE border-box height (+ bottom margin) a bubble would
    // have when rendered at the current cursor position of the page box.
    // IMPORTANT: the measuring host must be allowed to grow beyond the page
    // height (min-height instead of a locked height) — otherwise tall bubbles
    // get clipped by the fixed box and every long message looks like it
    // "fits", which silently corrupts the pagination maths.
    const measureBubble = (b, cont) => {
      mp.style.minHeight = (padT + availH + padB) + "px";
      mp.style.height = "auto";
      mp.innerHTML = "<div class='page-flow' style='padding-top:" +
        Math.max(0, Math.round(cursorY - padT)) + "px;'>" + bubbleHTML(b, cont) + "</div>";
      syncHostFont(mp);
      const node = mp.querySelector(".entry-bubble");
      let h = 0, mb = 0;
      if (node) {
        h = node.getBoundingClientRect().height;
        try { mb = parseFloat(getComputedStyle(node).marginBottom) || 0; } catch (e) { /* ignore */ }
      }
      mp.innerHTML = "";
      return { h, mb };
    };

    // Measure the TRUE rendered height of ANY bubble HTML string at the
    // current cursor (used by the line-split search where pieces are built
    // as raw fragments instead of block objects).
    const measureRaw = (html) => {
      mp.style.minHeight = (padT + availH + padB) + "px";
      mp.style.height = "auto";
      mp.innerHTML = "<div class='page-flow'>" + html + "</div>";
      syncHostFont(mp);
      const node = mp.querySelector(".entry-bubble");
      let h = 0, mb = 0;
      if (node) {
        h = node.getBoundingClientRect().height;
        try { mb = parseFloat(getComputedStyle(node).marginBottom) || 0; } catch (e) { /* ignore */ }
      }
      mp.innerHTML = "";
      return { h: Math.max(1, Math.ceil(h)), mb };
    };

    const flowEntry = (b) => {
      const bottomEdge = padT + availH;   // end of the usable area — the LAST row before the footer band
      // Remaining space depends on WHERE we are on the sheet: a fresh page
      // gets the full usable height; a page already holding entries only has
      // the space below the last bubble down to that last row.
      let fitPx = cur ? (bottomEdge - cursorY - 2) : (availH - 4);

      // COMPACT STYLE: the "Our Love" stamp lives ONLY in the page FOOTER —
      // nothing extra rides inside an entry, so NO stamp allowance is needed
      // in the pagination maths any more. Every measured pixel belongs to the
      // message itself and the page truly fills to its final row.
      const STAMP_RESERVE = 0;            // no in-entry stamp → no reserve
      const withStamp = false;            // (kept for call-site compatibility)

      let { h, mb } = measureBubble(b, false);
      let need = Math.max(bodyLH, Math.ceil(h + mb)) + (withStamp ? STAMP_RESERVE : 0);

      // TRUE rendered height of the whole message (the measuring host grows
      // freely). If it is taller than a full blank sheet we MUST split it at
      // line boundaries — never render an over-tall bubble that would spill
      // past the bottom edge of the page.
      const tallerThanSheet = need > availH - 4;

      if (need <= fitPx && !tallerThanSheet) {
        // fits completely above the reserved last-two-rows band → keep all
        // related content in ONE place and keep filling the page in sequence.
        appendFlow(bubbleHTML(b, false));
        return;
      }

      // The whole message does NOT fit in the remaining rows. Since a message
      // and everything related to it must stay together, move the ENTIRE
      // entry intact to the NEXT page — unless it is taller than a full blank
      // sheet, in which case we must split it at line boundaries below.
      if (cur && !tallerThanSheet) {
        cur += emitSlots();
        newPage();
        fitPx = availH - 4;               // fresh page: full usable height
      }

      // Degenerate case: even on a FRESH page the message cannot fit in the
      // usable band at all (it is taller than the whole sheet). Splitting is
      // MANDATORY here — previously this branch short-circuited and appended
      // the UN-split bubble, so the first entry of such a page rendered with
      // a DIFFERENT layout than every other entry on the sheet (spilling
      // below the page edge instead of flowing "continued" like the rest).
      // Now we only bail out when there is literally no room for lines;
      // otherwise the flow falls through to the line-boundary split below,
      // so EVERY entry — including the very first one on any page — gets the
      // identical bubble formatting and continuation treatment.
      if (!cur && fitPx < bodyLH) {
        // Not even ONE line could ever be carved out of this page — render the
        // bubble with identical formatting and let it flow onward instead of
        // special-casing it into a different layout.
        appendFlow(bubbleHTML(b, false));
        return;
      }

      // ---- PROPER TRIM AT REAL RENDERED LINE BOUNDARIES ----
      // A bubble that does not fit is NEVER left hanging past the bottom of
      // the page any more (that was the "not getting trim" complaint): the
      // tallest possible prefix fills the CURRENT page down to its last
      // usable row and the balance continues on the next page "(continued)"
      // with the SAME heading + 📂 section band as the first piece — so the
      // first entry of every page looks exactly like every other entry.
      //
      // WHY THE OLD CODE BROKE THE FIRST ENTRY OF EVERY PAGE: cutting a
      // bubble used to happen in TWO stages — (1) a hidden line-probe split
      // the body into "one unit per rendered line" using Range rect
      // binary-searches, and (2) a binary search picked the biggest prefix
      // of those units that fitted. Stage (1) mis-measured whenever fonts or
      // widths drifted: single characters became their own "lines"
      // ("and\nl\nater"), and the mangled FIRST fragment of every split
      // entry made the first entry of such pages look different from all the
      // others below it.
      //
      // NOW THE CUT HAPPENS IN SOURCE-LINE UNITS ONLY:
      //   • the body is kept EXACTLY as generated (never re-serialised
      //     through DOM ranges), just split on explicit newline characters
      //     and <br> tags — one source line = one unit;
      //   • a bubble containing N source lines always renders ≥ N rows, so
      //     taking the longest prefix of WHOLE source lines that truly fits
      //     (verified with real measurements) can never leave even a single
      //     character behind on the previous page;
      //   • the balance re-enters the SAME flowEntry() pipeline with its
      //     full head + heading band, so continuation pieces carry identical
      //     formatting to every normal entry.
      // The result: every page — including its very first entry — is trimmed
      // cleanly at real line boundaries with byte-identical bubble markup.

      // Split the bubble body into whole SOURCE lines. Runs of text between
      // "\n" characters and "<br>" tags become units. The renderer joins its
      // message lines with <br>, and closes every eb-extra/eb-label span on
      // its own line — so a naive split can NEVER tear a tag in half; each
      // unit is either plain escaped content or a complete, well-formed
      // markup fragment. (This is why formatBookBodyHtml uses <br> joins and
      // puts the extra-block closing tags on their own lines: a split entry
      // — which is exactly what the FIRST entry of a page often is — must
      // carry whole tags per line, or the leftover `<span class="eb-…">`
      // source would show up as raw HTML code on the next page.)
      const splitSourceLines = (html) => {
        const units = [];
        String(html || "").split(/<br\s*\/?>/i).forEach((chunk) => {
          chunk.split("\n").forEach((ln) => {
            const s = ln.trim();
            if (s) units.push(s);
            else if (/^\s*$/.test(ln)) units.push("");   // blank spacer line
          });
        });
        // trailing blank spacers are dropped (trimEntryLines already trims)
        while (units.length && units[units.length - 1] === "") units.pop();
        return units;
      };

      const srcUnits = splitSourceLines(b.htmlBody);
      if (!srcUnits.length) {                  // empty body: keep whole bubble
        if (cur) { cur += emitSlots(); newPage(); }
        appendFlow(bubbleHTML(b, false));
        return;
      }

      // Rebuild a body made of ONLY the first `n` source lines. Each line is
      // emitted as its own <div class="eb-line"> inside the .entry-body: the
      // row-locked CSS makes every div exactly one ruled row tall (longer
      // text wraps INSIDE its own div), so a cut between divs can never
      // orphan a leftover character and an intact bubble occupies EXACTLY the
      // same rows as a split piece — the first entry of a page renders with
      // byte-identical formatting to every other entry on that page.
      const bodyOf = (n) => {
        let out = "";
        for (let i = 0; i < n && i < srcUnits.length; i++) {
          // NO scrubbing here: srcUnits come from formatBookBodyHtml()'s own
          // output, whose content was already finalScrub()-flattened and
          // escapeHtml()-escaped. Re-scrubbing a unit like `<span class="eb-
          // extra"><span class="eb-label">💭 How I felt: </span>She was…`
          // used to STRIP the label markup and glue the felt note onto the
          // message with leftover &quot; entities — raw HTML on every SPLIT
          // entry (the first entry of a page is exactly where long entries
          // get split). The presentation tags must survive untouched.
          out += "<div class='eb-line'>" + (srcUnits[i] || "&nbsp;") + "</div>";
        }
        return out;
      };

      // Binary-search the largest prefix of whole source lines whose REAL
      // rendered bubble fits the remaining space on the current sheet.
      // IMPORTANT: the available height is re-read at DECISION time (not
      // captured earlier) — after a page break it must reflect the FULL
      // fresh-page height, so the first entry of a page gets exactly the
      // same fit test (and the same trim behaviour) as every other entry.
      const isCont = !!b.__cont;
      const fitsN = (n) => {
        const availNow = cur ? (bottomEdge - cursorY - 2) : (availH - 4);
        const m = measureRaw(bubbleHTML({ ...b, htmlBody: bodyOf(n) }, isCont));
        return Math.ceil(m.h + m.mb) <= availNow;
      };
      let take;
      if (fitsN(srcUnits.length)) take = srcUnits.length;
      else {
        let lo = 1, hi = srcUnits.length, best = 0;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (fitsN(mid)) { best = mid; lo = mid + 1; } else hi = mid - 1;
        }
        // If even ONE eb-line row does not fit (a single very long logical
        // line wrapping into many visual rows), fall back to the OLD
        // pre-wrap rendering for this bubble and split it at a REAL rendered
        // visual-line boundary instead — so no character ever dangles below
        // the page edge and the first entry of such pages still trims cleanly.
        take = best > 0 ? best : -1;
      }

      // ---- visual-line fallback (only when no whole source line fits) ----
      if (take === 0 || take === -1) {
        const holder = document.createElement("div");
        holder.className = "entry-bubble";
        holder.innerHTML = "<div class='entry-body' style='white-space:pre-wrap'>" + b.htmlBody + "</div>";
        mp.appendChild(holder);
        syncHostFont(mp);
        const nodes = [];
        (function prep(n) {
          if (n.nodeType === 3) { nodes.push(n); return; }
          if (n.nodeType === 1 && n.tagName !== "BR") Array.from(n.childNodes).forEach(prep);
        })(holder.firstChild);
        nodes.forEach((tn) => {
          if (!tn.textContent) return;
          const sp = document.createElement("span");
          sp.textContent = tn.textContent;
          tn.parentNode.replaceChild(sp, tn);
        });
        const vlines = [];   // { text } | { br:true } — one unit per RENDERED line
        const walkV = (node) => {
          if (node.nodeType === 3) {
            const txt = node.textContent;
            if (!txt.trim()) { if (/\n/.test(txt)) vlines.push({ br: true }); return; }
            const rng = document.createRange();
            rng.selectNodeContents(node);
            const rectsAll = Array.from(rng.getClientRects()).filter(r => r.width > 1 || r.height > 1);
            const topsU = [];
            rectsAll.forEach(r => { if (!topsU.some(t => Math.abs(t - r.top) < 2)) topsU.push(r.top); });
            const total = topsU.length;
            const len = txt.length;
            const lineNo = (upto) => {
              rng.setStart(node, 0);
              rng.setEnd(node, Math.min(upto, len));
              const seen = [];
              Array.from(rng.getClientRects()).forEach(r => {
                if (r.width < 1 && r.height < 1) return;
                if (!seen.some(t => Math.abs(t - r.top) < 2)) seen.push(r.top);
              });
              return seen.length;
            };
            const starts = [0];
            for (let k = 2; k <= total; k++) {
              let lo = 1, hi = len, pos = len;
              while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (lineNo(mid) >= k) { pos = mid; hi = mid - 1; } else lo = mid + 1;
              }
              starts.push(pos);
            }
            for (let i = 0; i < starts.length; i++) {
              const seg = txt.slice(starts[i], i + 1 < starts.length ? starts[i + 1] : len);
              if (seg.trim()) vlines.push({ text: seg.replace(/^\s+|\s+$/g, "") });
              else if (/\n/.test(seg)) vlines.push({ br: true });
            }
            return;
          }
          if (node.nodeType === 1) {
            if (node.tagName === "BR") { vlines.push({ br: true }); return; }
            Array.from(node.childNodes).forEach(walkV);
          }
        };
        Array.from(holder.firstChild.childNodes).forEach(walkV);
        mp.removeChild(holder);
        mp.innerHTML = "";
        const vBody = (n) => {
          let out = "", prevBr = true;
          for (let i = 0; i < n && i < vlines.length; i++) {
            const L = vlines[i];
            if (L.br) { out += "<br>"; prevBr = true; }
            else { if (!prevBr && out) out += "\n"; out += escapeHtml(L.text); prevBr = false; }
          }
          return out;
        };
        if (vlines.length) {
          let lo = 1, hi = vlines.length, bestV = 0;
          const availNow = cur ? (bottomEdge - cursorY - 2) : (availH - 4);
          while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            const m = measureRaw(bubbleHTML({ ...b, htmlBody: vBody(mid) }, isCont));
            if (Math.ceil(m.h + m.mb) <= availNow) { bestV = mid; lo = mid + 1; } else hi = mid - 1;
          }
          const takeV = Math.max(1, bestV);
          appendFlow(bubbleHTML({ ...b, htmlBody: vBody(takeV) }, isCont));
          if (takeV < vlines.length) {
            cur += emitSlots();
            newPage();
            flowEntry({ ...b, htmlBody: vBody(vlines.length) === vBody(takeV) ? "" : (() => {
              let out = "", prevBr = true;
              for (let i = takeV; i < vlines.length; i++) {
                const L = vlines[i];
                if (L.br) { out += "<br>"; prevBr = true; }
                else { if (!prevBr && out) out += "\n"; out += escapeHtml(L.text); prevBr = false; }
              }
              return out;
            })(), __cont: true });
          }
          return;
        }
        // nothing could be carved out at all: render whole, identical markup
        appendFlow(bubbleHTML(b, isCont));
        return;
      }

      // First piece of a split entry: "(continued)" ONLY when this same entry
      // was already cut once before (b.__cont) — never for an intact entry.
      appendFlow(bubbleHTML({ ...b, htmlBody: bodyOf(take) }, isCont));

      if (take < srcUnits.length) {
        // the balance of THIS message continues on the next page, still one
        // bubble with its header — related content stays attached. This is the
        // ONE case that deserves the "(continued)" label: the SAME entry is
        // literally getting continued here.
        cur += emitSlots();
        newPage();
        // Re-enter the NORMAL pipeline with the remaining whole source
        // lines: identical head, badge, date, 📂 band and bubble markup —
        // so the first entry on the new page is formatted exactly like all
        // the entries under it, and gets trimmed the same way too.
        const rest = srcUnits.slice(take).join("\n");
        flowEntry({ ...b, htmlBody: rest, __cont: true });
      }
    };

    let guard = 0;
    for (const b of blocks) {
      if (++guard > 20000) break;                       // pathological-input safety
      if (b.kind === "para") { flowEntry(b); continue; }

      // simple non-entry block (e.g. the OUR LOVE STORY cover hero, or the
      // empty-state note). A block is placed whole: if it no longer fits in
      // the remaining rows it moves to the NEXT page and is NEVER cut off
      // below the page edge. The cover hero additionally starts on its own
      // fresh sheet (page 1) so the title block sits properly as a cover.
      const h = measureBlockHTML(b.html);
      if (b.coverHero && !cur && !pagesOut.length) {
        // first block of the book → dedicated cover sheet starting at the top
        appendFlow(b.html);
        continue;
      }
      if (cursorY + h > padT + availH - 2 && cur) {
        cur += emitSlots();
        newPage();
      }
      appendFlow(b.html);
    }

    // final page: decorate its remaining empty rows
    if (cur) cur += emitSlots();
    newPage();

    // never leave dangling blank sheets AFTER the last real page — they made
    // the print booklet show empty pages and broke the "…till the end" count
    trimTrailingEmptyPages();

    return pagesOut;
  }

  function renderPageItems(pageObj) {
    // .page-flow is position:relative and spans the FULL sheet (flex:1 on
    // .page-content), so absolute sticker-slot divs sit exactly where the
    // paginator measured them — beside short lines and in the bottom band.
    return '<div class="page-flow">' + pageObj.html + "</div>";
  }

  // Store each flowed page's occupied text-line rects so the sticker engine
  // can double-check collisions on the live rendered page.
  let bookPageOcc = [];   // parallel to entry pages (offset by cover handled in buildBookPages)

  function pageHTML(i) {
    if (i < 0 || i >= bookPages.length) return "";
    return bookPages[i];
  }

  function renderSpread() {
    // A flip animation in flight belongs ONLY to the desktop spread it was
    // started on. If the reader resizes/rotates into phone mode mid-flip, the
    // pending timeout would later strip the leaf classes from a hidden element
    // and `flipping` could stay stuck true — permanently blocking plain page
    // turns on the phone. Reset the flight state whenever we re-render.
    flipping = false;
    if (leafEl) leafEl.classList.remove("flipping-forward", "flipping-back", "single-flip-forward", "single-flip-back");
    updateBookAddBtn();   // ➕ Add tab appears only while a book filter is active
    // SINGLE-PAGE MODE (every screen size): one page per screen, so the
    // counter simply walks pages 0 .. N-1 of the flowed sheets.
    const totalSheets = Math.max(1, bookPages.length);
    if (spread >= totalSheets) { spread = totalSheets - 1; }
    const cur = spread;                     // the ONE page on screen
    const lc = $("#leftContent"), rc = $("#rightContent");
    // ---- ONE PAGE AT A TIME, CONTINUOUS NUMBERING ----
    // Every numbered page (1, 2, 3, 4, 5 … till the end) gets its OWN sheet
    // rendered in the LEFT slot — which carries the correct header/footer
    // chrome. The right half of the old two-page spread is never rendered:
    // the "book type" spread view has been removed on all screen sizes.
    lc.innerHTML = pageHTML(cur);
    rc.innerHTML = "";                      // no back/spread page — always empty
    // apply random stickers on every book page
    addStickersToPage(lc, "L" + cur);
    // Real page numbers on EVERY page (cover = page 1). No padding sheets
    // exist any more, so every sheet wears its number.
    $("#leftNum").textContent  = cur < bookPages.length ? String(cur + 1) : "";
    $("#rightNum").textContent = "";        // right half is gone — never numbered
    // Page count: the reader walks EVERY numbered page (1..N).
    const totalPages = totalSheets;
    const pageInfoTxt = "Page " + (cur + 1) + " / " + totalPages;
    $("#spreadInfo").textContent = pageInfoTxt;
    const sip = $("#spreadInfoPhone"); if (sip) sip.textContent = pageInfoTxt;
    const maxPos = totalPages - 1;
    $("#prevPageBtn").disabled = cur <= 0;
    $("#nextPageBtn").disabled = cur >= maxPos;
    const tp = $("#tabPrev"), tn = $("#tabNext");   // phone tab bar (Prev/Next)
    if (tp) tp.disabled = cur <= 0;
    if (tn) tn.disabled = cur >= maxPos;
    fitBookZoom();
    updateSaveState();
  }

  // ---------- Book: reading position (session-only, NEVER stored on device) ----------
  // The book ALWAYS opens at page 1 and rebuilds itself from the source code
  // + cloud data on every single open — nothing about the book is cached or
  // saved locally (no localStorage / sessionStorage / IndexedDB anywhere).
  // "Save" only writes the bookmark row to the Supabase cloud (visible on
  // every device); it never touches local storage, and a plain refresh of
  // the page always re-renders exactly what the current code produces.
  async function loadSavedSpreadFromCloud() {
    if (!currentUser) { savedSpreadCloud = 0; return; }
    try {
      const rows = await syncGet("settings", "select=value&owner=eq." + encodeURIComponent(currentUser.toLowerCase()) + "&key=eq.book_page");
      const v = rows && rows.length ? parseInt(rows[0].value, 10) : 0;
      savedSpreadCloud = isNaN(v) || v < 0 ? 0 : v;
    } catch (e) { savedSpreadCloud = 0; /* cloud unreachable → start at page 1 */ }
  }
  async function saveBookPosition() {
    if (!currentUser) { showToast("Please sign in first 🔒"); return; }
    savedSpreadCloud = spread;
    // store in the cloud (insert-or-replace on (owner,key))
    try {
      await syncDelete("settings", "owner=eq." + encodeURIComponent(currentUser.toLowerCase()) + "&key=eq.book_page");
      await syncPost("settings", [{ owner: currentUser.toLowerCase(), key: "book_page", value: String(spread) }]);
    } catch (e) {
      showToast("⚠️ Cloud sync failed — please retry");
    }
    const b = $("#saveBookBtn");
    if (b) {
      const old = b.textContent;
      b.textContent = "✅ Saved!";
      setTimeout(() => { b.textContent = old; }, 1400);
    }
    // phone app bars — brief ✅ flash on the icon buttons
    ["#appSaveBtn", "#tabSave"].forEach((sel) => {
      const el = $(sel);
      if (!el) return;
      const ic = el.querySelector(".app-tab-ic") || el;
      const oldT = ic.textContent;
      ic.textContent = "✅";
      setTimeout(() => { ic.textContent = oldT; }, 1400);
    });
    showToast("📌 Page " + (spread + 1) + " saved — next time the book opens right here ✨");
  }
  function updateSaveState() {
    const b = $("#saveBookBtn");
    if (!b) return;
    const saved = savedSpreadCloud;
    b.classList.toggle("saved-active", saved === spread && saved > 0);
    b.title = saved > 0
      ? "Saves this page as your bookmark. Last bookmark: spread " + (saved + 1)
      : "Saves this page as your bookmark — the book will open here next time.";
    // mirror the "already saved here" state onto the phone tab-bar save button
    const tb = $("#tabSave");
    if (tb) tb.style.color = (saved === spread && saved > 0) ? "#2e7d32" : "";
  }

  // ---------- Print booklet / PDF export ----------
  // THE PDF TAKES ITS DATA FROM STORAGE AND BUILDS IT WITH THE EXACT SAME
  // RULES AS THE PREVIEW PAGE:
  //   1. fresh data is read from the cloud (loadEntries()), sorted oldest
  //      first — identical source & order to the on-screen book;
  //   2. the SAME pagination engine (buildBookPages → flowPages) lays the
  //      content out. It measures against the FULL A4 print geometry, so
  //      every PDF page fills DOWN TO ITS LAST 5TH ROW and the PENDING part
  //      of any message flows onto the NEXT page — nothing is ever cut off;
  //   3. the print window receives the pages EXACTLY as the preview flowed
  //      them — same markup/classes, same invisible right-hand sticker slots,
  //      and the app's own full-size geometry (24px ruled rows, 120px header,
  //      104px footer) embedded inline so rows/lines ALWAYS keep the standard
  //      size in the PDF;
  //   4. stickers are then baked INSIDE the print window itself, once its
  //      fonts have settled: each chosen page gets ONE sticker at a RANDOM
  //      spot inside one of the paginator's provably EMPTY RIGHT-HAND slots,
  //      re-verified against the ACTUAL rendered text lines of that sheet —
  //      so it can never overlap text or leave the free area, max 2 x 2 inches.
  // On every run, RANDOM pages get ONE sticker baked in, so each printed/
  // PDF booklet is decorated differently.

  // Full A4 sheet geometry (CSS px @ 96dpi) shared by the measuring host and
  // the print window — ONE single source of truth for every margin:
  //   sheet 794 x 1123px, header band 120px, footer band 104px,
  //   .page-inner padding 30px top / 26px sides / 0 bottom,
  //   reserved bottom band 60px (pad-b), last 5 ruled rows stay empty.
  // Text area inside .page-inner = 1123 − 120 − 88 − 30 = 885px;
  // usable flow height = 885 − 5×24 = 765px (the "price margin" the
  // paginator pays at the foot of every PDF page).
  const PRINT_SHEET_H_PX = Math.round(PRINT_A4_W_PX * 297 / 210);   // ≈1123px
  /* COMPACT geometry: bands come from the shared HEAD_H/FOOT_H constants —
     same numbers as the .book vars in style.css and MEASURE_CSS, so preview,
     paginator and PDF all pay the identical price at top and foot. */
  const PRINT_HEAD_H = HEAD_H, PRINT_FOOT_H = FOOT_H, PRINT_PAD_T = 30, PRINT_PAD_B = 60;
  const PRINT_ROW = ROW_H, PRINT_LAST_EMPTY_ROWS = 5;
  const PRINT_HOST_PAD_X = 52;                                      // 26+26
  const PRINT_INNER_H_PX = PRINT_SHEET_H_PX - PRINT_HEAD_H - PRINT_FOOT_H - PRINT_PAD_T; // 885
  const PRINT_USABLE_H_PX = PRINT_INNER_H_PX - PRINT_ROW * PRINT_LAST_EMPTY_ROWS;        // 765

  // Print-window CSS: EXACTLY the app's own print rules (style.css
  // "html.print-mode …" block + .print-sheet geometry), copied here so the
  // PDF renders with the standard full-size sheet geometry even when the
  // linked stylesheet cannot be fetched inside the print window (file:// or
  // blocked pop-up contexts). Without these rules the browser falls back to
  // default styles and everything grows huge: ~16px rows instead of the
  // standard 24px ruled rows, an unsized header/footer, unclamped logo/stamp
  // images at natural size — which is why text was cut off and stickers
  // landed on top of the entries.
  const PRINT_WIN_CSS = [
    'html,body{background:#fff;margin:0;padding:0}',
    /* ONE single source of truth for sheet geometry — identical values to the
       app (.book / .print-page vars) AND to the measuring host: 24px ruled
       rows, 120px header band, 104px footer band, 30px top offset. The bottom
       margin (--pad-b = 60px reserved band + the 5 empty last rows) is NOT
       baked into .page-inner's padding anywhere — the paginator subtracts it
       from the usable height instead, so preview, measuring host and PDF all
       pay the SAME price margin at the foot of every page. */
    '.book{--a4w:210mm;--a4h:calc(210mm * 297 / 210);--row:' + PRINT_ROW + 'px;--head-h:' + PRINT_HEAD_H + 'px;' +
      '--foot-h:' + PRINT_FOOT_H + 'px;--pad-t:' + PRINT_PAD_T + 'px;--pad-b:' + PRINT_PAD_B + 'px;' +
      'position:static;width:auto;height:auto;' +
      'transform:none;background:none;box-shadow:none;border-radius:0}',
    '.print-sheet{width:var(--a4w);height:var(--a4h);box-sizing:border-box;' +
      'display:flex;flex-direction:column;position:relative;' +
      /* overflow VISIBLE so the real-size 2.5in footer stamp can stick out
         of the sheet ("half in footer, half outside") instead of being cut */
      'overflow:visible;' +
      'background-color:#fffdf6;' +
      /* COMPACT STYLE: plain paper — the ruled diary lines are removed */
      'background-image:none;' +
      'break-after:page;page-break-after:always}',
    '.print-sheet:last-child{break-after:auto;page-break-after:auto}',
    /* fixed bands — the header logo and stamp are HARD-CAPPED so they can
       never grow and push the text area around */
    '.book-page-header{flex:0 0 var(--head-h);height:var(--head-h);box-sizing:border-box;' +
      'position:relative;display:flex;align-items:center;justify-content:center;text-align:center;' +
      'font-family:"Playfair Display",serif;font-weight:700;font-size:1.2rem;color:#b3456b;' +
      'letter-spacing:.4px;padding:0 12px;border-bottom:1.5px solid rgba(179,69,107,.35);' +
      /* ORIGINAL header band look (soft warm gradient, not a solid white block) */
      'background:linear-gradient(#fffdf6, rgba(255, 240, 245, .6));overflow:hidden}',
    '.book-page-header .bph-photo{position:absolute;left:10px;top:6px;' +
      'height:calc(var(--head-h) - 12px);max-height:calc(var(--head-h) - 12px);width:auto;' +
      'max-width:162px;object-fit:contain;' +
      /* NO box around the Soulmate Code preview (bare image on white) */
      'border:none;background:transparent;box-shadow:none;pointer-events:none}',
    '.bph-title{white-space:nowrap}',
    '.book-page-footer{flex:0 0 var(--foot-h);height:var(--foot-h);box-sizing:border-box;' +
      'position:relative;display:flex;align-items:center;gap:6px;padding:4px 16px;' +
      /* the footer band is transparent so the page's ruled lines keep running
         THROUGH it — only a thin top border separates it from the text area */
      'background:transparent;border-top:1px solid rgba(179,69,107,.25)}',
    '.book-page-footer .page-num{margin-right:auto}',
    /* REAL postage-stamp size in the FOOTER: 2.5in × 2.5in (≈63.5mm — the
       classic oversized commemorative stamp), pinned to the footer band's
       right edge and centred on its top border line, so it sits half inside
       the footer and half hangs below the sheet's bottom edge ("half in /
       half out", as requested). The sheets therefore use overflow:visible. */
    '.love-stamp{height:calc(var(--a4w) * 2.5 / 8.267);max-height:calc(var(--a4w) * 2.5 / 8.267);' +
      'max-width:calc(var(--a4w) * 2.5 / 8.267);width:auto;object-fit:contain;' +
      'transform:rotate(-4deg);pointer-events:none}',
    '.book-page-footer .love-stamp{position:absolute;right:14px;top:calc(50% - 45px);' +   /* lifted 45px so it never gets cut at the bottom edge */
      'transform:translateY(-50%) rotate(-4deg);z-index:4;margin-left:0}',
    /* 🚫 COMPACT STYLE: the stamp NEVER rides inside an entry bubble — its
       ONLY home is the page footer. This rule force-hides any stray stamp
       image left over from older saved markup, in the PDF too. */
    '.entry-bubble .love-stamp{display:none!important}',
    '.footer-initials{display:inline-flex;position:absolute;left:50%;transform:translateX(-50%);' +
      'align-items:flex-start;gap:10px;font-family:"Playfair Display",serif;font-weight:700;color:#b3456b;' +
      'white-space:nowrap;pointer-events:none}',
    '.footer-initials .fi-side{display:inline-flex;flex-direction:column;align-items:center;gap:2px}',
    '.footer-initials .fi-letter{display:inline-flex;align-items:center;justify-content:center;' +
      'width:38px;height:38px;border:1.5px solid rgba(179,69,107,.55);border-radius:50%;' +
      'font-size:1.1rem;line-height:1;background:#fff}',
    '.footer-initials .fi-heart{font-size:1.1rem;line-height:38px}',
    '.footer-initials img.fi-sign{height:46px;max-height:46px;' +
      'max-width:74px;width:auto;object-fit:contain;pointer-events:none}',
    '.page-num{font-size:.85rem;color:#9a8265}',
    /* text area: starts exactly one ruled row under the header and reaches
       down to the footer band — identical to the preview sheet AND to the
       measuring host. NO bottom padding here: the reserved bottom band is a
       pagination margin, paid by the flow engine, not baked into the CSS. */
    '.page-inner{flex:1 1 auto;min-height:0;padding:var(--pad-t) 26px 0;' +
      'box-sizing:border-box;overflow:hidden;text-align:left;display:flex}',
    '.page-content{position:relative;display:flex;flex:1;min-height:100%;align-self:stretch}',
    '.page-flow{position:relative;flex:1;min-height:100%;align-self:stretch}',
    '.sticker-slot{position:absolute;visibility:hidden;pointer-events:none}',
    /* STANDARD-SIZE typography — one body line = exactly one 24px ruled row,
       one head line = exactly one row, one bubble gap = exactly one row */
    '.page-content .entry-body{font-size:.8rem;line-height:var(--row);white-space:pre-wrap;' +
      'word-break:break-word;color:#3c2f1e;margin:0}',
    /* one SOURCE line per <div class="eb-line"> — identical row-locked
       typography in the PDF, so split pieces render exactly like intact
       entries (the first entry of every page included) */
    '.page-content .entry-body .eb-line{display:block;font-size:.8rem;line-height:var(--row);' +
      'min-height:var(--row);margin:0;padding:0}',
    '.page-content h4{font-family:"Playfair Display",serif;font-size:1rem;color:#5b3d1e;margin:0 0 2px;line-height:var(--row)}',
    '.page-content .entry-date{font-size:.7rem;color:#9a8265}',
    '.entry-bubble{background:transparent;border:none;border-left:3px solid rgba(179,69,107,.45);' +
      'border-radius:0;padding:0 12px 0 10px;margin:0 0 var(--row);box-sizing:border-box;overflow:visible}',
    '.entry-bubble.eb-deep{border-left-color:#b3541f}',
    '.entry-bubble.eb-chota{border-left-color:#c2185b}',
    '.entry-bubble .eb-head{font-family:"Playfair Display",serif;font-size:.86rem;color:#5b3d1e;' +
      'margin:0;line-height:var(--row);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.entry-bubble .eb-head strong{font-weight:700}',
    '.entry-bubble.eb-deep .eb-head strong{color:#b3541f}',
    '.entry-bubble.eb-chota .eb-head strong{color:#c2185b}',
    '.entry-bubble .eb-cont-note{font-size:.72rem;color:#9a8265;font-style:italic}',
    /* 📂 heading band — the SAME HEADING_BAND_CSS string the measuring host
       and the on-screen preview use → identical style in PDF and preview */
    HEADING_BAND_CSS.replace(/__SCOPE__/g, '.entry-bubble .eb-heading-band'),
    EB_NO_CSS.replace(/__SCOPE__/g, '.entry-bubble .eb-no'),
    '.entry-bubble .eb-extra{display:block;margin-top:4px}',
    '.entry-bubble .eb-label{font-weight:600;font-style:italic;color:#9a8265}',
    '.book-sender{font-size:.7rem}',
    '.cover-bubble{border:1px solid rgba(179,69,107,.35);border-left:5px solid #b3456b;' +
      'border-radius:14px;padding:10px 14px 9px;margin:0 0 var(--row);box-sizing:border-box;overflow:hidden}',
    '.cover-bubble .cb-title{font-family:"Playfair Display",serif;font-size:1.05rem;font-weight:700;' +
      'color:#5b3d1e;margin:0 0 4px;line-height:1.3}',
    '.cover-bubble .cb-meta{font-size:.8rem;color:#9a8265;margin:0 0 6px;line-height:1.5}',
    '.cover-bubble .entry-body{line-height:var(--row)}',
    '.empty-page{font-style:italic;color:#9a8265;line-height:var(--row)}',
    /* cover hero keeps the same centred look and row-aligned lines */
    '.book-cover{text-align:center}',
    '.page-content .book-cover{padding-top:clamp(30px,16%,170px)}',
    '.book-cover .cover-title-row,.book-cover .cover-divider,.book-cover .cover-names,' +
      '.book-cover .cover-started,.book-cover .cover-quote{line-height:var(--row)}',
    /* baked-in random stickers: frozen layout px, always fully visible, in
       the exact empty RIGHT-side slot they were measured into */
    '.page-sticker{position:absolute;z-index:5;pointer-events:none;' +
      'filter:drop-shadow(0 2px 4px rgba(0,0,0,.18));background:transparent;' +
      'border:none;border-radius:0;object-fit:contain;opacity:.95 !important;' +
      'transform:rotate(var(--rot,0deg)) scale(1) !important;animation:none !important}',
    '@page{size:A4 portrait;margin:0}',
    '@media print{html,html *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important}' +
      'body{background:#fff}}'
  ].join('\n');

  // Absolute upper edge of the usable text area on a printed sheet, in the
  // print window's own pixels: header band (96) + first-row offset (30) +
  // all rows that may hold text — the last FIVE ruled rows stay empty, the
  // same rule the paginator flowed the pages with. Any text rect extending
  // BELOW this edge means content overflowed the sheet.
  const PRINT_TEXT_BOTTOM_PX = PRINT_HEAD_H + PRINT_USABLE_H_PX;   // 120 + 765 = 885px

  function printBooklet() {
    // 1) FRESH DATA FROM STORAGE — rebuild the book pages exactly like the
    //    preview does (same storage read, same sort, same pagination rules),
    //    THEN export. The rebuild is awaited so the PDF always carries the
    //    LATEST saved entries, flowed with the final font metrics.
    const startPrint = () => {
    if (!bookPages.length) { showToast("The book is not ready yet — give it a second ⏳"); return; }
    // 2) Fresh randomness for every print run → stickers land on different
    //    pages each time the booklet is printed / saved as PDF.
    const chosen = new Set();
    for (let i = 0; i < bookPages.length; i++) {
      if (Math.random() < 0.5) chosen.add(i);
    }
    if (!chosen.size) chosen.add(Math.floor(Math.random() * bookPages.length));
    // 3) Pages go to the print window EXACTLY as the preview shows them —
    //    raw flowed HTML with the invisible right-side sticker slots kept,
    //    so the PDF inherits the identical standard geometry and the last-
    //    five-rows-empty flow. Stickers are baked IN THE PRINT WINDOW ITSELF
    //    after its fonts/images have loaded, by the SAME collision-checked
    //    placement maths as the preview — restricted to the explicit EMPTY
    //    RIGHT-HAND slots. This guarantees no overlap in the PDF even when
    //    web-font metrics differ between windows.
    const pages = bookPages.slice();
    const printSeed = Date.now().toString(36);
    // booklet-wide zoom used when a page's text overflows its A4 sheet (the
    // fit pass re-flows EVERYTHING at this scale so no page is torn in half)
    let printFlowZoom = 1;
    {
      const win = window.open("", "_blank");
      if (!win) { showToast("Pop-up blocked — allow pop-ups to print 🖨️"); return; }
      // Import the app stylesheet — the print window uses the app's OWN
      // .print-sheet/.book-page-header/.page-inner/.entry-bubble rules, so
      // the PDF renders with the identical geometry the paginator measured.
      let styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map(l => '<link rel="stylesheet" href="' + l.href + '">').join("\n");
      let body = "";
      // ONE printed page per previewed book page — markup IDENTICAL to the
      // on-screen sheets (#pageLeft/#pageRight): same A4 PORTRAIT sheet, same
      // header/footer bands, same .page-inner > .page-content nesting. The
      // baked-in stickers and "Our Love" stamps therefore keep the SAME place
      // and size in the PDF as in the preview.
      const mkSheet = (pgHTML, num) =>
        '<div class="book print-mode">' +
          '<div class="print-sheet">' +
            '<div class="book-page-header">' +
              '<img class="bph-photo bph-photo-left" src="' + SOULMATE_CODE_IMG + '" alt="Soulmate Code" referrerpolicy="no-referrer">' +
              '<div class="bph-title">💕 OUR LOVE STORY 💕</div>' +
            '</div>' +
            '<div class="page-inner"><div class="page-content">' + pgHTML + '</div></div>' +
            '<div class="book-page-footer">' +
              '<span class="page-num">' + (num <= bookPages.length ? String(num) : "") + '</span>' +
              FOOTER_INITIALS_HTML +
              '<img class="love-stamp" src="' + LOVE_STAMP_IMG + '" alt="Our Love stamp" referrerpolicy="no-referrer">' +
            '</div>' +
          '</div>' +
        '</div>';
      for (let i = 0; i < pages.length; i++) {
        if (!pages[i]) continue;                    // blank padding page
        body += mkSheet(pages[i], i + 1);
      }
      // Rebuild the WHOLE booklet body inside the already-open print window.
      // Used by the overflow safety net: instead of surgically moving DOM
      // nodes between cloned sheets (which tore the layout and skipped entry
      // previews), the entire flow is re-paginated from the same blocks at a
      // slightly smaller zoom and written fresh — every page then fills
      // properly and numbers run 1, 2, 3 … to the end without gaps.
      const rebuildPrintBooklet = (D) => {
        const z = printFlowZoom;
        const zAttr = (z && Math.abs(z - 1) > 0.001)
          ? ' style="zoom:' + z + '"' : "";
        let html = "";
        for (let i = 0; i < pages.length; i++) {
          if (!pages[i]) continue;                  // blank padding page
          html += mkSheet(
            zAttr ? pages[i].replace('<div class="page-flow">', '<div class="page-flow" style="zoom:' + z + '">') : pages[i],
            i + 1);
        }
        D.body.innerHTML = html;
        void D.body.offsetWidth;                    // force layout before measuring
      };
      // The app stylesheet is imported for fidelity, AND the same rules are
      // also embedded inline (PRINT_WIN_CSS) so the standard row/line sizes
      // apply even if the linked file cannot be fetched in the pop-up.
      win.document.write(
        '<!DOCTYPE html><html class="print-mode"><head><title>Our Love Story — Booklet</title>' + styleLinks +
        '<style>' + PRINT_WIN_CSS + '</style></head><body>' + body + '</body></html>');
      win.document.close();
      win.focus();
      // 4) BAKE THE STICKERS INSIDE THE PRINT WINDOW once its layout is final
      //    (fonts + images loaded). Placement uses the SAME collision-checked
      //    maths as the preview but measures against the ACTUAL rendered PDF
      //    sheets, restricted to the explicit empty RIGHT-HAND slots — so a
      //    sticker can never overlap text or land outside free space in the
      //    PDF, whatever font metrics the print window ends up using.
      const decoratePrintSheets = () => {
        let decorated = 0;
        try {
          // ⚠️ `win` is the PRINT WINDOW's raw Window object — it has NO
          // createRange() method (that lives on its DOCUMENT). Calling
          // W.createRange() threw "W.createRange is not a function", which
          // killed fitAllSheets → decoratePrintSheets never ran → ZERO
          // stickers ever appeared in the PDF. Every Range must be created
          // through the print window's own document instead.
          const W = win, D = W.document;
          const sheets = Array.from(D.querySelectorAll(".print-sheet"));
          const inchPx = () => {
            const s = sheets.find(sh => sh.getBoundingClientRect().width > 100);
            return s ? s.getBoundingClientRect().width / 8.267 : 96;
          };
          const rectsTouch = (a, b) =>
            a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
          // 🩹 ZERO-RECT FIX (the reason NO sticker appeared in the PDF):
          // the paginator emits its reserved empty areas as
          // <div class="sticker-slot" style="..."> with CSS
          // `visibility:hidden` — and Chrome reports getBoundingClientRect()
          // of visibility-hidden elements as a rect of size 0×0 at the
          // origin. The old code measured those rects, every slot collapsed
          // to w/h = 0, the ≥30px filter dropped ALL of them → zero usable
          // slots → decoratePrintSheets silently returned "0 stickers baked"
          // for EVERY page. The preview engine never hit this because it
          // parses the INLINE pixel geometry instead (see getStickerSlots).
          // So: read left/top/width/height from the slot's own inline styles
          // (plain px strings written by the paginator) and convert them
          // into viewport coords via the slot's OFFSET PARENT — .page-content
          // is position:relative in both the app stylesheet and PRINT_WIN_CSS,
          // so that is pc itself; we resolve it generically anyway. If a slot
          // carries no inline styles at all, fall back to its bounding rect.
          // ⚠️ CRITICAL FIX (the reason STILL no sticker appeared in the PDF):
          // the inline left/top of a slot are relative to its REAL offset
          // parent — .page-flow (position:relative in both style.css and
          // PRINT_WIN_CSS), NOT .page-content. The old code only added the
          // offset-parent delta when `offsetParent !== pc`; since the flow's
          // rect top EQUALS pc's content top (slots were measured against the
          // very same origin by the paginator), the correct delta is ZERO and
          // the parsed coordinates ARE already page-correct. On top of that,
          // Chrome reports offsetParent as NULL for visibility:hidden
          // elements, so even the branch could never run. Slots therefore
          // collapsed or mis-mapped → every candidate was dropped →
          // "0 stickers baked" on every print run.
          const slotRectInPage = (el, pc) => {
            const base = pc.getBoundingClientRect();
            if (base.width < 2) return null;
            let x = parseFloat(el.style.left), y = parseFloat(el.style.top);
            let w = parseFloat(el.style.width), h = parseFloat(el.style.height);
            if ([x, y, w, h].every(v => isFinite(v)) && w >= 2 && h >= 2) {
              return { x, y, w, h };                 // page-local px == viewport px here
            }
            const r = el.getBoundingClientRect();
            if (r.width > 2 && r.height > 2) {
              return { x: r.left, y: r.top, w: r.width, h: r.height };
            }
            return null;
          };
          // exact rectangles of every VISIBLE TEXT LINE inside one sheet's
          // content area (excluding the invisible slot markers themselves)
          const textRectsOf = (pc) => {
            const out = [];
            // NOTE: must be created with the PRINT WINDOW's own document —
            // the main app document cannot build ranges over the pop-up's
            // nodes (that threw, was swallowed below and skipped ALL baking).
            const walk = win.document.createTreeWalker(pc, NodeFilter.SHOW_TEXT, {
              acceptNode(n) {
                if (!n.textContent || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
                const p = n.parentElement;
                if (!p || p.closest(".sticker-slot")) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
              }
            });
            let node;
            while ((node = walk.nextNode())) {
              const rng = D.createRange();
              rng.selectNodeContents(node);
              Array.from(rng.getClientRects()).forEach(r => {
                if (r.width > 1 && r.height > 1) out.push({ x: r.left, y: r.top, w: r.width, h: r.height });
              });
            }
            return out;
          };
          const IPX = inchPx();
          sheets.forEach((sheet, si) => {
            // map sheet index back to the original book page index
            const pgIdx = (() => {
              const numEl = sheet.querySelector(".page-num");
              const n = numEl ? parseInt(numEl.textContent, 10) : NaN;
              return isNaN(n) ? si : n - 1;
            })();
            if (!chosen.has(pgIdx)) return;             // random pages only
            const pc = sheet.querySelector(".page-content");
            if (!pc) return;
            const base = pc.getBoundingClientRect();
            if (base.width < 50) return;
            // the invisible right-hand EMPTY slots the paginator reserved —
            // read from their INLINE geometry (see slotRectInPage: hidden
            // elements report zero rects, which used to kill every slot)
            const slots = Array.from(pc.querySelectorAll(".sticker-slot"))
              .map(el => slotRectInPage(el, pc))
              .filter(s => s && s.w >= 30 && s.h >= 30);
            const texts = textRectsOf(pc);
            const rand = seededRand(printSeed + "-W" + si);
            const maxSize = MAX_STICKER_IN * IPX;
            const hitsText = (rect) => texts.some(t => rectsTouch(rect, t));
            // pick the largest slot; randomise among equal-size candidates
            let usable = slots.slice().sort((a, b) =>
              Math.min(b.w, b.h) - Math.min(a.w, a.h));
            // 🩹 SELF-HEAL: no stored slot survived (older markup, stripped
            // DOM, or metrics drift) → derive ONE provably-empty square from
            // the ACTUAL rendered text rects of THIS sheet — anything that
            // touches no letter is genuinely empty space. This guarantees the
            // sticker always appears somewhere in the free area (beside short
            // lines / under the last line), never over text.
            if (!usable.length) {
              const padL = 26;
              const Wd = base.width, Hd = base.height;
              let best = null;
              texts.forEach(t => {
                const freeW = base.right - (t.x + t.w) - 6;
                const side = Math.floor(Math.min(freeW, maxSize, base.bottom - t.y));
                if (side >= 30 && (!best || side > best.s)) {
                  best = { x: Math.round(t.x + t.w + 6), y: Math.round(t.y), s: side };
                }
              });
              let lowestY = base.top;
              texts.forEach(t => { if (t.y + t.h > lowestY) lowestY = t.y + t.h; });
              const gapH = base.bottom - lowestY - 6;
              if (gapH >= 34) {
                const side = Math.floor(Math.min(gapH, maxSize, Wd - 2 * padL));
                if (side >= 30 && (!best || side >= best.s)) {
                  best = { x: Math.round(base.right - side - 2), y: Math.round(lowestY + 4), s: side };
                }
              }
              if (best) {
                const cand = { x: best.x, y: best.y, w: best.s, h: best.s };
                if (!hitsText(cand) &&
                    cand.x >= base.left - 1 && cand.y >= base.top - 1 &&
                    cand.x + cand.w <= base.right + 1 && cand.y + cand.h <= base.bottom + 1) {
                  usable = [cand];
                }
              }
            }
            if (!usable.length) return;             // truly no provably empty spot
            const topSize = Math.min(usable[0].w, usable[0].h);
            const ties = usable.filter(s => Math.min(s.w, s.h) >= topSize - 1);
            const slot = ties[Math.floor(rand() * ties.length)];
            // 🎯 THE STICKER FILLS ITS EMPTY SPACE: previously the side was
            // randomly shrunk to 72–100% of the slot (and the collision loop
            // could shrink it further), so the sticker looked too small for
            // the reserved gap. Now the sticker is sized EXACTLY to the empty
            // space — the full slot square, hard-capped at 2 x 2 inches —
            // and centred inside it. The slot itself was measured by the
            // paginator as an area that provably touches no text line, so
            // filling it completely keeps the absolute no-overlap rule.
            const maxSide = Math.floor(Math.min(slot.w, slot.h, maxSize));
            if (maxSide < 30) return;
            const side = maxSide;
            let spot = {
              x: slot.x + (slot.w - side) / 2,
              y: slot.y + (slot.h - side) / 2,
              w: side, h: side
            };
            // SAFETY NET: if font metrics drifted between the measuring host
            // and this window so that even the full slot now touches a text
            // line, never print over letters — shrink (anchored at the slot's
            // top-left, which is always the farthest corner from the entry
            // text on right-hand slots) until provably clear.
            if (hitsText(spot) ||
                spot.x < base.left - 1 || spot.y < base.top - 1 ||
                spot.x + spot.w > base.right + 1 || spot.y + spot.h > base.bottom + 1) {
              spot = null;
              for (let s = maxSide - 6; s >= 30 && !spot; s -= 6) {
                const c = { x: slot.x, y: slot.y, w: s, h: s };
                if (hitsText(c)) continue;
                if (c.x < base.left - 1 || c.y < base.top - 1 ||
                    c.x + c.w > base.right + 1 || c.y + c.h > base.bottom + 1) continue;
                spot = c;
              }
            }
            if (!spot) return;                                // genuinely no free spot
            // Google Drive images can be slow / blocked inside the print
            // pop-up. The instant SVG fallback art (same source as the live
            // preview) is baked FIRST, so EVERY chosen page always shows a
            // sticker in the PDF; the real Drive photo then quietly upgrades
            // it only when it loads before printing.
            const img = W.document.createElement("img");
            img.className = "page-sticker";
            img.alt = "";
            img.referrerPolicy = "no-referrer";
            img.draggable = false;
            const svg = FALLBACK_STICKERS[Math.floor(rand() * FALLBACK_STICKERS.length)];
            img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
            img.dataset.driveUrl = STICKER_URLS[Math.floor(rand() * STICKER_URLS.length)];
            // convert visual px → CSS px relative to the positioned ancestor.
            // ⚠️ The slot's inline coordinates are ORIGIN-NATIVE: the
            // paginator measured them against .page-flow (the slot's real
            // offset parent, position:relative). So the sticker — which is
            // appended INSIDE that same flow — must be anchored to the FLOW
            // rect, not to .page-content; anchoring to pc shifted every
            // sticker by the flow's top padding and pushed it onto text.
            const anc = (pc.querySelector(":scope > .page-flow") || pc);
            const abase = anc.getBoundingClientRect();
            img.style.position = "absolute";
            img.style.left = Math.round(spot.x - abase.left) + "px";
            img.style.top = Math.round(spot.y - abase.top) + "px";
            img.style.width = Math.round(spot.w) + "px";
            img.style.height = Math.round(spot.h) + "px";
            img.style.setProperty("--rot", ((rand() * 16) - 8).toFixed(1) + "deg");
            anc.appendChild(img);
            decorated++;
          });
          // clean the invisible slot markers out of the print DOM
          D.querySelectorAll(".sticker-slot").forEach(n => n.remove());
          // upgrade the baked SVGs to the real Drive sticker images (the SVG
          // art prints fine if any image fails or is slow to load).
          // ⏳ THE UPGRADE IS AWAITED: previously doPrint() fired while these
          // images were still loading, so the network-dependent Drive photos
          // often arrived AFTER the PDF was generated — and on offline/slow
          // connections the baked stickers only ever showed as raw inline
          // SVG data-URIs in "Save as PDF" output. Now printing waits for
          // every upgrade (preloadImage resolves null after its own 6s
          // timeout, so a failed image can never block the print dialog).
          const baked = Array.from(D.images).filter(im => im.dataset && im.dataset.driveUrl);
          return Promise.all(baked.map(im => preloadImage(im.dataset.driveUrl).then(loaded => {
            if (!loaded || !loaded.naturalWidth) return;
            let w = parseFloat(im.style.width) || im.width, h = parseFloat(im.style.height) || im.height;
            const ratio = loaded.naturalWidth / loaded.naturalHeight;
            if (w / h > ratio) w = h * ratio; else h = w / ratio;
            im.style.width = Math.round(w) + "px";
            im.style.height = Math.round(h) + "px";
            im.src = im.dataset.driveUrl;
            // keep the sticker CENTRED in its empty slot while resizing: the
            // width/height ratio may trim one dimension, so re-anchor left/top
            // around the original centre to stay inside the reserved gap.
            const prevLeft = parseFloat(im.style.left) || 0;
            const prevTop = parseFloat(im.style.top) || 0;
            const prevW = (parseFloat(im.style.width) || im.width);
            const prevH = (parseFloat(im.style.height) || im.height);
            const cx = prevLeft + prevW / 2, cy = prevTop + prevH / 2;
            im.style.left = Math.round(cx - w / 2) + "px";
            im.style.top = Math.round(cy - h / 2) + "px";
          }))).then(() => decorated);
        } catch (e) {
          return Promise.resolve(decorated);
        }
      };
      const doPrint = () => { setTimeout(() => { try { win.print(); } catch (e) { /* user can press Ctrl+P */ } }, 200); };
      // Print-window hygiene: the app's own stylesheet also carries the
      // on-screen book rules. Pin the pop-up to plain paper so no leftover
      // screen chrome (ruled-line backgrounds, shadows) leaks into the PDF;
      // PRINT_WIN_CSS below still supplies every sheet rule regardless.
      try { win.document.documentElement.classList.add("print-mode"); win.document.body.style.background = "#fff"; } catch (e) { /* ignore */ }
      // FINAL SAFETY NET — "fit the page so it is visible properly": after the
      // print window has fully rendered, measure EVERY sheet. If any entry or
      // text line reaches below the usable area (font metrics drifted between
      // the measuring host and the print window), that page's content is
      // automatically re-split: the overflowing tail moves down onto a NEW
      // page inserted right after it — never cut off, always visible in the
      // PDF. The fix loops until every printed page fits its A4 sheet.
      //
      // SHAKE-FIT (the user asked for entry text to be SHRUNK so everything
      // fits its fields properly): before moving anything to a new page, an
      // overflowing sheet is first scaled down IN SMALL STEPS (zoom 1 → .98 →
      // .96 … floor .90) on BOTH sides of the split. Shrinking keeps the whole
      // entry together on the same page whenever a few percent less font size
      // is enough; only when even the minimum shrink cannot help does the
      // balance roll over to the next sheet. The preview book runs the exact
      // same pass (fitBookSheets), so what the reader sees is what the PDF
      // prints. Zooming a flow scales ALL of its px (lines, gaps, stamps and
      // heading bands alike), so bottom ≤ limit + 2 ⟹ fit at that zoom step.
      const ZOOM_STEPS = [1, 0.98, 0.96, 0.94, 0.92, 0.90];
      const applyFlowZoom = (inner, z) => {
        if (!inner) return;
        if (z && Math.abs(z - 1) > 0.001) inner.style.zoom = String(z);
        else { inner.style.removeProperty("zoom"); }
      };
      const fitAllSheets = () => {
        const D = win.document;
        let fixedAny = false, pass = 0;
        while (pass++ < 12) {
          // RE-PAGINATE THE WHOLE BOOKLET FROM SCRATCH every pass. Cloning a
          // sheet and moving DOM nodes across it used to tear the layout:
          // half-empty pages, missing entry previews and wrong page numbers
          // in the printed PDF ("print page not coming out properly"). Now
          // each pass measures EVERY sheet against the usable area; if any
          // content hangs below its bottom edge, the ENTIRE booklet is
          // re-flowed from the same blocks at a slightly smaller zoom and
          // rebuilt — so all pages fill correctly and numbers always run
          // 1, 2, 3 … to the end.
          const sheets = Array.from(D.querySelectorAll(".print-sheet"));
          if (!sheets.length) break;                 // not laid out yet
          const sRect = sheets[0].getBoundingClientRect();
          if (sRect.width < 100) break;              // not laid out yet
          const headH = PRINT_HEAD_H, footH = PRINT_FOOT_H, row = PRINT_ROW, padT = PRINT_PAD_T;
          const innerH = sRect.height - headH - footH - padT;   // .page-inner content height
          const availH = innerH - row * PRINT_LAST_EMPTY_ROWS;  // == PRINT_USABLE_H_PX
          const maxBottomLocal = availH;                        // relative to .page-content top
          let worstOver = 0;
          for (const sheet of sheets) {
            const pc = sheet.querySelector(".page-content");
            if (!pc) continue;
            const inner = pc.querySelector(":scope > .page-flow") || pc;
            const pRect = pc.getBoundingClientRect();
            const limit = pRect.top + maxBottomLocal;
            let lowest = pRect.top;
            inner.querySelectorAll(".entry-bubble, .empty-page, .book-cover").forEach(n => {
              if (n.closest(".page-sticker")) return;
              const r = n.getBoundingClientRect();
              if (r.height > 0 && r.bottom > lowest) lowest = r.bottom;
            });
            const over = lowest - limit;
            if (over > 2 && over > worstOver) worstOver = over;
          }
          if (!worstOver) break;                      // everything fits ✓
          // pick the next smaller zoom step that could plausibly fix the
          // overflow (content is ~1 + over/usable taller than the sheet)
          const needed = 1 / (1 + worstOver / Math.max(60, maxBottomLocal));
          let nz = ZOOM_STEPS[ZOOM_STEPS.length - 1];
          for (let zi = 0; zi < ZOOM_STEPS.length; zi++) {
            if (ZOOM_STEPS[zi] <= printFlowZoom + 0.0001 && ZOOM_STEPS[zi] <= needed) { nz = ZOOM_STEPS[zi]; break; }
            if (ZOOM_STEPS[zi] <= needed) { nz = ZOOM_STEPS[zi]; break; }
          }
          if (!(nz < printFlowZoom - 0.0005)) break;  // no smaller step left — stop
          printFlowZoom = nz;
          rebuildPrintBooklet(D);                     // full re-flow at the new zoom
          fixedAny = true;
        }
        if (fixedAny) renumberSheets();
        return fixedAny;
      };
      // one guaranteed-empty RIGHT-HAND slot sized to the truly free area of
      // a rendered .page-content (used after an automatic overflow split)
      const reserveSlot = (pc) => {
        const W = win, D = W.document;
        const base = pc.getBoundingClientRect();
        if (base.width < 50) return;
        const padL = 26, MAXSIDE = Math.min(2 * (base.width / 8.267), base.width * 0.4);
        const texts = [];
        const walk = D.createTreeWalker(pc, NodeFilter.SHOW_TEXT, {
          acceptNode(n) {
            if (!n.textContent || !n.textContent.trim()) return NodeFilter.FILTER_REJECT;
            const p = n.parentElement;
            if (!p || p.closest(".sticker-slot") || p.closest(".page-sticker")) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let node;
        while ((node = walk.nextNode())) {
          // ⚠️ Range must come from the print window's DOCUMENT — Window has
          // no createRange(). The old W.createRange() threw here, killing the
          // whole fitAllSheets → decoratePrintSheets chain: NO sticker ever
          // appeared in the PDF.
          const rng = D.createRange(); rng.selectNodeContents(node);
          Array.from(rng.getClientRects()).forEach(r => {
            if (r.width > 1 && r.height > 1) texts.push({ x: r.left, y: r.top, w: r.width, h: r.height });
          });
        }
        let lowestTop = base.bottom;
        const rowsOf = {};
        texts.forEach(t => {
          const key = String(Math.round(t.y / 15) * 15);
          (rowsOf[key] = rowsOf[key] || []).push(t);
        });
        Object.keys(rowsOf).map(Number).sort((a, b) => a - b).forEach(key => {
          const grp = rowsOf[key];
          let rx = Infinity, ry = Infinity, rw = 0, rh = 0;
          grp.forEach(o => {
            if (o.x < rx) rx = o.x;
            if (o.y < ry) ry = o.y;
            const e = o.x + o.w; if (e > rw) rw = e;
            const btm = o.y + o.h; if (btm > rh) rh = btm;
          });
          const freeW = base.right - (rx + rw) - 6;
          const side = Math.floor(Math.min(freeW, MAXSIDE, base.bottom - ry));
          if (side >= 30 && ry < lowestTop) lowestTop = ry;
        });
        // candidate beside the last text row (right side)
        let best = null;
        texts.forEach(t => {
          const freeW = base.right - (t.x + t.w) - 6;
          const side = Math.floor(Math.min(freeW, MAXSIDE, base.bottom - t.y));
          if (side >= 30 && (!best || side > best.s)) best = { x: Math.round(t.x + t.w + 6), y: Math.round(t.y), s: side };
        });
        // candidate in the free band BELOW all text (right-aligned)
        let lowestY = base.top;
        texts.forEach(t => { if (t.y + t.h > lowestY) lowestY = t.y + t.h; });
        const gapH = base.bottom - lowestY - 6;
        if (gapH >= 34) {
          const side = Math.floor(Math.min(gapH, MAXSIDE));
          if (side >= 30 && (!best || side >= best.s)) {
            best = { x: Math.round(base.right - side - 2), y: Math.round(base.bottom - side - 8), s: side };
          }
        }
        if (!best) return;
        const cand = { x: best.x, y: best.y, w: best.s, h: best.s };
        if (texts.some(t => cand.x < t.x + t.w && t.x < cand.x + cand.w &&
                            cand.y < t.y + t.h && t.y < cand.y + cand.h)) return;
        const el = D.createElement("div");
        el.className = "sticker-slot";
        el.style.cssText = "position:absolute;left:" + (cand.x - base.left) + "px;top:" +
          (cand.y - base.top) + "px;width:" + cand.s + "px;height:" + cand.s + "px;";
        pc.appendChild(el);
      };
      // real sheet numbers after any auto-inserted page (cover = page 1)
      const renumberSheets = () => {
        const sheets = Array.from(win.document.querySelectorAll(".print-sheet"));
        sheets.forEach((sh, i) => {
          const n = sh.querySelector(".page-num");
          if (n) n.textContent = String(i + 1);
        });
      };
      const kickoff = () => {
        const W = win;
        // wait for web fonts so the measured text lines match what prints
        const fontsReady = (W.document.fonts && W.document.fonts.ready)
          ? W.document.fonts.ready : Promise.resolve();
        Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))])
          .then(() => fitAllSheets())                 // safety net BEFORE baking:
          .then(() => decoratePrintSheets())         // slots re-measured on the FINAL layout
          .then(count => {
            doPrint();
            showToast("🖨️ Booklet ready — " + bookPages.length + " pages, stickers on " +
              count + " random page" + (count === 1 ? "" : "s") +
              "! Choose \"Save as PDF\" to download it ✨");
          })
          .catch((e) => {
            window.__printErr = String(e && e.stack || e);
            doPrint();
            showToast("🖨️ Booklet ready — " + bookPages.length + " pages! Choose \"Save as PDF\" to download it ✨");
          });
      };
      if (win.document.readyState === "complete") kickoff();
      else win.addEventListener("load", kickoff);
    };
    };   // end startPrint()

    // Rebuild from storage FIRST (awaited), then open the print window. The
    // rebuild is awaited so the PDF always carries the LATEST saved entries,
    // flowed with the final font metrics — and every page shows properly in
    // the preview AND the booklet, including the very first entry.
    (async () => {
      try { bookPages = await buildBookPages(); }
      catch (e) { /* keep the currently rendered pages */ }
      startPrint();
    })();
  }

  function fillLeaf(frontHTML, backHTML, frontNum, backNum) {
    const fp = $("#leafFront");
    const bp = $("#leafBack");
    /* WRITING APPEARS ON THE FRONT SIDE ONLY. The diary is a PORTRAIT pad
       bound at the TOP edge — when a sheet is lifted it rotates UPWARD and
       its BACK side faces the reader mid-flight. Real flip-books print on
       one side of each sheet only, so the back of every leaf is deliberately
       kept completely EMPTY (plain paper): no page content, no header, no
       footer and no page number are ever painted onto the back face
       (mirrored text / reversed numbers can not appear even for a single
       frame). backHTML/backNum stay in the signature for compatibility but
       are intentionally never rendered. */
    fp.querySelector(".page-content").innerHTML = frontHTML;
    bp.innerHTML = "";   // back face = guaranteed blank paper
    addStickersToPage(fp.querySelector(".page-content"), "LF" + frontNum);
    fp.querySelector(".page-num").textContent = frontNum;
  }

  function flipPage(dir) {
    if (flipping) return;

    // ---- SINGLE-PAGE MODE (every screen size): ONE PAGE PER SCREEN ----
    // Every numbered page (1, 2, 3 … to the end) is its own full-width sheet.
    // Turning a page plays the PORTRAIT UPWARD FLIP: the current sheet lifts
    // from its bottom edge and rotates UPWARD over the top hinge (rotateX),
    // revealing the next page underneath. The back of the sheet is plain
    // blank paper — ALL data lives on the FRONT side only; there is no
    // two-page spread any more and no content ever appears on a back page.
    // NOTE: renderSpread() resets `flipping` and strips leaf classes, so the
    // flight state must be re-armed AFTER every mid-animation re-render.
    const totalPages = Math.max(1, bookPages.length);   // pages 1..N everywhere
    if (dir === "next" && spread >= totalPages - 1) return;
    if (dir === "prev" && spread <= 0) return;

    flipping = true;
    const cur = spread;                    // page currently on screen
    const nxt = dir === "next" ? spread + 1 : spread - 1;
    // Put the INCOMING page on the static sheet underneath first, so it is
    // revealed as the leaf flies upward (or lowered onto when going back).
    spread = nxt;
    renderSpread();                        // static sheet now shows page nxt
    spread = cur;                          // restore until the flight lands
    // Re-arm the flight state (renderSpread reset it) BEFORE painting the
    // leaf, so the pending timeout can never be cancelled mid-flight.
    flipping = true;
    // The leaf carries the page that is being turned away (front face only).
    fillLeaf(pageHTML(cur), "", String(cur + 1), "");
    // force a reflow so the animation always restarts cleanly
    void leafEl.offsetWidth;
    leafEl.classList.remove("single-flip-back", "single-flip-forward",
                            "flipping-forward", "flipping-back");
    leafEl.classList.add(dir === "next" ? "single-flip-forward"   // flipUpSingle (rotateX, top hinge)
                                        : "single-flip-back");     // flipDownSingle (rotateX, top hinge)

    setTimeout(() => {
      spread = nxt;
      renderSpread();                      // lands on the new page & clears the leaf
      flipping = true;                     // renderSpread reset it again — keep lock
      leafEl.classList.remove("single-flip-forward", "single-flip-back");
      flipping = false;
    }, 560);
  }

  // ---- One-time chrome injection for the STATIC on-screen book ----
  // index.html's four footer bands are plain markup (page number + stamp);
  // this rewrites each of them from FOOTER_INITIALS_HTML — the SAME string the
  // measuring host and the print window use — so the "H ❤ D" initials with
  // Honey's & Deep's signature images render identically in the screen book,
  // the flipping leaf, the paginator clone and the printed PDF booklet.
  function initBookChrome() {
    document.querySelectorAll('#bookModal .book-page-footer').forEach(f => {
      const num = f.querySelector('.page-num');
      const stamp = f.querySelector('.love-stamp');
      f.innerHTML = (num ? num.outerHTML : '') + FOOTER_INITIALS_HTML + (stamp ? stamp.outerHTML : '');
    });
    // 📂 Inject the ONE shared heading-band style into the live app document
    // too, so the on-screen preview book renders every heading EXACTLY like
    // the measuring host and the printed PDF booklet (same string everywhere).
    if (!document.getElementById('headingBandStyle')) {
      const st = document.createElement('style');
      st.id = 'headingBandStyle';
      st.textContent =
        HEADING_BAND_CSS.replace(/__SCOPE__/g, '#bookModal .entry-bubble .eb-heading-band') + '\n' +
        /* 🔢 entry-number pill — same shared string in preview as well */
        EB_NO_CSS.replace(/__SCOPE__/g, '#bookModal .entry-bubble .eb-no') + '\n' +
        /* dark theme keeps the SAME band shape — only colours adapt */
        '[data-theme="dark"] #bookModal .entry-bubble .eb-heading-band{' +
          'color:#e8c9a8!important;background:rgba(219,112,147,.16)!important}' + '\n' +
        '[data-theme="dark"] #bookModal .entry-bubble .eb-no{' +
          'color:#e8c9a8!important;background:rgba(232,201,168,.16)!important}';
      document.head.appendChild(st);
    }
  }
  initBookChrome();

  function openBook() {
    if (!currentUser) { openAuth("signin"); showToast("Please sign in to read your diary 🔒"); return; }
    bookPages = [];           // reset — rebuilt after the pages are measured
    spread = 0;
    $("#leftContent").innerHTML = "";
    $("#rightContent").innerHTML = "";
    $("#bookOwner").textContent = "Private diary of " + getUserName() + " (" + currentUser + ")";
    const abs = $("#appBarSub");
    if (abs) abs.textContent = "🥛 " + getUserName() + "'s Diary";
    // 📖 Refresh the book's own category/heading filter bar at the START of
    // the book. It keeps whatever was selected last time the book was open
    // in this session; when nothing is selected the book previews as regular.
    renderBookFilterBar();
    ensureBookAddControls();
    updateBookAddBtn();
    closeBookAddPane();
    bookModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    fitBookZoom();
    // Build pages AFTER the modal is visible so flowPages() can measure the
    // real A4 sheet size (line-wise pagination depends on these measurements).
    // Two rAF ticks: first lets the browser lay out the now-visible A4 sheet,
    // second runs the measurement + pagination against final dimensions.
    requestAnimationFrame(() => {
      fitBookZoom();
      requestAnimationFrame(async () => {
      bookPages = await buildBookPages();
      // 🔄 ALWAYS start at page 1 and rebuild strictly from the current code
      // + cloud data on every open — no reading position or book state is
      // ever saved locally, so a refresh always shows exactly what the code
      // produces. (The 📌 Save button still bookmarks to the cloud; it just
      // never auto-jumps on open.)
      spread = 0;
      renderSpread();
      });
    });
  }

  function closeBook() {
    bookAddOpen = false;
    const pane = $("#bookAddPane"); if (pane) pane.classList.add("hidden");
    bookModal.classList.add("hidden");
    document.body.style.overflow = "";
  }

  // (Breakpoint crossings are handled once by onPhoneMqChange above — it
  // re-renders the open book into phone/desktop mode automatically.)

  $("#bookViewLink").addEventListener("click", (e) => { e.preventDefault(); openBook(); });
  $("#bookClose").addEventListener("click", closeBook);
  // Phone app bars: back button closes, save/print mirror the desktop buttons
  const appBack = $("#appBackBtn"); if (appBack) appBack.addEventListener("click", closeBook);
  const appSave = $("#appSaveBtn"); if (appSave) appSave.addEventListener("click", saveBookPosition);
  const appPrint = $("#appPrintBtn"); if (appPrint) appPrint.addEventListener("click", printBooklet);
  const tabPrev = $("#tabPrev"); if (tabPrev) tabPrev.addEventListener("click", () => flipPage("prev"));
  const tabNext = $("#tabNext"); if (tabNext) tabNext.addEventListener("click", () => flipPage("next"));
  const tabSave = $("#tabSave"); if (tabSave) tabSave.addEventListener("click", saveBookPosition);
  const tabPrint = $("#tabPrint"); if (tabPrint) tabPrint.addEventListener("click", printBooklet);
  $("#nextPageBtn").addEventListener("click", () => flipPage("next"));
  $("#prevPageBtn").addEventListener("click", () => flipPage("prev"));
  const saveBtn = $("#saveBookBtn");
  if (saveBtn) saveBtn.addEventListener("click", saveBookPosition);
  const printBtn = $("#printBookletBtn");
  if (printBtn) printBtn.addEventListener("click", printBooklet);
  // Single-page mode: clicking/tapping the visible sheet turns to the NEXT
  // page (with the upward flip). The old spread halves never route anywhere.
  $("#pageRight").addEventListener("click", () => {});
  $("#pageLeft").addEventListener("click", () => { flipPage("next"); });
  // Tap anywhere on the sheet turns to the NEXT page (single-page flip-up
  // reader — every screen is one page, all data on the front side only).
  // Clicks only fire when the pointer stays put, and any click that follows
  // a swipe within 700 ms is ignored, so a swipe can never turn two pages.
  const phoneTap = document.querySelector("#bookModal .book-stage");
  if (phoneTap) phoneTap.addEventListener("click", (e) => {
    if (flipping) return;
    if (Date.now() - lastSwipeAt < 700) return;
    if (e.target.closest("button, a, input, select, textarea, #bookFilterBar")) return;
    flipPage("next");
  });
  bookModal.addEventListener("click", (e) => { if (e.target === bookModal) closeBook(); });
  document.addEventListener("keydown", (e) => {
    if (bookModal.classList.contains("hidden")) return;
    if (e.key === "ArrowRight") flipPage("next");
    if (e.key === "ArrowLeft") flipPage("prev");
    if (e.key === "Escape") closeBook();
  });

  // ---- PHONE: PORTRAIT UP/DOWN SWIPE on the single sheet + plain TAP to
  // advance (notes-style reader — every screen is ONE page, front side only,
  // no book/flip mechanics at all). Swipe UP = next page, swipe DOWN =
  // previous page; clear horizontal drags are ignored so they never turn a
  // page by accident. A swipe timestamp guards the synthetic click that
  // follows touchend, so one gesture never advances TWO pages. Registered
  // with passive:true so the browser never blocks scrolling while we observe.
  let lastSwipeAt = 0;
  (function attachBookSwipe() {
    const stage = document.querySelector("#bookModal .book-stage");
    if (!stage) return;
    let sx = 0, sy = 0, tracking = false;
    const SWIPE_MIN_Y = 60;                 // vertical distance to count as a swipe
    stage.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      tracking = true;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (!tracking || !isPhoneBook()) { tracking = false; return; }
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      // must be a clear VERTICAL drag, not a tap and not a horizontal scroll
      if (Math.abs(dy) < SWIPE_MIN_Y || Math.abs(dy) < Math.abs(dx) * 1.2) return;
      // mark the swipe so the follow-up click never turns an extra page
      lastSwipeAt = Date.now();
      flipPage(dy < 0 ? "next" : "prev");   // portrait: up = forward, down = back
    }, { passive: true });
    stage.addEventListener("touchmove", (e) => {
      // once the finger clearly goes horizontal, stop treating it as a swipe
      if (tracking && e.touches.length === 1 &&
          Math.abs(e.touches[0].clientX - sx) > Math.abs(e.touches[0].clientY - sy) * 1.5) {
        tracking = false;
      }
    }, { passive: true });
  })();

  // ---------- Import from template (sender = name written in the line) ----------
  const DEEP_NAME = "Deep";
  const CHOTA_NAME = "🫰🫶🏻Chota Don❣️❤️😘"; // exact sender name for her messages

  // ---------- Message text helpers ----------

  // Auto-detect the best heading for a message by counting keyword hits in
  // its text (message + felt lines). Falls back to the sender-based default.
  function detectHeading(text, sender) {
    const t = String(text || "").toLowerCase();
    let best = null, bestScore = 0;
    DIARY_HEADINGS.forEach((h) => {
      if (!h.keywords.length) return;
      let score = 0;
      h.keywords.forEach((k) => { if (t.indexOf(k) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = h; }
    });
    if (best && bestScore > 0) return best.label;
    // No keyword matched → sensible default from who sent the message.
    if (sender && sender !== DEEP_NAME) return "💌 Her Messages To Me";
    return "💬 Daily Life & Important Updates";
  }

  // A saved entry's body is built as:   Sender: "message"  (+ optional
  // "What I felt:" / "Note:" lines). In the book we show ONLY the message and
  // everything related to it — the duplicated "Sender:" prefix is dropped,
  // because the bubble header already says who the message is from. The felt
  // part and note stay attached to their own message (same place, same page).
  //
  // ROBUST SENDER MATCHING: emoji sender names ("🫰🫶🏻Chota Don❣️❤️😘")
  // break naive regex prefix matching in THREE ways:
  //   • VS16 (︎/️) spelling drift between the column value and the body text
  //     ("❤" vs "❤️") makes an exact match FAIL → the "Sender:" prefix and
  //     its wrapping quotes stayed inside the rendered message — exactly the
  //     broken first entry (`💬 #1🫰🫶🏻Chota Don❣️❤️😘…` mashed together);
  //   • astral surrogate pairs + variation selectors make raw string
  //     comparisons fragile;
  //   • NFC/NFD Unicode normalisation differences do the same.
  // So matching is done on NORMALISED strings (case-folded, VS15/VS16
  // stripped, NFC) with a length-preserving index map back to the original
  // text, plus a generic "Name:" fallback for legacy spellings. When no
  // prefix matches at all, the leading quote pair is still removed so an
  // entry NEVER renders as raw `"msg"` code-dump.
  const normSender = (s) => String(s == null ? "" : s)
    .normalize("NFC")
    .replace(/[\uFE0E\uFE0F]/g, "")   // drop VS15/VS16 spelling variants
    .toLowerCase()
    .trim();
  function stripSenderPrefix(body, sender) {
    let t = String(body || "");
    // 1) Normalised sender prefix:  "🫰🫶🏻Chota Don❣️❤️😘: …" — matched on
    //    VS16/case-folded strings but CUT at the real colon position of the
    //    ORIGINAL text (norm strips characters, so indices are recomputed by
    //    locating the first ':' after the name region). Legacy rows may also
    //    wrap the NAME in quotes ("Name": "msg") — the leading quote pair is
    //    dropped first so this step can recognise the prefix; leaving it in
    //    used to duplicate the sender and leak &quot; raw code into the very
    //    first imported entry of every page.
    const ns = normSender(sender);
    if (ns) {
      let head = t.replace(/^[\s\uFEFF]+/, "").replace(/^["\u201c][\s]*/, "");
      const nh = normSender(head.slice(0, ns.length + 8));
      if (nh.startsWith(ns)) {
        const cut = head.search(/^[^\r\n:]{1,80}?\s*:/);
        if (cut !== -1) {
          const colon = head.slice(0, 120).indexOf(":");
          if (colon !== -1) t = head.slice(colon + 1).replace(/^\s+/, "");
        }
      } else {
        t = head; // keep the un-wrapped start for the later quote handling
      }
    }
    // 2) Generic known-name prefix (legacy rows may store a different
    //    spelling than the column carries):  AnyKnownName: rest
    const startsWithSender = ns && normSender(t.slice(0, ns.length + 8)).startsWith(ns);
    if (!startsWithSender) {
      const gm = t.match(/^\s*([^\r\n":<>]{1,60}?)\s*:\s/);
      if (gm) {
        const cand = normSender(gm[1]);
        if (cand === normSender(DEEP_NAME) || cand === normSender(CHOTA_NAME) ||
            (ns && cand === ns)) {
          t = t.slice(gm[0].length);
        }
      }
    }
    // Drop ONE wrapping pair of quotes around the message. The canonical
    // stored shape is  Name: "msg"  (the message may span several lines and
    // felt/note lines follow), so this MUST succeed for every clean entry —
    // when it silently fails, the leading `"` survives into the rendered
    // body and the whole bubble shows up as raw code-like text instead of a
    // formatted preview. Accepted shapes:
    //   1) one-line message:      "msg"            (rest may follow on later lines)
    //   2) multi-line message:    "line1\nline2"   (closing quote ends its own line)
    //   3) unterminated legacy:   "msg             (no closing quote at all)
    // Legacy rows can still wear ENTITY quotes ("&quot;msg&quot;" or even the
    // double-escaped "&amp;quot;") — decode those wrappers first so every
    // shape below recognises them and no `&quot;` can leak as visible code.
    for (let e = 0; e < 4; e++) {
      const be = t;
      t = t.replace(/^(&(?:amp|quot|#0?39);)+/i, '"')
           .replace(/(&(?:amp|quot|#0?39);)+(?=\r?\n|$)/gi, '"');
      if (t === be) break;
    }
    let qm = t.match(/^[\s\uFEFF]*["\u201c]([^\r\n]*)["\u201d][ \t]*(?=\r?\n|$)/);
    if (!qm) qm = t.match(/^[\s\uFEFF]*["\u201c]([^\r\n]*)["\u201d](?=\s*💭|\s*(?:How|What)\s+[Ii]\s+felt|$)/);
    if (qm) { t = qm[1] + t.slice(qm[0].length); }
    else {
      // Multi-line quoted message: opening quote on the first line, closing
      // quote at the END of a later line (before any What-I-felt / Note line).
      const ml = t.match(/^[\s\uFEFF]*["\u201c]([\s\S]*?)["\u201d][ \t]*(?=\r?\n(?:What I felt|Note):|\r?\n$|$)/i);
      if (ml && !/^\s*(?:💭[ \t]*)?(?:What I felt|Note)\s*:/i.test(ml[1])) {
        t = ml[1] + t.slice(ml[0].length);
      } else {
        // Unterminated wrapper (legacy rows saved without the closing quote):
        // strip the lone opening quote AND a lone trailing quote so neither
        // can ever leak into the preview as raw code.
        const un = t.match(/^[\s\uFEFF]*["\u201c]([\s\S]*)$/);
        if (un) t = un[1];
      }
    }
    // Any lone wrapping quote that survived (e.g. a closing &quot;-quote glued
    // to the 💭 label by a legacy save) must never show at the ends of the
    // preview text — peel plain AND entity quotes from both ends.
    t = t.replace(/^(?:\s|\uFEFF|["\u201c]|&(?:amp|quot|#0?39);)+/i, "")
         .replace(/(?:["\u201d]|&(?:amp|quot|#0?39);)+\s*$/i, "");
    return t.replace(/^\r?\n/, "");
  }

  // Pretty HTML for the inside of a message bubble: the plain message first,
  // then its related extras with soft labels ("How I felt", "Note").
  // ---- COMPACT ENTRY TRIMMER (preview + PDF get the SAME trimmed text) ----
  // One entry is kept COMPACT in the booklet: leading/trailing blank lines and
  // stray dashes are dropped, consecutive blanks collapse to a single spacer,
  // over-long messages fold into a proper preview that ENDS ON A WORD BOUNDARY
  // with an ellipsis (…) — never mid-word, never hanging past the page edge.
  // The full text always stays untouched in Supabase; only the rendered
  // preview is compacted. Entries that fit comfortably render whole.
  const BOOK_PREVIEW_MAX_CHARS = 620;   // ~14 ruled rows — one tidy diary block
  const BOOK_PREVIEW_MAX_LINES  = 14;   // hard line cap per bubble body

  function trimEntryLines(text) {
    const out = [];
    String(text || "").split(/\r?\n/).forEach((ln) => {
      const t = ln.replace(/^\s*[-–—]+\s*$/, "").trim();   // bare "---" separators vanish
      if (!t) { if (out.length && out[out.length - 1] !== "") out.push(""); return; }
      out.push(t.replace(/[ \t]+/g, " "));                 // inner double spaces collapse
    });
    while (out.length && !out[out.length - 1]) out.pop();  // trailing blanks trimmed
    while (out.length && !out[0]) out.shift();             // leading blanks trimmed
    return out;
  }

  // Fold an over-long preview so it breaks on a WHOLE-WORD boundary and ends
  // with "…". Both the character budget AND the hard line cap are enforced,
  // so no entry can ever render as a wall of text in the booklet preview.
  function compactPreview(lines) {
    if (!lines.length) return lines;
    let out = lines;
    // 1) hard line cap first — a long entry must never exceed MAX_LINES rows
    if (out.length > BOOK_PREVIEW_MAX_LINES) {
      out = trimEntryLines(out.slice(0, BOOK_PREVIEW_MAX_LINES).join("\n") + "\n…");
    }
    // 2) character budget — fold on a whole-word boundary, end with "…"
    const joined = out.join("\n");
    if (joined.length <= BOOK_PREVIEW_MAX_CHARS && out.length <= BOOK_PREVIEW_MAX_LINES) {
      return out;                                          // already compact — show whole
    }
    const cutAt = joined.lastIndexOf(" ", BOOK_PREVIEW_MAX_CHARS - 1);
    const keep = (cutAt > 40 ? joined.slice(0, cutAt) : joined.slice(0, BOOK_PREVIEW_MAX_CHARS - 1))
      .replace(/[,.;:!?'"\u201c\u201d\u2018\u2019\s]+$/, "");  // tidy the cut edge
    return trimEntryLines(keep + "\n…");
  }

  // ---------- Canonical stored-body shape (SINGLE SOURCE OF TRUTH) ----------
  // An entry's body is ALWAYS stored as plain text in one canonical shape:
  //   Sender: "message"
  //   What I felt: <felt text>          (optional)
  //   Note: <note text>                 (optional)
  // Imported rows already arrive in this shape from doImport(). Entries saved
  // BEFORE the importer existed can still hold legacy decoration baked into
  // the body text: the 📂 heading-band markup (<div class='eb-heading-band'>),
  // wrapped &quot;/&amp;/&#39; entities, or a labelled 💭 "How I felt:" span.
  // Legacy markup leaked into the preview as raw code because the old parser
  // only understood the clean shape. Now EVERY render path (entry cards,
  // booklet bubbles, PDF) runs the stored body through normaliseStoredBody()
  // FIRST, which converts any legacy variant back to the canonical plain-text
  // shape — so the very first imported entry renders exactly like every other
  // entry: real formatted preview, never HTML code.
  function decodeHtmlEntitiesLite(s) {
    return String(s || "")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  // ---------- UNIVERSAL MARKUP SCRUBBER (raw-HTML leak killer) ----------
  // Some OLD cloud rows carry their body fully HTML-ESCAPED (&lt;div class=
  // 'eb-heading-band'&gt;…, &amp;quot;) or double-encoded. The targeted legacy
  // regexes below only recognise PLAIN markup, so such rows slipped through
  // and still showed raw HTML code on cards and booklet pages — not just the
  // first entry, but any entry saved by those old paths. decodeAllEntities()
  // understands every named/numeric entity, and stripAllMarkup() alternates
  // "strip tags" with "decode entities" until the text is a FIXED POINT — so
  // no matter how many times a body was escaped, only clean plain TEXT can
  // ever reach a preview. Legitimate typed characters are never damaged:
  // decoding only happens when it actually removes an ampersand sequence.
  function decodeAllEntities(s) {
    return String(s || "")
      .replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch (e) { return _m; } })
      .replace(/&#(\d+);/g, (_m, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch (e) { return _m; } })
      .replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&nbsp;/gi, " ")
      .replace(/&ldquo;/gi, "\u201c").replace(/&rdquo;/gi, "\u201d")
      .replace(/&lsquo;/gi, "\u2018").replace(/&rsquo;/gi, "\u2019")
      .replace(/&mdash;/gi, "\u2014").replace(/&ndash;/gi, "\u2013")
      .replace(/&hellip;/gi, "\u2026").replace(/&middot;/gi, "\u00b7")
      .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&amp;/gi, "&");
  }
  function stripAllMarkup(text) {
    let t = String(text == null ? "" : text).replace(/\r\n?/g, "\n");
    for (let pass = 0; pass < 6; pass++) {
      const before = t;
      t = t
        .replace(/<\s*(?:script|style)\b[^>]*>[\s\S]*?<\s*\/\s*(?:script|style)\s*>/gi, " ")
        .replace(/<\s*br\s*\/?>\s*/gi, "\n")
        .replace(/<\s*\/(?:div|p|li|ul|ol|blockquote|h[1-6])\s*>/gi, "\n")
        .replace(/<[^>]*>/g, "");
      // Decode entity sequences whenever decoding can ONLY remove characters
      // (every named/numeric entity is longer than the character it stands
      // for). A plain "&" typed by the user ("R&D", "me & you") is NOT an
      // entity sequence and is never touched — legitimate text stays intact.
      if (/&(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,7}|#x[0-9a-fA-F]{1,6});/.test(t)) {
        t = decodeAllEntities(t);
      }
      if (t === before) break;                 // fixed point reached
    }
    return t;
  }

  // ---------- FINAL RENDER SCRUB (last line of defence) ----------
  // escapeHtml() turns every "<" into "&lt;", so ANY markup that ever reaches
  // a renderer is displayed as literal HTML CODE ("&lt;div class='eb-heading-
  // band'&gt;…", "&quot;…&quot;", "<span class="eb-extra">…") — exactly the
  // raw-code entries still visible on some pages. No targeted regex can keep
  // up with every old save-path variant (plain markup, single-escaped,
  // double-escaped), so EVERY render path now funnels its text through
  // finalScrub(): strip tags → decode entities, alternating to a fixed point,
  // then peel stray wrapping quotes. After this call the string provably
  // contains NO tag and NO entity sequence — only plain text can be rendered.
  const ENTITY_TRACE_RE = /&(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,7}|#x[0-9a-fA-F]{1,6});/;
  const TAG_TRACE_RE    = /<[a-zA-Z/!/][^>]*>?|</;
  function finalScrub(text) {
    let t = String(text == null ? "" : text);
    for (let pass = 0; pass < 8; pass++) {
      const before = t;
      if (TAG_TRACE_RE.test(t) || ENTITY_TRACE_RE.test(t)) t = stripAllMarkup(t);
      // A lone leftover ampersand-entity fragment (e.g. "&amp" cut mid-word)
      // must never display as code either.
      t = t.replace(/&(?:amp|quot|#0?39){1,5}(?![a-zA-Z0-9;])/g, "");
      if (t === before) break;
    }
    // Wrapping quote pairs left by legacy saves made clean text look like a
    // code dump ("btw teh aa msg karyo…" with stray quotes glued around it).
    // Peel PLAIN and ENTITY quote forms (&quot;, &#39;, &amp;quot;…) from the
    // very start/end of the whole text AND of every single line — a closing
    // &quot;-quote glued to a 💭 label mid-text used to survive as visible
    // raw code on the first imported entry of each page.
    // Decode ANY leftover entity sequence first (&quot; → ", &amp; → &) so no
    // entity can ever display as code, then peel only QUOTE CHARACTERS from
    // the outer ends. Quotes inside the message ("Today you said \"I trust
    // you\"") are legitimate content and are preserved.
    for (let w = 0; w < 4; w++) {
      const bw = t;
      if (ENTITY_TRACE_RE.test(t)) t = decodeAllEntities(t);
      t = t.replace(/^[\s\uFEFF]*["\u201c]+/, "").replace(/["\u201d]+[\s]*$/, "");
      if (t === bw) break;
    }
    return t.trim();
  }

  function normaliseStoredBody(body, sender) {
    // IDEMPOTENCY GUARD: loadEntriesFromCloud() already stores the CLEAN
    // canonical shape back into entriesCache. Every render path calls this
    // function AGAIN on that already-clean text (card previews call it a
    // third time). The canonical form wraps the message in plain double
    // quotes — re-running the old-quote decoder on it used to rewrite those
    // legitimate quotes into HTML entities (&quot;) and then escape them a
    // second time, so exactly ONE entry per page (the first one, whose body
    // still carried quote characters) rendered as raw code like
    // `&quot;btw teh aa msg karyo…&quot;<span class="eb-extra">…`. If the
    // text is ALREADY in canonical shape (starts with  Sender: "…"  and has
    // NO trace of markup or entities anywhere), return it untouched.
    const probe = String(body == null ? "" : body);
    // Canonical shape is:  Sender: "message"  optionally followed by
    //   What I felt: … / Note: … lines. The message itself may span MULTIPLE
    //   lines (multi-line WhatsApp messages are stored verbatim), so the
    //   guard must accept a body whose FIRST line opens with a quote and any
    //   later line closes it — never a single-line-only regex (that used to
    //   reject every multi-line entry, sending it back through the whole
    //   legacy pipeline where its legitimate quotes got rewritten into
    //   &quot; entities and re-escaped — the raw-code first entry).
    const canonicalRe = /^\s*(?:[^:\r\n"<]|[\uD800-\uDBFF][\uDC00-\uDFFF]){1,80}?\s*:\s*["\u201c][\s\S]*["\u201d]?\s*$(?:\r?\n(?:What I felt|Note):[\s\S]*)?$/i;
    // The guard checks for ANY leftover tag fragment or ANY entity-looking
    // sequence (not just the seven legacy ones) — fully HTML-ESCAPED old rows
    // (&lt;div class=…&gt;, &amp;quot;) used to slip past the narrow check
    // and stay permanently broken as raw code on every page.
    if (canonicalRe.test(probe) && !/<[a-z\/]|<\s/i.test(probe) && !/&(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,7}|#x[0-9a-fA-F]{1,6});/.test(probe)) {
      return probe;
    }
    // UNIVERSAL SCRUB FIRST: flatten every tag and decode every entity (any
    // encoding depth) BEFORE the targeted legacy handling below. This is what
    // finally kills the remaining raw-HTML entries: rows saved fully escaped
    // by an old path are recognised here instead of falling through the
    // plain-markup-only regexes untouched.
    let t = stripAllMarkup(probe);
    // 0) Detect the REAL sender from the leading "Name:" prefix when the
    //    caller's value does not match (legacy rows can store a different
    //    sender spelling than the column carries). The name may itself be
    //    wrapped in quotes by old saves — "🫰🫶🏻Chota Don❣️❤️😘": "msg" —
    //    so quote characters are allowed inside the capture and stripped
    //    afterwards. When the quoted-name form was NOT matched, the sender
    //    stayed unset and step 6 re-emitted `Sender: "Sender: \"msg\""` — the
    //    duplicated sender + leftover raw-code look of the first imported
    //    entry on every page.
    const pm = t.match(/^\s*["\u201c]?([^:\r\n""]{1,60}?)["\u201d]?\s*:\s/);
    if (pm && (!sender || pm[1].trim() !== String(sender).trim())) {
      const cand = pm[1].replace(/["\u201c\u201d]/g, "").trim();
      if (normSender(cand) === normSender(DEEP_NAME) || normSender(cand) === normSender(CHOTA_NAME)) {
        sender = cand;
      }
    }
    // 1) Legacy heading band: <div class='eb-heading-band'>…</div> baked into
    //    the body by old saves → remove the WHOLE element including its text
    //    (the heading lives in its own column now and is re-emitted as a
    //    styled band, so keeping the band's words inside the message would
    //    duplicate them). stripAllMarkup above already turned any ESCAPED
    //    variant into real tags, so this regex catches every encoding depth.
    t = t.replace(/\s*<div\b[^>]*eb-heading-band[^>]*>[\s\S]*?<\/div>\s*/gi, "\n");
    // 2) A legacy eb-extra span becomes its OWN line and its inner label
    //    ("💭 How I felt: " / "📝 Note: ") is followed by a newline, so the
    //    felt/note text always starts at a line beginning — exactly where the
    //    canonical parser below expects its markers. The whole element is
    //    consumed here (label + value together); leaving the closing </span>
    //    for the generic flatten below used to glue the 💭 label onto the end
    //    of the message line, where no parser could recognise it — the leak
    //    that kept rendering entries as raw `…"💭 How I felt: …` code-dumps.
    t = t.replace(/<span\b[^>]*eb-extra[^>]*>\s*<span\b[^>]*eb-label[^>]*>([\s\S]*?)<\/span>/gi,
      function (_all, label) { return "\n" + label.trim() + " "; });
    t = t.replace(/<span\b[^>]*eb-extra[^>]*>([\s\S]*?)<\/span>/gi, "\n$1 ");
    t = t.replace(/<\/?span\b[^>]*eb-extra[^>]*>/gi, "");
    // 3) Any OTHER leftover element is flattened to its TEXT (tags gone,
    //    words kept) — belt & braces after stripAllMarkup.
    t = t.replace(/<[^>]*>/g, "");
    // 4) Legacy 📂-marked line standing on its own → drop it (same reason as 1).
    t = t.replace(/^[ \t]*📂[^\r\n]*\r?\n/gm, "");
    // 5) Legacy inline felt label ("💭 How I felt: …" / "How I felt: …") →
    //    rename to the canonical "What I felt:" marker so the shared parser
    //    below recognises it.
    t = t.replace(/(^[ \t]*)(?:💭[ \t]*)?How\s+I\s+felt\s*:[ \t]*/gim, "$1What I felt: ");
    // 6) Rebuild strictly in the canonical shape by pulling the sender prefix
    //    and the embedded felt/note lines out of whatever remains.
    let msg = stripSenderPrefix(t, sender);
    // The message may still wear a SECOND wrapping quote pair left behind by
    // legacy saves that quoted both the name AND the message
    // ("Name": "msg"). Peel every wrapper until the text stops starting with
    // a quote — nothing code-like must ever reach the preview.
    for (let w = 0; w < 3; w++) {
      const bw = msg;
      msg = msg.replace(/^[\s\uFEFF]*["\u201c]/, "").replace(/["\u201d][\s]*$/, "");
      if (msg === bw) break;
    }
    msg = msg.replace(/^[ \t]*\r?\n/, "").replace(/\s+$/, "");
    let embFelt = "", embNote = "";
    msg = msg
      .replace(/(^|\r?\n)[ \t]*(?:💭[ \t]*)?[Ww]hat\s+[Ii]\s+felt\s*:[ \t]*([\s\S]*?)(?=\r?\n[ \t]*(?:💭[ \t]*)?[Ww]hat\s+[Ii]\s+felt\s*:|\r?\n[ \t]*(?:📝[ \t]*)?[Nn]ote\s*:|$)/g,
        function (_all, pre, val) { embFelt += (embFelt ? "\n" : "") + val.trim(); return pre || ""; })
      .replace(/(^|\r?\n)[ \t]*(?:📝[ \t]*)?[Nn]ote\s*:[ \t]*([\s\S]*?)(?=\r?\n[ \t]*(?:💭[ \t]*)?[Ww]hat\s+[Ii]\s+felt\s*:|\r?\n[ \t]*(?:📝[ \t]*)?[Nn]ote\s*:|$)/g,
        function (_all, pre, val) { embNote += (embNote ? "\n" : "") + val.trim(); return pre || ""; });
    msg = msg.replace(/^[ \t]*\r?\n/, "").replace(/\s+$/, "");
    // A stray wrapping quote pair may survive on the message after the felt /
    // note lines were cut away ("msg\"" ) — close it off cleanly.
    msg = msg.replace(/[ \t]*["\u201d\u2019][ \t]*$/, "").replace(/^[ \t]*["\u201c\u2018]/, "");
    const who = sender || DEEP_NAME;
    let out = who + ': "' + msg + '"';
    if (embFelt) out += "\nWhat I felt: " + embFelt;
    if (embNote) out += "\nNote: " + embNote;
    return out;
  }

  // Pretty HTML for the inside of a message bubble: the plain message first,
  // then its related extras with soft labels ("How I felt", "Note"). Every
  // part is TRIMMED and COMPACTED through trimEntryLines()/compactPreview()
  // before rendering, so the booklet preview shows a tidy block that always
  // ends on a word boundary — never ragged, never hanging past the page edge.
  function formatBookBodyHtml(rawBody, sender) {
    // IMPORT-FIX: imported entries store their extras in the RAW body text
    // ("Sender: \"msg\"\nWhat I felt: ...\nNote: ..."). Normal sent entries
    // keep them in separate fields, and LEGACY rows may even carry baked-in
    // markup ("<div class='eb-heading-band'>…</div>", &quot; entities,
    // "How I felt:" spans). normaliseStoredBody() folds ALL of those variants
    // back into the ONE canonical plain-text shape first, so nothing ever
    // leaks into the bubble as raw HTML code — the first imported entry looks
    // byte-identical to a hand-written one.
    let msg = stripSenderPrefix(normaliseStoredBody(rawBody, sender), sender);
    // LAST LINE OF DEFENCE (the "entries show raw HTML code" bug): whatever
    // survived normalisation — leftover &quot; entities, an eb-extra span, a
    // heading-band div or ANY other markup baked into OLD cloud rows in any
    // encoding depth — is flattened to PLAIN TEXT here by the universal
    // scrubber before parsing. The parser below re-adds its own properly-
    // escaped markup, so a bubble can NEVER contain raw HTML code, on any
    // page, for any entry.
    // An eb-extra span glued directly onto the message ("…yar 🥹💭 How I
    // felt: …") must break onto its OWN line — that is exactly where the
    // felt/note parser below finds its markers. Without this the label was
    // treated as part of the message and rendered verbatim (raw-code look).
    msg = String(msg || "")
      .replace(/<span\b[^>]*eb-extra[^>]*>/gi, "\n")
      .replace(/<\/span>/gi, "")
      .replace(/<span\b[^>]*eb-label[^>]*>/gi, "");
    msg = stripAllMarkup(msg);
    // A stray wrapping quote pair must never survive into the rendered text
    // (it made the message look like a code dump: `"btw teh aa msg karyo…"`).
    msg = msg.replace(/^\s*["\u201c]/, "").replace(/["\u201d]\s*$/, "");
    const parts = msg.split(/\r?\n/);
    let felt = [], note = [], main = [];
    let mode = "main";
    for (const ln of parts) {
      if (/^what\s+i\s+felt\s*:/i.test(ln)) { mode = "felt"; const r = ln.replace(/^what\s+i\s+felt\s*:\s*/i, ""); if (r) felt.push(r); continue; }
      if (/^note\s*:/i.test(ln))            { mode = "note"; const r = ln.replace(/^note\s*:\s*/i, "");     if (r) note.push(r); continue; }
      (mode === "felt" ? felt : mode === "note" ? note : main).push(ln);
    }
    while (main.length && !main[main.length - 1].trim()) main.pop();
    // COMPACT TRIM: blank/dash noise gone from the message AND its extras
    main = trimEntryLines(main.join("\n"));
    felt = trimEntryLines(felt.join("\n"));
    note = trimEntryLines(note.join("\n"));
    // Fold an over-long message into a proper word-boundary preview (…)
    main = compactPreview(main);
    // RAW-HTML LEAK KILLER (content side): every TEXT unit that goes into
    // the bubble passes through finalScrub() BEFORE escaping — leftover
    // entities, tag fragments or wrapping quotes baked into old cloud rows
    // can no longer survive into the page as visible HTML code on ANY entry.
    // The renderer's OWN presentation markup (eb-extra / eb-label spans) is
    // added after scrubbing and is never re-scrubbed downstream; lines are
    // joined with <br> (not "\n") so a split/paginated piece keeps whole,
    // well-formed tags per source line — the markup can never be torn apart
    // and leak onto the page as raw code.
    let html = main.map(l => escapeHtml(finalScrub(l))).join("<br>");
    // Every tag of an extra block sits on its OWN source line: the opening
    // spans end a line, the content lines follow, and the closing </span>s
    // form a line of their own. splitSourceLines() in the paginator can then
    // never tear a tag apart when a long entry is split across pages — each
    // piece carries whole, balanced-enough markup, so no raw HTML source can
    // leak onto the next page (previously the glued "</span></span>" could
    // land mid-split and render as visible code on the FIRST entry of a page).
    if (felt.length) html += "<span class=\"eb-extra\">\n<span class=\"eb-label\">💭 How I felt: </span>\n" +
      felt.map(l => escapeHtml(finalScrub(l))).join("<br>") + "\n</span>\n";
    if (note.length) html += "<span class=\"eb-extra\">\n<span class=\"eb-label\">📝 Note: </span>\n" +
      note.map(l => escapeHtml(finalScrub(l))).join("<br>") + "\n</span>\n";
    return html;
  }

  // Parse the date/time written inside "Message: [ ... ]" — every format the
  // template and pasted sheets ever use. Returns an ISO string or null.
  //   • classic numeric  [12-01-2026 08:15] / [12/01/2026 08:15] (DD-MM-YYYY)
  //   • MONTH NAMES     [12 January 2026, 08:15 AM]  ← the numbered template
  //   • English date + time with AM/PM anywhere in the string
  // Without month-name support EVERY template entry failed to parse, so all
  // rows fell back to "previous + 1 minute" starting from import time — the
  // reason the FIRST entry of each day/page showed a wrong (today's) date and
  // looked different from the rest. Now #1 carries its real sheet date.
  function parseTemplateDate(s) {
    const str = String(s || "").trim();
    if (!str) return null;
    // Classic numeric DD-MM-YYYY [HH:MM]
    let m = str.match(/(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})(?:[, ]+(\d{1,2}):(\d{2}))?/);
    if (m) {
      const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
                         m[4] ? Number(m[4]) : 9, m[5] ? Number(m[5]) : 0);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    // Month names: "12 January 2026, 08:15 AM" / "January 12, 2026 8:15 AM"
    const MON = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
    m = str.match(new RegExp("(\\d{1,2})\\s+(" + MON + ")\\s+(\\d{4})|(" + MON + ")\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})", "i"));
    let day = 0, mon = -1, year = 0;
    if (m) {
      const names = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      const mi = (m[2] || m[5] || "").slice(0, 3).toLowerCase();
      mon = names.indexOf(mi);
      day = Number(m[1] || m[6]);
      year = Number(m[3] || m[7]);
    }
    // Time with AM/PM (or plain HH:MM) found anywhere in the same string
    let hh = 9, mmn = 0;
    const tm = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm]\.?)/) ||
               str.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
    if (tm) {
      hh = Number(tm[1]) % 12;
      const ap = (tm[3] || "").toLowerCase();
      if (ap.startsWith("p")) hh += 12;
      mmn = Number(tm[2]);
    }
    if (mon >= 0 && day && year) {
      const d = new Date(year, mon, day, hh, mmn);
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    // Last resort: native parsing of anything else ("2026-01-12 08:15", …)
    if (day || mon >= 0) {
      const d = new Date(str.replace(/\s*[AaPp][Mm]\.?/, ""));
      if (!isNaN(d.getTime())) return d.toISOString();
    }
    return null;
  }

  function parseImportText(text) {
    const lines = text.split(/\r?\n/);
    const msgs = [];
    let cur = null;
    let currentHeading = "";     // last "#### [EMOJI] HEADING" seen in the paste
    let dayDateStr = "";         // last "### Date: ..." seen — groups a whole day
    let summary = null;          // 📌 FINAL SUMMARY block of the COMPLETE DIARY
    // Entry counter: 1, 2, 3 … for every "Message: [date] …" line till the end
    // of the paste. The "What I felt:" / "Note:" lines belong to the message
    // above them and never get a number of their own — so the count always
    // matches the sheet's own numbering. It is used for counting only (entry
    // numbers are NOT stored in the diary or in Supabase).
    let entryCount = 0;
    // Matches: [12-01-2026 08:15] Deep: "message"   /   Chota Don: message (no brackets ok)
    const msgRe = /^(?:\[([^\]]+)\]\s*)?(Deep|(?:\S*\s*)?Chota\s*Don\S*)\s*:\s*(.*)$/i;
    const feelRe = /^(What I felt\s*:)\s*(.*)$/i;
    const noteRe = /^Note\s*:\s*(.*)$/i;
    const headRe = /^#{2,4}\s*(.+)$/;        // "#### 💖 Sweet Compliments & Love"
    const dateRe = /^#{2,4}\s*Date\s*:\s*(.+)$/i;
    const decoRe = /^(📖|===|\[EMOJI\]|\[DD Month|\[Her exact|\[Exact|\[1-2 lines|\[How her|\[My feelings|\[Waiting|\[my feelings)/i;

    // Normalise the COMPLETE-DIARY line style into the classic import style:
    //   "#12 - Message: [12 January 2026, 08:15 AM] - Deep: \"msg\""  →  [12 January 2026, 08:15 AM] Deep: "msg"
    // (the old "[DD-MM-YYYY HH:MM] Sender: \"msg\"" lines keep working as-is)
    const msgLineRe = /^-?\s*Message\s*:\s*\[([^\]]+)\]\s*-?\s*(Deep|(?:\S*\s*)?Chota\s*Don\S*)\s*:\s*(.*)$/i;
    // ENTRY NUMBER support: every "Message: [date]" line may start with a
    // running number — "#1", "1." or "(1)" before the dash — so big sheets can
    // be numbered 1, 2, 3 … till the end for easy checking. Only the message
    // lines carry numbers; the "What I felt:" / "Note:" lines below them belong
    // to the same entry and are never counted as separate entries.
    // The number is ONLY a label: it is stripped here before parsing (so it
    // can never reach the diary or Supabase) and the parser keeps its own
    // count of the numbered entries for word-counting purposes only.
    const numPrefixRe = /^\s*\(?\d{1,7}\)?[.)]?\s+(?=-\s*Message\s*:)/;
    const numPrefixRe2 = /^\s*#\d{1,7}\s+(?=-?\s*Message\s*:)/i;
    // 🩹 THE FIRST ENTRY FIX: every message line of the COMPLETE DIARY sheet
    // may carry a running entry number ("#1 - Message: …", "1. - Message: …",
    // "(2) - Message: …"). The old normaliser only stripped a number when it
    // was followed by "- Message:" / "Message:", so a bare numbered first line
    // like "#1 [12 January 2026, 08:15 AM] Deep: \"…\"" kept its "#1" glued to
    // the date bracket. msgRe then failed to recognise the line as a message
    // at all — the FIRST entry of the paste was swallowed into the previous
    // block (or dropped entirely when it was #1), never reached Supabase and
    // never appeared in the preview or the PDF. Now ANY leading entry number
    // on a line that contains "Message:" is removed before parsing, so entry
    // #1 is imported exactly like every other entry.
    const numPrefixAny = /^\s*\(?\d{1,7}\)?[.)]?(\s+-\s+|\s+)/;   // "#1 ", "1. ", "(1) - ", "12 -"
    const normLines = lines.map((raw) => {
      let l = raw.replace(numPrefixRe2, "").replace(numPrefixRe, "").trim();
      const m = l.match(msgLineRe);
      if (m) return "[" + m[1] + "] " + m[2] + ": " + m[3];
      // bare "[date] Sender: msg" line with an entry-number prefix → strip it
      if (!/^\[/.test(l) && /Message\s*:/i.test(l)) {
        const st = l.replace(numPrefixAny, "");
        if (st !== l) l = st.trim();
      }
      const m2 = l.match(/^Message\s*:\s*\[([^\]]+)\]\s*-?\s*(.*)$/i);
      if (m2) return "[" + m2[1] + "] " + m2[2];
      return raw;
    });

    normLines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line || /^={3,}$/.test(line) || /^(===|Format:|Sender must|Optional lines|ALL HEADINGS|QUICK REFERENCE|Use ONLY|Copy-Paste)/i.test(line)) return;

      // Horizontal rule separators between sections — skip cleanly so they
      // never get swallowed as message continuation text.
      if (/^-{3,}$/.test(line)) return;

      // ### Date: 12 January 2026  → every message below belongs to this day
      const dm = line.match(dateRe);
      if (dm) { dayDateStr = dm[1].trim(); currentHeading = ""; return; }

      // #### 💖 Sweet Compliments & Love  → section heading for messages below
      const hm = line.match(headRe);
      if (hm) {
        const htxt = hm[1].replace(/^#+/, "").trim();
        if (/FINAL SUMMARY/i.test(htxt)) { summary = []; return; }   // summary block starts
        // "### Date: …" written with an emoji in front ("### 📅 Date: …") is a
        // DAY marker, not a heading — recognise it so the very first entry of
        // every day always carries that day's real date instead of falling
        // back to import time and looking different from its siblings.
        const dm2 = htxt.match(/^.*?\bDate\s*:\s*(.+)$/i);
        if (dm2 && /^[^\w]*$/.test(htxt.slice(0, htxt.search(/Date\s*:/i)))) {
          dayDateStr = dm2[1].trim().replace(/—.*$/, "").trim();
          currentHeading = "";
          return;
        }
        currentHeading = htxt.replace(/—.*$/, "").trim();             // drop trailing guide notes
        return;
      }

      // Inside the FINAL SUMMARY block — collect its lines verbatim.
      if (summary) {
        if (/^={3,}$/.test(line) || !line) {
          if (summary.length) summary = null;                        // summary finished
          return;
        }
        summary.push(line);
        return;
      }

      const mm = line.match(msgRe);
      if (mm) {
        const senderRaw = mm[2].replace(/\s+/g, " ").trim();
        // The name in the line decides the sender — only that person owns this message
        const isDeep = /^deep$/i.test(senderRaw);
        const sender = isDeep ? DEEP_NAME : CHOTA_NAME;
        let content = (mm[3] || "").trim();
        content = content.replace(/^["“”'](.*)["“”']$/, "$1").trim();
        // Every "- Message: [date] …" line is ONE entry (#1, #2, #3 … till the
        // end of the sheet). Its words are counted from the message text and
        // its "What I felt:" / "Note:" lines only — never from the entry
        // number or the labels themselves.
        cur = { dateStr: mm[1] || dayDateStr, sender, content, felt: "", note: "", heading: currentHeading, no: ++entryCount };
        msgs.push(cur);
        return;
      }
      const fm = line.match(feelRe);
      if (fm && cur) { cur.felt += (cur.felt ? "\n" : "") + fm[2].trim(); return; }
      const nm = line.match(noteRe);
      if (nm && cur) {
        cur.note += (cur.note ? "\n" : "") + nm[1].trim();
        // A "Note: She hasn't replied..." line files the message under
        // 💭 My Messages To Her (No Reply Yet) automatically.
        if (/hasn'?t replied|no reply|still waiting/i.test(nm[1])) {
          cur.heading = "💭 My Messages To Her (No Reply Yet)";
        }
        return;
      }
      // Template guidance lines like "- Note: She hasn't replied to this message yet."
      if (/^- Note:/i.test(line)) {
        if (cur) cur.heading = "💭 My Messages To Her (No Reply Yet)";
        return;
      }
      if (decoRe.test(line)) return;
      // Continuation of previous message content
      if (cur && !/^(what|note)\b/i.test(line)) cur.content += "\n" + line;
    });
    return { msgs, summary: summary && summary.length ? summary.join("\n") : "" };
  }

  async function doImport() {
    if (!currentUser) { showToast("Please sign in to import entries 🔒"); openAuth("signin"); return; }
    const text = $("#importArea").value.trim();
    if (!text) { showToast("Paste your diary using the template first 📥"); return; }
    const parsed = parseImportText(text);
    const msgs = parsed.msgs;
    if (!msgs.length) { showToast("No messages found — check the [date] Name: \"msg\" format ⚠️"); return; }

    await refreshFromCloud(); // merge onto the freshest cloud data
    const entries = loadEntries();
    // Deterministic, collision-free unique ids: every imported row gets an id
    // that no existing entry carries. Random ids used to collide inside a big
    // batch (400 rows drawn from a 1e6 window → ~7% clashes), so duplicates
    // entered the cloud and the screen showed far MORE entries than the sheet
    // contained. Now importing N numbered rows always results in exactly N
    // new entries.
    let nextId = Date.now();
    const usedIds = new Set(entries.map((en) => Number(en.id)));
    const uniqId = () => { while (usedIds.has(nextId)) nextId++; const v = nextId++; usedIds.add(v); return v; };
    // Chronological anchor for the whole batch: the EARLIEST valid date found
    // on any numbered "Message: [date]" line. If the very first entry of a
    // sheet/day has no readable date, it is placed just BEFORE the next known
    // timestamp instead of at import time — so #1 can never end up newer than
    // #2 and look out of place (that was the "first entry is wrong on every
    // page" bug; later entries already chained backwards correctly).
    const parsedDates = msgs.map((m) => parseTemplateDate(m.dateStr || "")).filter(Boolean).sort();
    const earliestIso = parsedDates.length ? parsedDates[0] : null;
    let lastDate = null;
    msgs.forEach((m, mi) => {
      let iso = parseTemplateDate(m.dateStr || "");
      if (!iso) {
        const nd = lastDate
          ? new Date(new Date(lastDate).getTime() + 60000)                 // follow previous message
          : earliestIso
            ? new Date(new Date(earliestIso).getTime() - Math.max(1, msgs.length - mi) * 60000)
            : new Date();                                                  // nothing dated at all
        iso = nd.toISOString();
      }
      lastDate = iso;
      const who = m.sender === DEEP_NAME ? "Deep" : "Chota Don";
      // Heading: the one from the pasted template (#### section), or — when a
      // day is pasted without headings — auto-detected from the message text.
      const heading = m.heading || detectHeading(m.content + " " + m.felt, m.sender);
      let body = m.sender + ': "' + m.content + '"';
      if (m.felt) body += "\nWhat I felt: " + m.felt;
      if (m.note) body += "\nNote: " + m.note;
      entries.push({
        id: uniqId(),
        title: "Message from " + who,
        body,
        mood: m.sender === DEEP_NAME ? "💬" : "💌",
        sender: m.sender, // belongs ONLY to the named person
        heading,          // the diary section this message is filed under
        date: iso,
        // Words of THIS entry (#1, #2, #3 …): the message text plus its
        // "What I felt" / "Note" text only — the entry number and the label
        // words themselves are never counted, and the number is never stored.
        words: countWords(body)
      });
    });
    // The COMPLETE DIARY's 📌 FINAL SUMMARY is saved as its own special entry,
    // so it flows into the book right after that day's messages.
    if (parsed.summary) {
      entries.push({
        id: Date.now() + Math.floor(Math.random() * 1e6) + 1,
        title: "📌 Final Summary — Complete Diary",
        body: parsed.summary,
        mood: "📌",
        sender: DEEP_NAME,
        heading: "📌 FINAL SUMMARY - COMPLETE DIARY",
        date: (lastDate ? new Date(new Date(lastDate).getTime() + 60000) : new Date()).toISOString(),
        words: countWords(parsed.summary)
      });
    }
    // Stable order: newest first, and identical timestamps keep their sheet
    // order (the numbered template rows) instead of jumping around.
    entries.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
    // Write through to the cloud FIRST — only on success the in-memory mirror
    // is updated. (Previously entriesCache was set even when the POST failed,
    // so the preview showed imported entries that never reached Supabase and
    // vanished on the next refresh.)
    const ok = await saveEntries(entries);
    if (!ok) { showToast("⚠️ Import could not reach the cloud — please retry"); return; }
    $("#importArea").value = "";
    renderEntries();
    updateStats();
    showToast("Imported " + msgs.length + " messages ✓ (filed under their headings" + (parsed.summary ? " + final summary" : "") + ")");
  }

  $("#importBtn").addEventListener("click", doImport);

  $("#importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $("#importArea").value = String(reader.result || "");
      showToast("File loaded — click 🔄 Import Messages");
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  $("#copyTemplateBtn").addEventListener("click", () => {
    const t = $("#templateBox").textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(() => showToast("Template copied 📋"), () => showToast("Copy failed — select manually"));
    } else {
      showToast("Clipboard unavailable — select the template text manually");
    }
  });

  // ---------- Init (everything loads from the cloud — nothing lives on-device) ----------
  async function init() {
    await refreshUsers();
    try {
      const rows = await syncGet("sessions", "select=email&order=updated_at.desc&limit=1");
      if (rows && rows.length && usersMap[rows[0].email]) {
        currentUser = rows[0].email; // auto-resume the last signed-in account
        loadThemePref(currentUser);
        loadSavedSpreadFromCloud();
      }
    } catch (e) { /* offline: stay signed out */ }
    updateUserUI();
    renderEntries();
    updateStats();
  }
  init();
})();
