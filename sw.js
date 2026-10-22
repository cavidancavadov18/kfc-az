const CACHE = "kfc-az-v28";
const SHELL = [
  "/",
  "/menu",
  "/offers",
  "/orders",
  "/favorites",
  "/branches",
  "/css/styles.css?v=28",
  "/js/catalog.js?v=25",
  "/js/branches.js?v=25",
  "/js/content.js?v=25",
  "/js/i18n.js?v=28",
  "/js/app.js?v=28",
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
    fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => caches.match(req))
  );
});
