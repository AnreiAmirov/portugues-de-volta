import { url } from './paths.js';

async function get(path, as) {
  const res = await fetch(url(path));
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return as === 'text' ? res.text() : res.json();
}

export const loadJSON = (path) => get(path, 'json');
export const loadText = (path) => get(path, 'text');

export async function loadCourse() {
  const [plan, vocab, grammar, dialogs, cheat] = await Promise.all([
    loadJSON('data/plan.json'),
    loadJSON('data/vocab.json'),
    loadJSON('data/grammar/index.json'),
    loadJSON('data/dialogs.json'),
    loadJSON('data/cheat.json'),
  ]);
  return { plan, vocab, grammar, dialogs, cheat };
}
