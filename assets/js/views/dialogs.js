import { $, esc, sayButton } from '../core/util.js';
import { speakSequence } from '../core/speech.js';

// Реплики ученика звучат вторым голосом ('alt'), собеседника — основным ('main').
export function initDialogs({ learner, dialogs }) {
  const root = $('dialog-list');
  const section = $('dialogs');
  const role = (l) => (l.who === learner ? 'alt' : 'main');

  root.innerHTML = dialogs.map((d, i) => `
    <details class="unit" id="dlg-${d.id}"><summary><span class="num">${i + 1}</span><span class="ttl">${esc(d.title)}</span></summary>
    <div class="ubody"><p><button class="btn small" data-play="${i}">Прослушать весь диалог</button></p>
    ${d.lines.map((l) => {
      const me = l.who === learner;
      return `<div class="line${me ? ' me' : ''}"><span class="who">${me ? 'Ты' : esc(l.who)}</span>` +
        `<div><div class="ptl">${esc(l.pt)}</div><div class="ru">${esc(l.ru)}</div></div>${sayButton(l.pt, role(l))}</div>`;
    }).join('')}
    </div></details>`).join('');

  root.addEventListener('click', (e) => {
    const p = e.target.closest('[data-play]');
    if (p) {
      speakSequence(dialogs[Number(p.dataset.play)].lines.map((l) => [l.pt, role(l)]));
      return;
    }
    const line = e.target.closest('.line.me');
    if (line && section.classList.contains('role-mode') && e.target.closest('.ptl')) line.classList.toggle('shown');
  });

  $('opt-role').addEventListener('change', (e) => {
    section.classList.toggle('role-mode', e.target.checked);
    root.querySelectorAll('.line.shown').forEach((l) => l.classList.remove('shown'));
  });
  $('opt-noru').addEventListener('change', (e) => section.classList.toggle('hide-ru', e.target.checked));
}
