/* ============ Dairy Writing — service worker (offline PWA support) ============
   Strategy:
     • precache the app shell on install
     • cache-first for same-origin static assets (so the app opens offline)
     • network-first for navigations, falling back to the cached index.html
     • never touch cross-origin requests (Supabase API, Google Fonts at runtime,
       Drive images) — they pass straight to the network.
*/
const CACHE = "dairywriting-v2";   // bumped: force-refresh the installed PWA
                                   // shell so every phone gets the new
                                   // single-page flip-up book layout at once
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.webmanifest",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try { url = new URL(req.url); } catch { return; }

  // Cross-origin (Supabase, fonts CDN, Drive images): leave untouched.
  if (url.origin !== self.location.origin) return;

  // Page navigations: network-first so updates land, cache fallback offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Static assets: cache-first, then network (and fill the cache as we go).
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && (res.type === "basic" || res.type === "default")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    }).catch(() => cached_offline_fallback(req))
  );
});

function cached_offline_fallback(req) {
  return caches.match(req).then((r) => r || Response.error());
}
