import { $, esc, shuffle, emitProgress } from '../core/util.js';
import { store } from '../core/store.js';
import { speak } from '../core/speech.js';

const ROUND = 10;

export function initQuiz({ topics }, words, { units }) {
  const modeSel = $('quiz-mode');
  const topicSel = $('quiz-topic');
  const box = $('quiz-box');
  const grammarQs = units.flatMap((u, i) => u.exercises.map((ex) => ({ ...ex, unit: i })));
  let qs = [];
  let idx = 0;
  let score = 0;
  let wrong = [];

  function fillTopics() {
    topicSel.innerHTML = '<option value="all">Все темы</option>' + (modeSel.value === 'gram'
      ? units.map((u, i) => `<option value="${i}">${i + 1}. ${esc(u.title)}</option>`).join('')
      : topics.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join(''));
  }

  function makeRound() {
    const mode = modeSel.value;
    const t = topicSel.value;
    if (mode === 'gram') {
      return shuffle(grammarQs.filter((x) => t === 'all' || x.unit === Number(t))).slice(0, ROUND)
        .map((x) => ({ q: x.q, a: x.a, opts: shuffle([x.a, ...x.wrong]), say: null }));
    }
    const toPt = mode === 'ru2pt';
    return shuffle(words.filter((w) => t === 'all' || w.topic === t)).slice(0, ROUND).map((w) => {
      const same = words.filter((x) => x.topic === w.topic && x.pt !== w.pt);
      const pool = same.length >= 3 ? same : words.filter((x) => x.pt !== w.pt);
      const distractors = shuffle(pool).slice(0, 3).map((d) => (toPt ? d.pt : d.ru));
      const answer = toPt ? w.pt : w.ru;
      return { q: toPt ? w.ru : w.pt, a: answer, opts: shuffle([answer, ...distractors]), say: w.pt };
    });
  }

  function finish() {
    const pct = Math.round((score / qs.length) * 100);
    store.set('best', Math.max(store.get('best', 0), pct));
    emitProgress();
    const verdict = pct >= 85 ? 'Отличный уровень для поездки.'
      : pct >= 60 ? 'Хорошая база, повтори ошибки ниже.' : 'Вернись к карточкам по этой теме и попробуй снова.';
    box.innerHTML = `<div class="score">${pct}%</div><p>${score} из ${qs.length} верно. ${verdict}</p>` +
      (wrong.length ? '<h3 style="font-size:16px;margin:18px 0 8px">Ошибки</h3>' +
        wrong.map((w) => `<div class="vrow"><span class="r">${esc(w.q)}</span><span class="p">${esc(w.a)}</span></div>`).join('') : '') +
      '<p><button class="btn primary" id="quiz-again">Ещё раунд</button></p>';
    $('quiz-again').addEventListener('click', start);
  }

  function showQ() {
    if (idx >= qs.length) { finish(); return; }
    const x = qs[idx];
    box.innerHTML = `<div class="meta" style="text-align:left">Вопрос ${idx + 1} из ${qs.length}</div>` +
      `<div class="quiz-q">${esc(x.q)}</div><div class="quiz-opts">` +
      x.opts.map((o, i) => `<button class="opt" data-i="${i}">${esc(o)}</button>`).join('') +
      '</div><p><button class="btn" id="quiz-next" hidden>Дальше</button></p>';
    box.querySelectorAll('.quiz-opts .opt').forEach((b) => b.addEventListener('click', () => {
      const chosen = x.opts[Number(b.dataset.i)];
      box.querySelectorAll('.quiz-opts .opt').forEach((o) => {
        o.disabled = true;
        if (x.opts[Number(o.dataset.i)] === x.a) o.classList.add('ok');
      });
      if (chosen === x.a) score++; else { b.classList.add('no'); wrong.push(x); }
      if (x.say) speak(x.say);
      const next = $('quiz-next');
      next.hidden = false;
      next.focus();
      next.addEventListener('click', () => { idx++; showQ(); });
    }));
  }

  function start() {
    qs = makeRound();
    idx = 0; score = 0; wrong = [];
    if (!qs.length) { box.textContent = 'В этой теме нет вопросов.'; return; }
    showQ();
  }

  modeSel.addEventListener('change', fillTopics);
  $('quiz-start').addEventListener('click', start);
  fillTopics();
}
