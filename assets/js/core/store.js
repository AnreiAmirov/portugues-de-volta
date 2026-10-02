// Обёртка над localStorage: префикс ключей и безопасная работа,
// если хранилище недоступно (приватный режим, запрет cookies).
const PREFIX = 'pdv:';

export const store = {
  get(key, fallback) {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch { /* хранилище недоступно — прогресс просто не сохранится */ }
  },
};
