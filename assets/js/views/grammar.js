import { $, esc, shuffle, markup, pt } from '../core/util.js';
import { loadText } from '../core/data.js';

export const exerciseHTML = (ex) => {
  const options = shuffle([ex.a, ...ex.wrong]);
  return `<div class="q"><p>${esc(ex.q)}</p><div class="opts">${options.map((o) =>
    `<button class="opt" data-c="${o === ex.a ? 1 : 0}">${esc(o)}</button>`).join('')}</div></div>`;
};

const razborHTML = (r) =>
  `<div class="razbor"><div class="s">${pt(r.s)}</div><div class="ru">${r.ru}</div>` +
  `<ul>${r.points.map((p) => `<li>${markup(p)}</li>`).join('')}</ul></div>`;

export function initGrammar({ units }) {
  const root = $('grammar-units');
  root.innerHTML = units.map((u, i) => `
    <details class="unit" data-i="${i}">
      <summary><span class="num">${i + 1}</span><span class="ttl">${esc(u.title)}</span><span class="wkt">Неделя ${u.week}</span></summary>
      <div class="ubody"><p class="loading">Загружаю тему…</p></div>
    </details>`).join('');

  // Тексты тем подгружаются при первом открытии — страница стартует быстрее.
  root.addEventListener('toggle', async (e) => {
    const det = e.target;
    if (!det.open || det.dataset.loaded) return;
    det.dataset.loaded = '1';
    const u = units[Number(det.dataset.i)];
    const box = det.querySelector('.ubody');
    try {
      const body = await loadText('data/grammar/' + u.file);
      const razbors = u.razbors?.length
        ? `<h4 class="rz">${esc(u.razborTitle || 'Разборы')}</h4>${u.razbors.map(razborHTML).join('')}` : '';
      box.innerHTML = markup(body) + razbors +
        `<div class="ex-list"><h4>Проверь себя</h4>${u.exercises.map(exerciseHTML).join('')}</div>`;
    } catch (err) {
      delete det.dataset.loaded;
      box.innerHTML = `<p class="fatal">Не удалось загрузить тему: ${esc(err.message)}. Проверьте соединение и откройте тему ещё раз.</p>`;
    }
  }, true);

  root.addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b || b.disabled) return;
    const box = b.closest('.opts');
    box.querySelectorAll('.opt').forEach((o) => {
      o.disabled = true;
      if (o.dataset.c === '1') o.classList.add('ok');
    });
    if (b.dataset.c !== '1') b.classList.add('no');
  });
}
