/* =========================================================
   SERVICE WORKER — Funcionamiento sin conexión
   - App (HTML, CSS, JS): primero la red, si no hay, la copia
     guardada. Así las actualizaciones llegan al momento.
   - Fuentes: copia guardada y se refresca en segundo plano.
   - API de sincronización: nunca se guarda en caché.
   ========================================================= */

const CACHE = 'nutriplan-3.5.0';

const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/base.css',
  'css/componentes.css',
  'css/vistas.css',
  'js/iconos.js',
  'js/utilidades.js',
  'js/ui.js',
  'js/categorias.js',
  'js/datos.js',
  'js/nube.js',
  'js/storage.js',
  'js/dietas.js',
  'js/recetas.js',
  'js/compra.js',
  'js/familia.js',
  'js/ajustes.js',
  'js/app.js',
  'iconos/icono.svg',
  'iconos/icono-32.png',
  'iconos/icono-180.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
  'iconos/icono-maskable-192.png',
  'iconos/icono-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/api/')) return;
    e.respondWith(redPrimero(req));
    return;
  }

  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(cacheYActualizar(req));
  }
});

async function redPrimero(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const guardada = await cache.match(req, { ignoreSearch: true });
    if (guardada) return guardada;
    if (req.mode === 'navigate') return cache.match('index.html');
    throw err;
  }
}

async function cacheYActualizar(req) {
  const cache = await caches.open(CACHE);
  const guardada = await cache.match(req);
  const red = fetch(req)
    .then(res => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })
    .catch(() => guardada);
  return guardada || red;
}
