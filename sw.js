/* Dairy Writing — service worker
 * Strategy: network-first for pages (always the freshest app), cache-first
 * fallback so the app shell still opens offline once visited. Google Fonts
 * are cached with a stale-while-revalidate policy. Supabase API calls are
 * NEVER cached (diary data must always be live).
 */
"use strict";

const VERSION = "dairy-app-v1";
const SHELL_CACHE = VERSION + "-shell";
const FONT_CACHE = VERSION + "-fonts";
const RUNTIME_CACHE = VERSION + "-runtime";

const SHELL_URLS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./app-install.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => {}) // never block installation on a single failed asset
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

function isFontRequest(url) {
  return (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com"
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never touch the Supabase REST API — diary data must stay live.
  if (url.hostname.endsWith("supabase.co")) return;

  // Cross-origin fonts: stale-while-revalidate.
  if (isFontRequest(url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            if (res && (res.ok || res.status === 0)) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      })
    );
    return;
  }

  const isPageNav = req.mode === "navigate" || req.destination === "document";

  if (isPageNav) {
    // Network first; fall back to the cached app shell (offline launch).
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME_CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL_CACHE);
          const hit =
            (await cache.match(req)) ||
            (await cache.match("./index.html")) ||
            (await cache.match("./"));
          return (
            hit ||
            new Response("Offline — please reconnect.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        })
    );
    return;
  }

  // Same-origin static assets: cache first, update in background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});
