// Restro POS Service Worker for Offline Resilience
const CACHE_NAME = "restro-pos-v1"

const STATIC_ASSETS = [
  "/",
  "/dashboard/pos",
  "/manifest.json",
  "/globe.svg"
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[SW] Install pre-cache partial fail:", err)
      })
    })
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    })
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip API calls and WebSocket/Reverb traffic from service worker caching
  // (API data is managed intelligently by IndexedDB offline-db)
  if (url.pathname.startsWith("/api") || url.pathname.includes("reverb") || request.method !== "GET") {
    return
  }

  // Cache-first for fonts, images, and static assets; Network-first for pages
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image"
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return networkResponse
          })
          .catch(() => cachedResponse)
      })
    )
    return
  }

  // Network first with cache fallback for navigation/pages
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return networkResponse
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached
          // If page navigation fails, try serving cached POS
          if (request.mode === "navigate") {
            return caches.match("/dashboard/pos")
          }
          return new Response("Offline", { status: 503, statusText: "Offline" })
        })
      })
  )
})
