// Extracts the CURRENT render-pipeline functions straight out of script.js so
// tests always run against live code (no hand-copied snapshots).
const fs = require('fs');
const src = fs.readFileSync('/workspace/script.js', 'utf8');

function grab(startNeedle, endNeedle) {
  const i = src.indexOf(startNeedle);
  if (i === -1) throw new Error('not found: ' + startNeedle);
  const j = src.indexOf(endNeedle, i);
  if (j === -1) throw new Error('end not found after: ' + startNeedle);
  return src.slice(i, j);
}

const consts = [
  'const DEEP_NAME = "Deep";',
  'const CHOTA_NAME = "\u{1FAF0}\u{1FAF6}\u{1F3FB}Chota Don\u2763\uFE0F\u2764\uFE0F\u{1F618}"; // exact sender name for her messages\n',
].join('\n');

// grab helpers between known landmarks
const normSenderBlock = grab('const normSender = (s)', 'function stripSenderPrefix');
const stripBlock = grab('function stripSenderPrefix', 'function trimEntryLines');
const trimBlock = grab('function trimEntryLines', 'function compactPreview');
const compactBlock = grab('function compactPreview', '// ---------- Canonical stored-body shape');
const decodeLite = grab('function decodeHtmlEntitiesLite', '// ---------- UNIVERSAL MARKUP SCRUBBER');
const scrubbers = grab('function decodeAllEntities', 'function normaliseStoredBody');
const finalScrubBlock = grab('const ENTITY_TRACE_RE', 'function normaliseStoredBody');
const normBlock = grab('function normaliseStoredBody', 'function formatBookBodyHtml');
const fmtBlock = grab('function formatBookBodyHtml', '// Parse the date/time written inside');

// escapeHtml from the app (used verbatim)
const escBlock = grab('function escapeHtml(str)', 'function formatDate');

const BOOK_CONSTS = `
const BOOK_PREVIEW_MAX_CHARS = 620;
const BOOK_PREVIEW_MAX_LINES = 14;
`;

const code = [
  consts, BOOK_CONSTS, escBlock, normSenderBlock, stripBlock, trimBlock, compactBlock,
  decodeLite, finalScrubBlock, scrubbers, normBlock, fmtBlock,
  `module.exports = { normaliseStoredBody, formatBookBodyHtml, stripSenderPrefix, trimEntryLines, compactPreview, escapeHtml, finalScrub, stripAllMarkup, decodeAllEntities, DEEP_NAME, CHOTA_NAME, normSender };`
].join('\n');

fs.writeFileSync('/workspace/_test/live_fns.js', 'var m = {};\n' + code.replace(/\bfunction (decodeHtmlEntitiesLite|stripSenderPrefix)/g, 'function $1'));
// eval in this module scope and export
module.exports = eval(`(function(){ ${code.replace(/module\.exports[^\n]*\n/, '')}; return { normaliseStoredBody, formatBookBodyHtml, stripSenderPrefix, trimEntryLines, compactPreview, escapeHtml, finalScrub, stripAllMarkup, decodeAllEntities, DEEP_NAME, CHOTA_NAME, normSender }; })()`);
