// Точка входа: загружает данные курса и подключает разделы страницы.
import { $, esc } from './core/util.js';
import { loadCourse } from './core/data.js';
import { initSpeech, speak } from './core/speech.js';
import { registerServiceWorker } from './core/offline.js';
import { initTabs } from './views/tabs.js';
import { initSettings } from './views/settings.js';
import { initPlan } from './views/plan.js';
import { initGrammar } from './views/grammar.js';
import { initVocab } from './views/vocab.js';
import { initDialogs } from './views/dialogs.js';
import { initCards } from './views/cards.js';
import { initQuiz } from './views/quiz.js';
import { initCheat } from './views/cheat.js';
import { initStats } from './views/stats.js';

// Любая .pt-фраза и кнопка озвучки на странице.
document.addEventListener('click', (e) => {
  const el = e.target.closest('.pt, .say');
  if (!el) return;
  speak(el.dataset.say || el.textContent, { role: el.dataset.role || 'main' });
});

async function start() {
  initTabs();
  let course;
  try {
    [course] = await Promise.all([loadCourse(), initSpeech()]);
  } catch (err) {
    const local = location.protocol === 'file:';
    $('plan-weeks').innerHTML = `<div class="fatal"><p><b>Не удалось загрузить курс.</b> ${esc(err.message)}</p>` +
      (local ? '<p>Страница открыта как файл. Запустите локальный сервер в папке проекта: <code>python3 -m http.server 8000</code> и откройте <code>http://localhost:8000</code>.</p>'
        : '<p>Проверьте соединение и обновите страницу.</p>') + '</div>';
    return;
  }
  const { plan, vocab, grammar, dialogs, cheat } = course;
  const words = vocab.topics.flatMap((t) => t.items.map((it) => ({ ...it, topic: t.id })));

  initSettings();
  initPlan(plan);
  initGrammar(grammar);
  initVocab(vocab);
  initDialogs(dialogs);
  initCards(vocab, words);
  initQuiz(vocab, words, grammar);
  initCheat(cheat);
  initStats(plan, words);
  registerServiceWorker();
}

start();
