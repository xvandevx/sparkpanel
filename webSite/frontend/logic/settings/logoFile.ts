/**
 * Логотип с диска — в картинку data URI: так он уходит в настройках обычным
 * `PATCH`, вместе с остальным, и так же показывается в форме до сохранения.
 * Те же пределы проверяет сервер (`settings/logo.ts`); здесь — чтобы
 * не гонять полмегабайта ради отказа.
 */

/** Какие картинки принимает сервер; строка — для `accept` у выбора файла. */
export const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

const MAX_LOGO_SIZE = 512 * 1024;

/** Что не так с файлом логотипа; подходит — null. */
export const logoFileProblem = (file: File): string | null => {
  if (!LOGO_ACCEPT.split(',').includes(file.type)) {
    return 'Логотип — картинка PNG, JPEG, WebP, GIF или SVG';
  }
  if (file.size > MAX_LOGO_SIZE) return 'Логотип больше 512 КБ';
  return null;
};

/** Содержимое файла адресом data URI. */
export const readLogo = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
