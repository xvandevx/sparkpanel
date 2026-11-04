import type {
  EditorProperty,
  EditorTableColumn,
} from '../../../../redux/reducers/contentEditorNewReducer';
import { formatDateTime } from '../../../../logic/dateFormat';
import type { EditorColumn, EditorColumns, EditorRow } from '../ContentEditorTable';

/**
 * Вид таблицы: из колонок раздела, свойств записей и того, что сохранил
 * пользователь, — колонки, которые таблица рисует, и черновик шторки.
 *
 * По умолчанию видны колонки раздела в его порядке, свойства спрятаны.
 * Сохранённый вид — это видимые колонки по порядку: чего в нём нет, того
 * не видно. Колонку, которой больше нет (раздел её убрал, свойство удалили),
 * вид пропускает — она просто не рисуется.
 *
 * Чистые функции: ни React, ни стора.
 */

/**
 * Колонка, которую можно показать: колонка раздела или свойство записей —
 * ровно одно из двух. По `property` таблица и решает, как рисовать ячейку.
 */
export type TableColumn = {
  /** Поле записи (`name`) или свойство (`property-12`) */
  key: string;
  /** Заголовок колонки */
  name: string;
  /** Ширина, px; у главной колонки — наименьшая, остальные держат её точно */
  width: number;
} & (
  | { column: EditorColumn; property?: undefined }
  | { property: EditorProperty; column?: undefined }
);

/**
 * Текст ячейки колонки раздела: своя логика колонки, а без неё — значение поля
 * записи. По нему таблица ищет и сортирует, а фильтр отбирает: что видно в ячейке,
 * то и находится. Ссылки из логики — их текстом через «; ».
 */
export const cellText = (
  key: string,
  column: EditorColumn,
  row: EditorRow,
  rows: EditorRow[],
): string => {
  if (!column.logic) return String(row[key] ?? '');
  const value = column.logic(row, rows);
  return typeof value === 'string' ? value : value.map((link) => link.text).join('; ');
};

/**
 * Ключ колонки свойства — номер свойства с приставкой, как и у поля
 * в карточке: код у свойства правят, а колонка должна остаться на месте.
 */
export const propertyColumnKey = (propertyId: number): string => `property-${propertyId}`;

/** Ключ колонки номера записи — поле `id`, оно есть у записи любого списка. */
export const ID_COLUMN_KEY = 'id';

/**
 * Номер записи — колонка любой таблицы: раздел её не описывает. По умолчанию
 * видна первой, но её, как и остальные, прячут, переставляют и меняют ей ширину
 * в «Колонках таблицы».
 */
const ID_COLUMN: EditorColumn = { name: 'ID', size: 80, isSort: true };

/**
 * Ширина колонки, которой её не задали: свойства и колонки раздела без `size`.
 * Без ширины колонку при нехватке места сжимало бы до буквы в строке —
 * а так таблица не сжимается, а прокручивается вбок.
 */
export const DEFAULT_COLUMN_WIDTH = 160;

/**
 * Даты записи — тоже колонки любой таблицы: `createdAt` и `updatedAt` сервер
 * отдаёт у записи каждого списка, «Изменено» — с правкой свойств. Встают
 * после колонок раздела; свою колонку с тем же ключом раздел описывает сам
 * («Загружен» у файлов) — тогда она вместо системной. Сортирует сервер
 * по самому полю: дата в ISO идёт в том же порядке, что и в ячейке.
 */
const DATE_COLUMNS: EditorColumns = {
  createdAt: { name: 'Создано', size: 150, isSort: true, logic: (row) => formatDateTime(row.createdAt) },
  updatedAt: { name: 'Изменено', size: 150, isSort: true, logic: (row) => formatDateTime(row.updatedAt) },
};

/**
 * Главная колонка — первая видимая после номера, обычно название. В ней ветки
 * дерева и ссылка в запись, и она одна «резиновая»: забирает свободное место,
 * а её ширина — наименьшая: уже неё колонку не сожмёт, таблица прокрутится
 * вбок (`tableScrollWidth`). Остальные держат свою ширину точно — при раскладке
 * `fixed` с шириной у всех браузер раздал бы лишнее место всем поровну, и узкие
 * колонки (галочки, ID) расползались бы. Превью (`isPreview`) главной не бывает: квадрат на 72 px,
 * растянутый на пол-экрана, — пустая колонка; главной тогда становится следующая.
 */
export const mainColumnKey = (keys: string[], columns: EditorColumns): string | null =>
  keys.find((key) => key !== ID_COLUMN_KEY && columns[key]?.isPreview !== true) ?? null;

/**
 * Все колонки, из которых выбирают: сначала номер записи, за ним колонки раздела
 * в его порядке, даты записи, за ними свойства — в порядке их сортировки.
 * Ширина здесь — по умолчанию.
 */
export const availableColumns = (
  columns: EditorColumns,
  properties: EditorProperty[],
): TableColumn[] => [
  { key: ID_COLUMN_KEY, name: ID_COLUMN.name, width: ID_COLUMN.size ?? DEFAULT_COLUMN_WIDTH, column: ID_COLUMN },
  ...Object.entries({ ...columns, ...withoutKeys(DATE_COLUMNS, columns) }).map(([key, column]) => ({
    key,
    name: column.name,
    width: column.size ?? DEFAULT_COLUMN_WIDTH,
    column,
  })),
  ...properties.map((property) => ({
    key: propertyColumnKey(property.id),
    name: property.name,
    width: DEFAULT_COLUMN_WIDTH,
    property,
  })),
];

/**
 * Ширина таблицы, уже которой она не сжимается, а прокручивается вбок: все
 * колонки своей ширины, главная — наименьшей, плюс служебные (галочки,
 * действия). Шире экран — свободное место забирает главная колонка.
 */
export const tableScrollWidth = (shown: TableColumn[], serviceWidth: number): number =>
  shown.reduce((sum, item) => sum + item.width, serviceWidth);

/** Колонки, ключей которых нет в `taken`. */
const withoutKeys = (columns: EditorColumns, taken: EditorColumns): EditorColumns =>
  Object.fromEntries(Object.entries(columns).filter(([key]) => !(key in taken)));

/**
 * Колонки таблицы слева направо. Не настраивали — колонки раздела. Из
 * сохранённых не осталось ни одной — тоже они: таблица из одних значков
 * действий ни о чём не говорит.
 */
export const shownColumns = (
  available: TableColumn[],
  saved: EditorTableColumn[],
): TableColumn[] => {
  const byKey = new Map(available.map((item) => [item.key, item]));
  const shown = saved.flatMap((view) => {
    const item = byKey.get(view.key);
    return item ? [{ ...item, width: view.width ?? item.width }] : [];
  });
  return shown.length > 0 ? shown : available.filter((item) => item.column !== undefined);
};

/** Строка шторки: колонка, видна ли она и какой ширины. */
export interface ColumnDraft {
  key: string;
  name: string;
  /** Колонка свойства — в шторке подписан его тип */
  property?: EditorProperty;
  isShown: boolean;
  /** Своя ширина, px; null — как задал раздел */
  width: number | null;
  /** Ширина раздела — подсказкой в пустом поле */
  defaultWidth: number;
}

/**
 * Черновик шторки: видимые колонки в своём порядке, за ними спрятанные.
 * Порядок строк и есть порядок колонок — галочка лишь решает, видна ли она.
 */
export const columnsDraft = (
  available: TableColumn[],
  saved: EditorTableColumn[],
): ColumnDraft[] => {
  const widthOf = new Map(saved.map((view) => [view.key, view.width]));
  const shownKeys = new Set(shownColumns(available, saved).map((item) => item.key));
  const byKey = new Map(available.map((item) => [item.key, item]));

  const row = (item: TableColumn, isShown: boolean): ColumnDraft => ({
    key: item.key,
    // У колонки-превью заголовка нет, но в шторке её надо как-то назвать
    name: item.name || (item.column?.isPreview ? 'Превью' : item.key),
    property: item.property,
    isShown,
    width: widthOf.get(item.key) ?? null,
    defaultWidth: item.width,
  });

  return [
    ...Array.from(shownKeys).map((key) => row(byKey.get(key) as TableColumn, true)),
    ...available.filter((item) => !shownKeys.has(item.key)).map((item) => row(item, false)),
  ];
};

/** Что из черновика уходит на сервер: видимые колонки по порядку. */
export const viewOf = (draft: ColumnDraft[]): EditorTableColumn[] =>
  draft.filter((item) => item.isShown).map(({ key, width }) => ({ key, width }));

/** Сдвинуть строку черновика на шаг вверх (-1) или вниз (+1). */
export const moveColumn = (draft: ColumnDraft[], index: number, step: -1 | 1): ColumnDraft[] => {
  const target = index + step;
  if (target < 0 || target >= draft.length) return draft;
  const next = [...draft];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};
