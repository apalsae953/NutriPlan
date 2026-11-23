/* =========================================================
   SERVICE WORKER — Funcionamiento sin conexión
   - App (HTML, CSS, JS): primero la red, si no hay, la copia
     guardada. Así las actualizaciones llegan al momento.
   - La sincronización (Supabase, /api) y las estadísticas
     de Vercel nunca pasan por la caché.
   ========================================================= */

const CACHE = 'nutriplan-3.8.0';

const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'fuentes/fraunces-latin.woff2',
  'fuentes/fraunces-latin-ext.woff2',
  'css/base.css',
  'css/componentes.css',
  'css/vistas.css',
  'js/tema.js',
  'js/estadisticas.js',
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

  // Solo se encarga de los archivos de la propia web
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_vercel/')) return;
  e.respondWith(redPrimero(req));
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
