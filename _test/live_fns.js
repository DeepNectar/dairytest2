var DEEP_NAME="Deep";
var CHOTA_NAME="🫰🫶🏻Chota Don❣️❤️😘";
var normSender=(s)=>String(s==null?"":s).normalize("NFC").replace(/[\uFE0E\uFE0F]/g,"").toLowerCase().trim();
var BOOK_PREVIEW_MAX_LINES=14;
var BOOK_PREVIEW_MAX_CHARS=620;
var ENTITY_TRACE_RE = /&(?:[a-zA-Z][a-zA-Z0-9]{1,10}|#\d{1,7}|#x[0-9a-fA-F]{1,6});/;
var TAG_TRACE_RE = /<[a-zA-Z\/!>][^>]*>?|</;
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
    // RAW-HTML LEAK KILLER (bubble side): EVERY text unit that goes into the
    // bubble passes through finalScrub() before escaping — leftover entities,
    // tag fragments or wrapping quotes baked into old cloud rows can no
    // longer survive into the page as visible HTML code on ANY entry.
    let html = main.map(l => escapeHtml(finalScrub(l))).join("\n");
    if (felt.length) html += "<span class=\"eb-extra\"><span class=\"eb-label\">💭 How I felt: </span>" +
      felt.map(l => escapeHtml(finalScrub(l))).join("\n") + "</span>";
    if (note.length) html += "<span class=\"eb-extra\"><span class=\"eb-label\">📝 Note: </span>" +
      note.map(l => escapeHtml(finalScrub(l))).join("\n") + "</span>";
    return html;
  }

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

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }