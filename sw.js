/* ============================================================
   sw.js — сервис-воркер: игра работает и без интернета
   ============================================================ */
const CACHE = 'slug-v8';

const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/loader.js',
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
      .then((c) => Promise.allSettled(FILES.map((f) => c.add(new Request(f, { cache: 'reload' })))))
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

  // отдаём из кэша сразу (игра открывается мгновенно),
  // а свежую версию тянем в фоне — её подхватит следующий воркер
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
      if (hit) { net.catch(() => {}); return hit; }
      return net.catch(() => {
        if (req.mode === 'navigate') return caches.match('index.html');
        return Response.error();
      });
    })
  );
});
