/* Service worker: cache toan bo file de app dung duoc offline sau lan tai dau. */
const CACHE_NAME = "sotayluyendich-v6";
const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "db.js",
  "ipa.js",
  "pinyin.js",
  "util.js",
  "github-sync.js",
  "manifest.json",
  "data/cmu_dict.json",
  "data/pinyin_dict.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Khong cache cac request toi GitHub API (dong bo can du lieu moi nhat)
  if (url.hostname.includes("api.github.com")) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((res) => {
        if (event.request.method === "GET" && res.ok) {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return res;
      });
    })
  );
});
