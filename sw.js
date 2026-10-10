// Cache-first app shell. Bump VERSION on every deploy; old caches are removed on activate.
const VERSION = 'tafel-v4';
const ASSETS = ['./','index.html','manifest.webmanifest','css/styles.css','icons/icon.svg','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png',
  'js/app.js','js/db.js','js/state.js','js/utils.js','js/settings.js','js/shopping.js','js/ingredients.js','js/recipes.js','js/planner.js','js/pantry.js','js/seed.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
