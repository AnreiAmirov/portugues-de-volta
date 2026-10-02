// Озвучка. Два источника:
// 1) нейросетевые mp3 из audio/ (генерирует scripts/generate_audio.py в GitHub Actions);
// 2) системный синтезатор речи браузера — если записи нет или она не нужна.
// Роли: 'main' — основной голос (лексика, собеседник в диалоге),
//       'alt'  — второй голос (реплики ученика в диалоге).
import { url } from './paths.js';
import { store } from './store.js';

const SPEEDS = {
  normal: { sys: 0.95, audio: 1 },
  slow: { sys: 0.8, audio: 0.8 },
  fast: { sys: 1.05, audio: 1.1 },
};
export const NEURAL = 'neural';

let manifest = null;
let speed = SPEEDS[store.get('speed', 'normal')] ? store.get('speed', 'normal') : 'normal';
let voiceChoice = store.get('voice', '');
let token = 0;
let currentAudio = null;
const listeners = new Set();

// Та же нормализация, что в scripts/generate_audio.py — по ней ищется запись.
export function clean(t) {
  return String(t)
    .replace(/\[.*?\]/g, '')
    .replace(/\s*→\s*/g, ', ')
    .replace(/([!?.])\s*\/\s*/g, '$1 ')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/\.\.\.|…/g, ' ')
    .replace(/___/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------- системные голоса ---------- */
function systemVoices() {
  try { return speechSynthesis.getVoices().filter((v) => /^pt/i.test(v.lang)); } catch { return []; }
}
function score(v) {
  const n = (v.name || '').toLowerCase();
  let s = 0;
  if (/pt[-_]br/i.test(v.lang)) s += 100;
  if (/natural|neural|online|wavenet/.test(n)) s += 50;
  if (/premium|enhanced|aprimorad|melhorad|улучш|премиум|siri/.test(n)) s += 45;
  if (/google/.test(n)) s += 25;
  if (/compact|eloquence|espeak|novelty|grandma|grandpa|rocko|shelley|reed|sandy|flo\b|bells|bahh|boing|bubbles|jester|organ|trinoids|whisper|zarvox|albert|bad news|good news|cellos|wobble|superstar|junior|kathy|ralph|fred/.test(n)) s -= 80;
  return s;
}
const ranked = () => systemVoices().sort((a, b) => score(b) - score(a));
function mainSystemVoice() {
  const vs = ranked();
  return vs.find((v) => v.name === voiceChoice) || vs[0] || null;
}
function altSystemVoice() {
  const m = mainSystemVoice();
  if (!m) return null;
  return ranked().find((v) => v.name !== m.name && /pt[-_]br/i.test(v.lang) && score(v) >= 100) || m;
}

/* ---------- состояние ---------- */
export const hasNeural = () => !!(manifest && Object.keys(manifest.texts || {}).length);
const useNeural = () => hasNeural() && (voiceChoice === NEURAL || voiceChoice === '');

export function voiceOptions() {
  const opts = [];
  if (hasNeural()) {
    opts.push({ value: NEURAL, label: 'Нейросетевой голос — рекомендуется', selected: useNeural() });
  }
  const cur = useNeural() ? null : mainSystemVoice();
  for (const v of ranked()) {
    opts.push({
      value: v.name,
      label: `${v.name} (${v.lang})${score(v) >= 140 ? ' — естественный' : ''}`,
      selected: !!cur && v.name === cur.name,
    });
  }
  return opts;
}
export function voiceQuality() {
  if (useNeural()) return 'neural';
  const best = ranked()[0];
  if (!best) return 'none';
  return score(best) >= 140 ? 'good' : 'basic';
}
export function setVoice(value) { voiceChoice = value; store.set('voice', value); }
export function setSpeed(key) { if (SPEEDS[key]) { speed = key; store.set('speed', key); } }
export const getSpeed = () => speed;
export const onVoicesChanged = (fn) => listeners.add(fn);
export const audioFiles = () => {
  if (!manifest) return [];
  const set = new Set();
  Object.values(manifest.texts).forEach((r) => Object.values(r).forEach((f) => set.add(f)));
  return [...set].map((f) => url('audio/' + f));
};

/* ---------- воспроизведение ---------- */
export function stop() {
  token++;
  try { speechSynthesis.cancel(); } catch { /* нет синтезатора */ }
  if (currentAudio) { currentAudio.pause(); currentAudio = null; }
}

function playFile(file, my) {
  return new Promise((resolve) => {
    if (my !== token) return resolve();
    const a = new Audio(url('audio/' + file));
    a.playbackRate = SPEEDS[speed].audio;
    a.preservesPitch = true;
    a.onended = () => resolve(true);
    a.onerror = () => resolve(false);
    currentAudio = a;
    a.play().catch(() => resolve(false));
  });
}

function systemSay(text, role, my) {
  return new Promise((resolve) => {
    if (my !== token || !('speechSynthesis' in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const v = role === 'alt' ? altSystemVoice() : mainSystemVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = 'pt-BR'; }
    u.rate = SPEEDS[speed].sys;
    // Chrome иногда не присылает onend — страховочный таймер.
    const t = setTimeout(resolve, 1500 + text.length * 120);
    u.onend = u.onerror = () => { clearTimeout(t); resolve(); };
    speechSynthesis.speak(u);
  });
}

async function sayOne(text, role, my) {
  const c = clean(text);
  if (!c) return;
  const rec = useNeural() && manifest.texts[c];
  const file = rec && (rec[role] || rec.main);
  if (file) {
    const ok = await playFile(file, my);
    if (ok !== false) return;
  }
  await systemSay(c, role, my);
}

export async function speak(text, { role = 'main' } = {}) {
  stop();
  await sayOne(text, role, token);
}

// Последовательное воспроизведение: [[текст, роль], ...]
export async function speakSequence(items) {
  stop();
  const my = token;
  for (const [text, role] of items) {
    if (my !== token) return;
    await sayOne(text, role, my);
  }
}

/* ---------- инициализация ---------- */
export async function initSpeech() {
  try {
    const res = await fetch(url('audio/manifest.json'));
    if (res.ok) manifest = await res.json();
  } catch { /* записей нет — работаем на системных голосах */ }
  const notify = () => listeners.forEach((fn) => fn());
  if ('speechSynthesis' in window) {
    try {
      speechSynthesis.getVoices();
      speechSynthesis.addEventListener('voiceschanged', notify);
    } catch { /* старые браузеры */ }
    setTimeout(notify, 400);
    setTimeout(notify, 1500);
  }
}
