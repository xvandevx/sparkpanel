import { createHash } from 'crypto';

/**
 * Логотип панели — картинка в самой настройке `logo`, адресом data URI
 * (`data:image/png;base64,…`). Не файл в хранилище: копия сайта уносит базу
 * без файлов, и логотип из хранилища после восстановления пропал бы; да и
 * выбранное для файлов хранилище к логотипу панели отношения не имеет.
 *
 * Чистые функции: разобрать, проверить, сказать адрес. Ни базы, ни Nest.
 */

/** Какие картинки принимаем — то, что браузер рисует в `<img>`. */
export const LOGO_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Логотип отдаётся с каждым экраном входа — тяжёлый незачем. */
export const MAX_LOGO_SIZE = 512 * 1024;

/** Адрес картинки логотипа; её отдаёт `GET /api/settings/logo`. */
export const LOGO_PATH = '/api/settings/logo';

export interface Logo {
  mimeType: string;
  body: Buffer;
}

/** Картинка из data URI; не data URI или не base64 — null. */
export const parseLogo = (value: string): Logo | null => {
  const match = /^data:([\w.+-]+\/[\w.+-]+);base64,([A-Za-z0-9+/]*={0,2})$/.exec(value);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), body: Buffer.from(match[2], 'base64') };
};

/** Что не так с присланным логотипом; всё в порядке — null. */
export const logoProblem = (value: string): string | null => {
  const logo = parseLogo(value);
  if (!logo || logo.body.length === 0) return 'Логотип не прочитался: пришлите картинку файлом';
  if (!LOGO_TYPES[logo.mimeType]) return 'Логотип — картинка PNG, JPEG, WebP, GIF или SVG';
  if (logo.body.length > MAX_LOGO_SIZE) return 'Логотип больше 512 КБ';
  return null;
};

/**
 * Версия логотипа — по содержимому. Она стоит в адресе (`?v=…`): браузер
 * держит картинку в кэше сколько угодно, а сменили логотип — сменился адрес.
 */
export const logoVersion = (value: string): string =>
  createHash('sha1').update(value).digest('hex').slice(0, 12);

/** Адрес логотипа для браузера; своего нет — пусто, панель рисует SparkPanel. */
export const logoUrlOf = (value: string): string =>
  value ? `${LOGO_PATH}?v=${logoVersion(value)}` : '';
