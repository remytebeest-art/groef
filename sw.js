/* Groef service worker — app werkt ook zonder verbinding (collectie staat lokaal) */
const SHELL = 'groef-shell-v2', COVERS = 'groef-covers-v1';
const FILES = ['./', 'index.html', 'styles.css', 'js/core.js', 'js/views.js', 'js/main.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![SHELL, COVERS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {            // app zelf: altijd de nieuwste versie van het netwerk (niet de browsercache), anders cache
    e.respondWith(fetch(req.url, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(SHELL).then(c => c.put(req, copy)); return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
    return;
  }
  if (/mzstatic\.com|coverartarchive\.org|archive\.org|fonts\.(googleapis|gstatic)\.com/.test(url.hostname)) {   // hoezen & lettertypen: eerst cache
    e.respondWith(caches.open(COVERS).then(async c => {
      const hit = await c.match(req); if (hit) return hit;
      const r = await fetch(req); if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r;
    }).catch(() => Response.error()));
  }
});
