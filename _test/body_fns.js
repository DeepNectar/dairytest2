const normSender = (s) => String(s == null ? "" : s)
    .normalize("NFC")
    .replace(/[\uFE0E\uFE0F]/g, "")   // drop VS15/VS16 spelling variants
    .toLowerCase()
    .trim();


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
    // no legacy markup/entities), return it untouched.
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
    if (canonicalRe.test(probe) && !/<[a-z\/]/i.test(probe) && !/&(?:quot|#0?39|apos|nbsp|lt|gt|amp);/i.test(probe)) {
      return probe;
    }
    let t = probe;
    // 0) Detect the REAL sender from the leading "Name:" prefix when the
    //    caller's value does not match (legacy rows can store a different
    //    sender spelling than the column carries). The name may itself be
    //    wrapped in quotes by old saves — &quot;🫰🫶🏻Chota Don❣️❤️😘&quot;:
    //    &quot;msg&quot; — so quote characters are allowed inside the capture
    //    and stripped afterwards. When the quoted-name form was NOT matched,
    //    the sender stayed unset and step 6 re-emitted `Sender: "Sender:
    //    \"msg\""` — the duplicated sender + leftover `&quot;` raw-code look of
    //    the first imported entry on every page.
    const pm = t.match(/^\s*["\u201c]?([^:\r\n""]{1,60}?)["\u201d]?\s*:\s/);
    if (pm && (!sender || pm[1].trim() !== String(sender).trim())) {
      const cand = pm[1].replace(/["\u201c\u201d]/g, "").trim();
      if (normSender(cand) === normSender(DEEP_NAME) || normSender(cand) === normSender(CHOTA_NAME)) {
        sender = cand;
      }
    }
    // 1) Decode entity-wrapped legacy bodies (&quot;...&quot;, &#39; etc.).
    //    DECODE-TO-FIXPOINT: legacy rows can be DOUBLE-encoded (&amp;quot;),
    //    and one pass would leave `&quot;` behind which later got escaped to
    //    raw code in the preview (the broken first entry). Keep decoding
    //    until the text stops changing (max 4 passes), so whatever survived
    //    ANY old save path is fully restored to plain characters here.
    for (let guard = 0; guard < 4 && /&(?:quot|#0?39|apos|nbsp|lt|gt|amp);/.test(t); guard++) {
      const before = t;
      t = decodeHtmlEntitiesLite(t);
      if (t === before) break;
    }
    // 2) Legacy heading band: <div class='eb-heading-band'>…</div> baked into
    //    the body by old saves → remove the whole element (the heading lives
    //    in its own column now and is re-emitted as a styled band).
    t = t.replace(/\s*<div\b[^>]*eb-heading-band[^>]*>[\s\S]*?<\/div>\s*/gi, "\n");
    // 3) Remaining markup: a legacy eb-extra span becomes its OWN line and
    //    its inner label ("💭 How I felt: " / "📝 Note: ") is followed by a
    //    newline, so the felt/note text always starts at a line beginning —
    //    exactly where the canonical parser below expects its markers.
    t = t.replace(/<span\b[^>]*eb-extra[^>]*>\s*<span\b[^>]*eb-label[^>]*>([\s\S]*?)<\/span>/gi,
      function (_all, label) { return "\n" + label.trim() + " "; });
    t = t.replace(/<\/?span\b[^>]*eb-extra[^>]*>/gi, "");
    t = t.replace(/<\/?(?:div|span|p|strong|em|i|b)\b[^>]*>/gi, "");
    t = t.replace(/<br\s*\/?>/gi, "\n");
    // 4) Legacy 📂-marked line standing on its own → drop it (same reason as 2).
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
    let qm = t.match(/^[\s\uFEFF]*["\u201c]([^\r\n]*)["\u201d][ \t]*(?=\r?\n|$)/);
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
        if (un) t = un[1].replace(/["\u201d][ \t]*$/, "");
      }
    }
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
    // LAST LINE OF DEFENCE (the "first entry of every booklet page shows raw
    // code" bug): whatever survived normalisation — leftover &quot; entities,
    // an eb-extra span or a heading-band div baked into OLD cloud rows — is
    // stripped here to PLAIN TEXT before parsing. The parser below re-adds
    // its own properly-escaped markup, so a bubble can NEVER contain raw
    // HTML code, on any page, for any entry.
    msg = String(msg || "")
      .replace(/<div\b[^>]*eb-heading-band[^>]*>[\s\S]*?<\/div>/gi, "")
      .replace(/<span\b[^>]*eb-extra[^>]*>\s*<span\b[^>]*eb-label[^>]*>([\s\S]*?)<\/span>/gi, "\n$1 ")
      .replace(/<\/?(?:div|span|p|strong|em|i|b)\b[^>]*>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n");
    for (let g = 0; g < 4 && /&(?:quot|#0?39|apos|nbsp|lt|gt|amp);/.test(msg); g++) {
      const b4 = msg; msg = decodeHtmlEntitiesLite(msg); if (msg === b4) break;
    }
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
    let html = main.map(l => escapeHtml(l)).join("\n");
    if (felt.length) html += "<span class=\"eb-extra\"><span class=\"eb-label\">💭 How I felt: </span>" +
      felt.map(l => escapeHtml(l)).join("\n") + "</span>";
    if (note.length) html += "<span class=\"eb-extra\"><span class=\"eb-label\">📝 Note: </span>" +
      note.map(l => escapeHtml(l)).join("\n") + "</span>";
    return html;
  }
const DEEP_NAME = "Deep";
const CHOTA_NAME = "\u{1FAF0}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F48B}";
const BOOK_PREVIEW_MAX_CHARS = 620;
const BOOK_PREVIEW_MAX_LINES = 14;
const escapeHtml = s => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
module.exports = { normaliseStoredBody, formatBookBodyHtml, stripSenderPrefix, trimEntryLines, decodeHtmlEntitiesLite, DEEP_NAME, CHOTA_NAME };
