import { $, esc, shuffle, emitProgress } from '../core/util.js';
import { store } from '../core/store.js';
import { speak } from '../core/speech.js';

export const cardKey = (w) => `${w.topic}|${w.pt}`;

export function initCards({ topics }, words) {
  const known = new Set(store.get('known', []));
  const topicSel = $('card-topic');
  const dirSel = $('card-dir');
  let deck = [];
  let flipped = false;

  topicSel.innerHTML = '<option value="all">Все темы</option>' +
    topics.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('');

  const inTopic = (w) => topicSel.value === 'all' || w.topic === topicSel.value;
  const save = () => { store.set('known', [...known]); emitProgress(); };

  function build() {
    deck = shuffle(words.filter((w) => inTopic(w) && !known.has(cardKey(w))));
    flipped = false;
    show();
  }

  function show() {
    const front = $('card-front');
    const back = $('card-back');
    const hint = $('card-hint');
    const total = words.filter(inTopic).length;
    $('card-meta').textContent = `Осталось в колоде: ${deck.length}. Выучено в теме: ${total - deck.length} из ${total}.`;
    if (!deck.length) {
      front.textContent = 'Тема выучена!';
      back.hidden = true;
      hint.textContent = 'выбери другую тему или сбрось выученные';
      return;
    }
    const c = deck[0];
    const ruFirst = dirSel.value === 'ru';
    front.textContent = ruFirst ? c.ru : c.pt;
    back.textContent = ruFirst ? c.pt : c.ru;
    back.hidden = !flipped;
    hint.textContent = flipped ? (c.note || '') : 'нажми, чтобы увидеть ответ';
    if (flipped && ruFirst) speak(c.pt);
  }

  const flip = () => { if (deck.length) { flipped = !flipped; show(); } };
  $('card').addEventListener('click', flip);
  $('card').addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); }
  });
  $('card-know').addEventListener('click', () => {
    if (!deck.length) return;
    known.add(cardKey(deck.shift()));
    flipped = false;
    save();
    show();
  });
  $('card-again').addEventListener('click', () => {
    if (!deck.length) return;
    deck.push(deck.shift());
    flipped = false;
    show();
  });
  $('card-say').addEventListener('click', () => { if (deck.length) speak(deck[0].pt); });
  $('card-reset').addEventListener('click', () => {
    words.filter(inTopic).forEach((w) => known.delete(cardKey(w)));
    save();
    build();
  });
  topicSel.addEventListener('change', build);
  dirSel.addEventListener('change', () => { flipped = false; show(); });
  build();
}
