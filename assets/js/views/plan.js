import { $, esc, emitProgress } from '../core/util.js';
import { store } from '../core/store.js';

export function initPlan({ weeks }) {
  const root = $('plan-weeks');
  const done = new Set(store.get('plan', []));

  function render() {
    let n = 0;
    root.innerHTML = weeks.map((w, wi) => {
      const first = n + 1;
      const rows = w.days.map((d) => {
        n++;
        const ok = done.has(n);
        return `<label class="day${ok ? ' done' : ''}"><input type="checkbox" data-day="${n}"${ok ? ' checked' : ''}>` +
          `<span class="n">День ${n}</span><span class="t">${esc(d)}</span></label>`;
      }).join('');
      const cnt = w.days.filter((_, i) => done.has(first + i)).length;
      const pct = (cnt / w.days.length) * 100;
      return `<div class="week"><header><h3>Неделя ${wi + 1}. ${esc(w.title)}</h3>` +
        `<span class="wk">${cnt} из ${w.days.length}</span><div class="bar"><i style="width:${pct}%"></i></div></header>${rows}</div>`;
    }).join('');
  }

  root.addEventListener('change', (e) => {
    const id = Number(e.target.dataset.day);
    if (!id) return;
    if (e.target.checked) done.add(id); else done.delete(id);
    store.set('plan', [...done]);
    render();
    emitProgress();
  });

  render();
}
