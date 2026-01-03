// Authority PWA Service Worker
const CACHE_NAME = "authority-v1"
const urlsToCache = [
  "/",
  "/assets/avatars/authority-anime.jpg",
  "/assets/backgrounds/authority-bg-1.png",
  "/assets/backgrounds/authority-bg-2.png",
  "/assets/icons/authority-icon_no_background_upscaled.png",
  "/globals.css",
]

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Authority SW] Caching app shell")
      return cache.addAll(urlsToCache)
    }),
  )
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("[Authority SW] Removing old cache:", cacheName)
            return caches.delete(cacheName)
          }
        }),
      )
    }),
  )
  self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        return response
      }

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response
        }

        const responseToCache = response.clone()

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache)
        })

        return response
      })
    }),
  )
})

// Background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncMessages())
  }
})

async function syncMessages() {
  console.log("[Authority SW] Syncing messages...")
}

// Push notifications
self.addEventListener("push", (event) => {
  const data = event.data.json()

  const options = {
    body: data.body,
    icon: "/assets/icons/authority-icon_no_background_upscaled.png",
    badge: "/assets/icons/authority-icon_no_background_upscaled.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey,
    },
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click event
self.addEventListener("notificationclick", (event) => {
  console.log("[Authority SW] Notification click received")
  event.notification.close()
  event.waitUntil(clients.openWindow("/"))
})



