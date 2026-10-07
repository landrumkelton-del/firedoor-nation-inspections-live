const VERSION = 'fdn-v1'
const SHELL = `${VERSION}-shell`
const RUNTIME = `${VERSION}-runtime`
const BASE = new URL('./', self.location.href).pathname
const scoped = path => `${BASE}${path}`
const APP_SHELL = [BASE, scoped('offline.html'), scoped('manifest.webmanifest'), scoped('icons/icon-192.png'), scoped('icons/icon-512.png')]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => !key.startsWith(VERSION)).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone()
      caches.open(RUNTIME).then(cache => cache.put(request, copy))
      return response
    }).catch(async () => (await caches.match(request)) || (await caches.match(BASE)) || caches.match(scoped('offline.html'))))
    return
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(RUNTIME).then(cache => cache.put(request, response.clone()))
    return response
  })))
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})
