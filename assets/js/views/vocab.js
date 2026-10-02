import { $, esc, sayButton } from '../core/util.js';

export function initVocab({ topics }) {
  let current = topics[0].id;

  function render() {
    $('vocab-chips').innerHTML = topics.map((t) =>
      `<button class="chip" data-t="${t.id}" aria-pressed="${t.id === current}">${esc(t.name)}</button>`).join('');
    const t = topics.find((x) => x.id === current);
    $('vocab-note').innerHTML = t.note ? `<div class="note">${esc(t.note)}</div>` : '';
    $('vocab-list').innerHTML = t.items.map((it) =>
      `<div class="vrow"><span class="p">${esc(it.pt)}</span>` +
      `<span class="r">${esc(it.ru)}${it.note ? `<small>${esc(it.note)}</small>` : ''}</span>${sayButton(it.pt)}</div>`).join('');
  }

  $('vocab-chips').addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (c) { current = c.dataset.t; render(); }
  });
  render();
}
