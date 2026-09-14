/* ============================================================
   sw.js — сервис-воркер: игра работает и без интернета
   ============================================================ */
const CACHE = 'slug-v4';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/util.js',
  'js/audio.js',
  'js/fx.js',
  'js/slug.js',
  'js/slugArt.js',
  'js/ui.js',
  'js/save.js',
  'js/app.js',
  'js/room.js',
  'js/icons.js',
  'js/stations/index.js',
  'js/stations/base.js',
  'js/stations/blender.js',
  'js/stations/campfire.js',
  'js/stations/acid.js',
  'js/stations/shower.js',
  'js/stations/pills.js',
  'js/stations/pan.js',
  'js/stations/ice.js',
  'js/screens/title.js',
  'js/screens/hub.js',
  'js/screens/saves.js',
  'js/screens/map.js',
  'js/main.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-64.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(FILES.map((f) => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // шрифты и прочее — мимо кэша

  // сначала сеть (чтобы новая версия приезжала сразу), кэш — запасной вариант
  e.respondWith(
    fromNetwork(req, 3000).catch(() => fromCache(req))
  );
});

function fromNetwork(req, timeout) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout);
    fetch(req).then((res) => {
      clearTimeout(timer);
      if (!res || !res.ok) { reject(new Error('bad response')); return; }
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      resolve(res);
    }).catch((err) => { clearTimeout(timer); reject(err); });
  });
}

function fromCache(req) {
  return caches.match(req).then((hit) => {
    if (hit) return hit;
    if (req.mode === 'navigate') return caches.match('index.html');
    return Promise.reject(new Error('no cache'));
  });
}
