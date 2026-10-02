// Корень сайта вычисляется от расположения модуля, поэтому сайт работает
// и на username.github.io, и в подпапке username.github.io/repo/.
export const ROOT = new URL('../../../', import.meta.url);
export const url = (path) => new URL(path, ROOT).href;
