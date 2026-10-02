import { $, esc } from '../core/util.js';
import { store } from '../core/store.js';

export const TABS = [
  ['plan', 'План'], ['grammar', 'Грамматика'], ['vocab', 'Лексика'], ['dialogs', 'Диалоги'],
  ['cards', 'Карточки'], ['quiz', 'Тест'], ['cheat', 'Шпаргалка'],
];

// Вкладки синхронизированы с адресом: /#grammar можно открыть напрямую или отправить ссылкой.
export function initTabs() {
  const list = $('tablist');
  list.innerHTML = TABS.map(([id, name]) =>
    `<button class="tab" role="tab" data-tab="${id}" aria-controls="${id}">${esc(name)}</button>`).join('');

  const open = (id, { scroll = false } = {}) => {
    if (!TABS.some(([t]) => t === id)) id = 'plan';
    TABS.forEach(([t]) => { $(t).hidden = t !== id; });
    list.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    store.set('tab', id);
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (scroll) window.scrollTo({ top: document.querySelector('nav.tabs').offsetTop });
  };

  list.addEventListener('click', (e) => {
    const b = e.target.closest('.tab');
    if (b) open(b.dataset.tab, { scroll: true });
  });
  window.addEventListener('hashchange', () => open(location.hash.slice(1)));
  open(location.hash.slice(1) || store.get('tab', 'plan'));
}
