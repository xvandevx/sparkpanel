/**
 * Как браузер должен обойтись с файлом: показать или скачать.
 *
 * Встроенное хранилище отдаётся с того же origin, что и панель (`/uploads/...`,
 * `storage/serve-uploads.ts`) —
 * это нужно, чтобы не заводить второй домен и CORS. Плата за это: открытый в
 * адресной строке `.html` или `.svg` выполнился бы как страница панели, рядом с
 * cookie сессии. Поэтому показываем только то, что заведомо не исполняется,
 * а остальное отдаём вложением: браузер такой файл скачивает, а не открывает.
 *
 * На превью в админке это не влияет: `<img src>` рисует картинку независимо
 * от Content-Disposition.
 */

/** Типы, которые браузер рисует, но не исполняет. SVG сюда не входит: в нём бывает скрипт. */
const INLINE_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/pjpeg',
  'image/gif',
  'image/webp',
  'image/avif',
  'image/bmp',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/tiff',
  'application/pdf',
]);

/** Целые семейства, которые браузер проигрывает плеером, а не исполняет. */
const INLINE_PREFIXES = ['video/', 'audio/'];

export const isInlineMime = (mimeType: string): boolean =>
  INLINE_MIME.has(mimeType) || INLINE_PREFIXES.some((prefix) => mimeType.startsWith(prefix));

/**
 * Значение заголовка Content-Disposition для объекта в хранилище.
 * Имя файла даём обоими способами: `filename` для старых клиентов (только ASCII)
 * и `filename*` по RFC 5987 — с кириллицей и пробелами.
 */
export const contentDisposition = (mimeType: string, name: string): string => {
  const kind = isInlineMime(mimeType) ? 'inline' : 'attachment';
  const safe = asciiName(name);

  return `${kind}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(name)}`;
};

/**
 * Имя для ASCII-варианта: всё за пределами печатной латиницы заменяем на `_`.
 * Кавычки, переводы строк и точку с запятой — тем более: иначе имя файла
 * разломало бы сам заголовок.
 */
const asciiName = (name: string): string => {
  const cleaned = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\;\r\n]/g, '_');
  return cleaned.trim() || 'file';
};
