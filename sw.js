// Service worker: делает курс доступным офлайн.
// __BUILD__ заменяется на хэш коммита при деплое (см. .github/workflows/deploy.yml),
// поэтому после каждого деплоя кэш оболочки обновляется.
const VERSION = '__BUILD__';
const SHELL_CACHE = `pdv-shell-${VERSION}`;
const AUDIO_CACHE = 'pdv-audio-v1';
const FONT_CACHE = 'pdv-fonts-v1';

// Файлы оболочки. Список проверяет scripts/validate.mjs — не забудьте добавить сюда новый модуль.
const CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/styles.css',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/js/main.js',
  'assets/js/core/data.js',
  'assets/js/core/offline.js',
  'assets/js/core/paths.js',
  'assets/js/core/speech.js',
  'assets/js/core/store.js',
  'assets/js/core/util.js',
  'assets/js/views/cards.js',
  'assets/js/views/cheat.js',
  'assets/js/views/dialogs.js',
  'assets/js/views/grammar.js',
  'assets/js/views/plan.js',
  'assets/js/views/quiz.js',
  'assets/js/views/settings.js',
  'assets/js/views/stats.js',
  'assets/js/views/tabs.js',
  'assets/js/views/vocab.js',
  'data/plan.json',
  'data/vocab.json',
  'data/dialogs.json',
  'data/cheat.json',
  'data/grammar/index.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await cache.addAll(CORE);
    // Тексты грамматики перечислены в index.json — кэшируем их тоже.
    try {
      const index = await (await fetch('data/grammar/index.json')).json();
      await cache.addAll(index.units.map((u) => `data/grammar/${u.file}`));
    } catch { /* догрузятся при первом открытии */ }
    try { await cache.add('audio/manifest.json'); } catch { /* озвучки может не быть */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith('pdv-shell-') && k !== SHELL_CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
  return res;
}

// Онлайн — всегда свежая версия, офлайн — из кэша.
async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    if (request.mode === 'navigate') return cache.match('index.html');
    throw new Error('offline');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const u = new URL(request.url);
  if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request, FONT_CACHE));
    return;
  }
  if (u.origin !== self.location.origin) return;
  if (u.pathname.endsWith('.mp3')) {
    event.respondWith(cacheFirst(request, AUDIO_CACHE));
    return;
  }
  event.respondWith(networkFirst(request));
});
