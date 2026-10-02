import { $, esc } from '../core/util.js';
import * as speech from '../core/speech.js';
import { cacheAudio, countCached } from '../core/offline.js';

const TEST_PHRASE = 'Olá! Tudo bem? Eu queria uma mesa para cinco, por favor.';

export function initSettings() {
  const voiceSel = $('voice');
  const rateSel = $('rate');
  const status = $('voice-status');
  const offlineBtn = $('audio-offline');

  function renderVoices() {
    const opts = speech.voiceOptions();
    if (!opts.length) {
      voiceSel.innerHTML = '<option>португальский голос не найден</option>';
      voiceSel.disabled = true;
    } else {
      voiceSel.disabled = false;
      voiceSel.innerHTML = opts.map((o) =>
        `<option value="${esc(o.value)}"${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`).join('');
    }
    const q = speech.voiceQuality();
    status.textContent = q === 'none' ? 'Установите голос «Португальский (Бразилия)» — инструкция ниже.'
      : q === 'basic' ? 'Доступны только базовые голоса — см. подсказку ниже.' : '';
  }

  async function renderOffline() {
    const files = speech.audioFiles();
    if (!files.length || !('caches' in window)) { offlineBtn.hidden = true; return; }
    offlineBtn.hidden = false;
    const cached = await countCached(files);
    offlineBtn.textContent = cached === files.length ? 'Озвучка сохранена офлайн' : 'Скачать озвучку для офлайна';
    offlineBtn.disabled = cached === files.length;
  }

  voiceSel.addEventListener('change', () => { speech.setVoice(voiceSel.value); renderVoices(); speech.speak(TEST_PHRASE); });
  rateSel.value = speech.getSpeed();
  rateSel.addEventListener('change', () => speech.setSpeed(rateSel.value));
  $('voice-test').addEventListener('click', () => speech.speak(TEST_PHRASE));
  offlineBtn.addEventListener('click', async () => {
    offlineBtn.disabled = true;
    const { total, failed } = await cacheAudio(speech.audioFiles(), (done, all) => {
      offlineBtn.textContent = `Скачиваю озвучку: ${done} из ${all}`;
    });
    status.textContent = failed ? `Не скачалось ${failed} из ${total} записей — попробуйте ещё раз при хорошем интернете.` : '';
    renderOffline();
  });

  speech.onVoicesChanged(renderVoices);
  renderVoices();
  renderOffline();
}
