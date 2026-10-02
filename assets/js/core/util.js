export const $ = (id) => document.getElementById(id);

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Португальская фраза, по нажатию на которую включается озвучка.
export const pt = (text, role) =>
  `<span class="pt"${role ? ` data-role="${role}"` : ''}>${text}</span>`;

// Разметка контента: [[фраза]] превращается в озвучиваемую фразу.
// Контент берётся из файлов репозитория и считается доверенным HTML.
export const markup = (html) => html.replace(/\[\[(.+?)\]\]/g, (_, t) => pt(t));

// Сообщает остальным частям страницы, что прогресс изменился.
export const emitProgress = () => document.dispatchEvent(new Event('pdv:progress'));

export const SPEAKER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';

export const sayButton = (text, role) =>
  `<button class="say" data-say="${esc(text)}"${role ? ` data-role="${role}"` : ''} aria-label="Озвучить: ${esc(text)}">${SPEAKER_ICON}</button>`;
