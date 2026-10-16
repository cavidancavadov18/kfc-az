const CACHE = "kfc-az-v18";
const SHELL = [
  "/",
  "/menu",
  "/offers",
  "/orders",
  "/favorites",
  "/branches",
  "/css/styles.css?v=18",
  "/js/catalog.js?v=18",
  "/js/branches.js?v=18",
  "/js/content.js?v=18",
  "/js/i18n.js?v=18",
  "/js/app.js?v=18",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
