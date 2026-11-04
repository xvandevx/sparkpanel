/**
 * Значение поля «Файл» и «Изображение». Каждый пункт — либо номер своего
 * файла (лежит в «Файлах»), либо адрес внешнего (`https://…`, файл на чужом
 * сервере: так приходят картинки со старого сайта, без перекачки к себе).
 * У множественного свойства их можно смешивать. Чистые функции — без React.
 */

/** Пункт значения: номер своего файла или адрес внешнего. */
export type FileItem = number | string;

/** Предел длины адреса — тот же, что у сервера. */
const EXTERNAL_URL_MAX_LENGTH = 2000;
const EXTERNAL_URL_PATTERN = /^https?:\/\/[^\s/?#]+\S*$/i;

/** Внешний ли это файл — адрес http(s). */
export const isExternalUrl = (value: unknown): value is string =>
  typeof value === 'string' &&
  value.length <= EXTERNAL_URL_MAX_LENGTH &&
  EXTERNAL_URL_PATTERN.test(value);

/** Имя внешнего файла — последний кусок пути адреса, без запроса. */
export function externalFileName(url: string): string {
  const path = url.replace(/[?#].*$/, '').replace(/\/+$/, '');
  const name = path.slice(path.lastIndexOf('/') + 1);
  try {
    return decodeURIComponent(name) || url;
  } catch {
    return name || url;
  }
}

/** Сайт, с которого внешний файл: по нему видно, что он не наш. */
export const externalHost = (url: string): string => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

/** Пункты значения, сколько бы их ни было: одиночное тоже списком. */
export const fileItemsOf = (value: unknown): FileItem[] =>
  (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value]).flatMap(
    (item): FileItem[] => {
      if (isExternalUrl(item)) return [item];
      const id = Number(item);
      return Number.isInteger(id) && id > 0 ? [id] : [];
    },
  );

/** Номера своих файлов в значении — их отмечает выбор из загруженных. */
export const fileIdsOf = (items: FileItem[]): number[] =>
  items.filter((item): item is number => typeof item === 'number');

/** Значение поля из пунктов: у одиночного — последний, пусто — null. */
const valueOf = (items: FileItem[], isMultiple: boolean): FileItem | FileItem[] | null =>
  isMultiple ? items : (items[items.length - 1] ?? null);

/** Добавить пункты без повторов; одиночному полю — последний из добавленных. */
export const addFileItems = (items: FileItem[], added: FileItem[], isMultiple: boolean) =>
  valueOf(isMultiple ? [...items, ...added.filter((item) => !items.includes(item))] : added, isMultiple);

/** Убрать пункт. */
export const removeFileItem = (items: FileItem[], item: FileItem, isMultiple: boolean) =>
  valueOf(
    items.filter((other) => other !== item),
    isMultiple,
  );

/**
 * Поставить пункт на место другого — «Заменить ссылку», «Забрать
 * в хранилище»: файл остаётся на своём месте в порядке значений. Новый
 * пункт уже есть в значении — прежний просто уходит.
 */
export const replaceFileItem = (items: FileItem[], from: FileItem, to: FileItem, isMultiple: boolean) =>
  valueOf(
    items.flatMap((item) => (item !== from ? [item] : items.includes(to) ? [] : [to])),
    isMultiple,
  );
