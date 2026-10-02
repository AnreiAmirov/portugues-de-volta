import { $ } from '../core/util.js';
import { store } from '../core/store.js';
import { cardKey } from './cards.js';

export function initStats({ weeks }, words) {
  const totalDays = weeks.reduce((n, w) => n + w.days.length, 0);
  const keys = new Set(words.map(cardKey));
  const update = () => {
    $('st-days').textContent = `${store.get('plan', []).length}/${totalDays}`;
    $('st-cards').textContent = `${store.get('known', []).filter((k) => keys.has(k)).length}/${words.length}`;
    const best = store.get('best', null);
    $('st-best').textContent = best === null ? '—' : `${best}%`;
  };
  document.addEventListener('pdv:progress', update);
  update();
}
