/* Boom Boom Ciao: funciona sin conexión. Sube el número de versión al publicar cambios. */
const CACHE = 'bbc-v6';
const BASE = ['./', 'index.html', 'config.js', 'supabase.js', 'manifest.webmanifest', 'logo-oro.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url); if (u.origin !== location.origin && !/(^|\.)(googleapis\.com|gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname)) return;
  const guarda = res => { if (res && (res.ok || res.type === 'opaque')) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(r, copia)); } return res; };
  // Lo propio de la app: primero la red (así llegan las actualizaciones) y, si no hay, lo guardado.
  if (u.origin === location.origin) { e.respondWith(fetch(r).then(guarda).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : Response.error())))); return; }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(guarda)));
});
