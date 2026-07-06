self.addEventListener("install", (event) => {
  const assets = ["./", "./index.html", "./manifest.webmanifest"];

  event.waitUntil(
    caches.open("spec-to-bin-v0.1").then((cache) => cache.addAll(assets))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open("spec-to-bin-v0.1").then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./")))
  );
});
