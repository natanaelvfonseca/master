self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Cache Storage is isolated by origin, and this origin is dedicated to Master.
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await self.clients.claim();

      // Refresh pages that may still be running an application shell served by an older worker.
      const windowClients = await self.clients.matchAll({ type: "window" });
      await Promise.all(windowClients.map((client) => client.navigate(client.url)));
    })(),
  );
});
