#!/usr/bin/env node
// Проверка контента перед деплоем: структура JSON, упражнения, файлы грамматики,
// разметка [[...]] и список файлов в sw.js. Запуск: node scripts/validate.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const json = (p) => {
  try { return JSON.parse(read(p)); } catch (e) { err(p, `не читается как JSON — ${e.message}`); return null; }
};
const str = (v) => typeof v === 'string' && v.trim().length > 0;

function checkMarkup(where, text) {
  const open = (text.match(/\[\[/g) || []).length;
  const close = (text.match(/\]\]/g) || []).length;
  if (open !== close) err(where, `несбалансированные [[ ]] (${open} открыто, ${close} закрыто)`);
  for (const m of text.matchAll(/\[\[(.+?)\]\]/g)) {
    if (/[<>&]/.test(m[1])) err(where, `внутри [[${m[1]}]] не должно быть HTML`);
  }
}

// plan
const plan = json('data/plan.json');
if (plan) {
  if (!Array.isArray(plan.weeks) || !plan.weeks.length) err('plan.json', 'нет недель');
  plan.weeks?.forEach((w, i) => {
    if (!str(w.title)) err('plan.json', `неделя ${i + 1} без названия`);
    if (!Array.isArray(w.days) || !w.days.every(str)) err('plan.json', `неделя ${i + 1}: пустые дни`);
  });
}

// vocab
const vocab = json('data/vocab.json');
const topicIds = new Set();
if (vocab) {
  vocab.topics.forEach((t, ti) => {
    const where = `vocab.json → ${t.id || 'тема ' + (ti + 1)}`;
    if (!/^[a-z0-9-]+$/.test(t.id || '')) err(where, 'id только из латиницы, цифр и дефиса');
    if (topicIds.has(t.id)) err(where, 'повторяющийся id темы');
    topicIds.add(t.id);
    if (!str(t.name)) err(where, 'нет названия');
    const seen = new Set();
    t.items.forEach((it, i) => {
      if (!str(it.pt) || !str(it.ru)) err(where, `фраза ${i + 1}: нужны поля pt и ru`);
      if (seen.has(it.pt)) err(where, `повтор фразы «${it.pt}» — карточки различаются по pt`);
      seen.add(it.pt);
    });
    if (t.items.length < 4) err(where, 'меньше 4 фраз — в тесте не хватит вариантов ответа');
  });
}

// grammar
const grammar = json('data/grammar/index.json');
if (grammar) {
  const ids = new Set();
  grammar.units.forEach((u, ui) => {
    const where = `grammar → ${u.id || 'тема ' + (ui + 1)}`;
    if (ids.has(u.id)) err(where, 'повторяющийся id');
    ids.add(u.id);
    if (!str(u.title)) err(where, 'нет названия');
    if (!Number.isInteger(u.week)) err(where, 'week должен быть числом');
    const file = join('data/grammar', u.file || '');
    if (!u.file || !existsSync(join(ROOT, file))) err(where, `нет файла ${file}`);
    else checkMarkup(file, read(file));
    (u.razbors || []).forEach((r, i) => {
      if (!str(r.s) || !str(r.ru) || !Array.isArray(r.points)) err(where, `разбор ${i + 1}: нужны s, ru, points`);
      r.points?.forEach((p) => checkMarkup(`${where}, разбор ${i + 1}`, p));
    });
    if (!u.exercises?.length) err(where, 'нет упражнений');
    u.exercises?.forEach((ex, i) => {
      const w = `${where}, упражнение ${i + 1}`;
      if (!str(ex.q) || !str(ex.a)) err(w, 'нужны q и a');
      if (!Array.isArray(ex.wrong) || !ex.wrong.length) err(w, 'нужен хотя бы один неверный вариант');
      if (ex.wrong?.includes(ex.a)) err(w, 'правильный ответ продублирован в wrong');
      if (new Set(ex.wrong).size !== ex.wrong?.length) err(w, 'повторы среди неверных вариантов');
    });
  });
}

// dialogs
const dialogs = json('data/dialogs.json');
if (dialogs) {
  if (!str(dialogs.learner)) err('dialogs.json', 'нужно поле learner');
  const ids = new Set();
  dialogs.dialogs.forEach((d) => {
    const where = `dialogs.json → ${d.id}`;
    if (ids.has(d.id)) err(where, 'повторяющийся id');
    ids.add(d.id);
    if (!d.lines?.some((l) => l.who === dialogs.learner)) err(where, 'нет реплик ученика');
    d.lines?.forEach((l, i) => { if (!str(l.who) || !str(l.pt) || !str(l.ru)) err(where, `реплика ${i + 1}: нужны who, pt, ru`); });
  });
}

// cheat
const cheat = json('data/cheat.json');
if (cheat) {
  cheat.groups.forEach((g) => g.items.forEach((i) => {
    if (!str(i.pt) || !str(i.ru)) err(`cheat.json → ${g.title}`, 'нужны pt и ru');
  }));
}

// sw.js: все файлы оболочки существуют, а все JS-модули есть в списке
const sw = read('sw.js');
const core = [...sw.matchAll(/^\s*'([^']+)',?$/gm)].map((m) => m[1]).filter((p) => p !== './');
core.forEach((p) => { if (!existsSync(join(ROOT, p))) err('sw.js', `в CORE указан несуществующий файл ${p}`); });
const modules = readdirSync(join(ROOT, 'assets/js'), { recursive: true })
  .filter((f) => f.endsWith('.js'))
  .map((f) => `assets/js/${f.split('\\').join('/')}`);
modules.forEach((m) => { if (!core.includes(m)) err('sw.js', `модуль ${m} не добавлен в CORE — офлайн он не загрузится`); });

if (errors.length) {
  console.error(`Найдено ошибок: ${errors.length}\n` + errors.map((e) => ' • ' + e).join('\n'));
  process.exit(1);
}
const words = vocab.topics.reduce((n, t) => n + t.items.length, 0);
console.log(`OK: ${plan.weeks.length} недель, ${topicIds.size} тем лексики (${words} фраз), ` +
  `${grammar.units.length} тем грамматики, ${dialogs.dialogs.length} диалогов.`);
