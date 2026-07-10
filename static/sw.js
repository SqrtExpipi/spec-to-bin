const version = new URL(self.location.href).searchParams.get("v") || "dev";
const cachePrefix = "spec-to-bin-";
const cacheName = `${cachePrefix}${version}`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(cacheName).then(async (cache) => {
      const indexUrl = new URL("./index.html", self.registration.scope);
      const response = await fetch(indexUrl);
      const html = await response.clone().text();
      const assetUrls = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1])
        .map((path) => new URL(path, indexUrl))
        .filter((url) => url.origin === self.location.origin)
        .map((url) => url.href);
      await cache.put(indexUrl, response);
      await cache.addAll([...new Set([
        new URL("./", self.registration.scope).href,
        new URL("./manifest.webmanifest", self.registration.scope).href,
        new URL("./icon.svg", self.registration.scope).href,
        ...assetUrls
      ])]);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(cachePrefix) && key !== cacheName)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response.ok || new URL(event.request.url).origin !== self.location.origin) {
          return response;
        }
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cached) => cached || caches.match(new URL("./", self.registration.scope).href))
      )
  );
});
