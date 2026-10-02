import { $, esc, pt } from '../core/util.js';

export function initCheat({ emergency, groups }) {
  $('emerg').innerHTML = emergency.map((e) => `<div><b>${esc(e.number)}</b>${esc(e.label)}</div>`).join('');
  $('cheat-grid').innerHTML = groups.map((g) =>
    `<div class="box"><h3>${esc(g.title)}</h3><ul>${g.items.map((i) =>
      `<li>${pt(esc(i.pt))}<br><span>${esc(i.ru)}</span></li>`).join('')}</ul></div>`).join('');
}
