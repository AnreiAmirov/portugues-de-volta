// Service worker (офлайн-режим) и загрузка озвучки в кэш.
import { url } from './paths.js';

export const AUDIO_CACHE = 'pdv-audio-v1';

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!secure) return;
  navigator.serviceWorker.register(url('sw.js')).catch((e) => console.warn('SW:', e));
}

export async function countCached(files) {
  if (!('caches' in window)) return 0;
  const cache = await caches.open(AUDIO_CACHE);
  let n = 0;
  for (const f of files) if (await cache.match(f)) n++;
  return n;
}

// Скачивает все записи в кэш, по 6 параллельно. onProgress(done, total).
export async function cacheAudio(files, onProgress) {
  const cache = await caches.open(AUDIO_CACHE);
  let done = 0;
  let failed = 0;
  const queue = files.slice();
  async function worker() {
    while (queue.length) {
      const f = queue.shift();
      try {
        if (!(await cache.match(f))) {
          const res = await fetch(f);
          if (res.ok) await cache.put(f, res); else failed++;
        }
      } catch { failed++; }
      onProgress(++done, files.length);
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  return { total: files.length, failed };
}
