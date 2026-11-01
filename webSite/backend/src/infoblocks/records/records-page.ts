import { BadRequestException } from '@nestjs/common';
import { PropertyType } from '../settings/properties/property';

/**
 * Страница записей списка для таблицы редактора контента: поиск, фильтр,
 * сортировка и сама страница — одним местом на все списки. Записи приходят
 * от сервиса своего раздела целиком, значения свойств — от `values/`;
 * здесь только отбор.
 *
 * Чистые функции: ни Nest, ни базы — правила проверяются тестом.
 *
 * Дерево страницей не рвётся: размер страницы у дерева — это число записей
 * верхнего уровня, и каждая приходит со всей своей веткой. Найденное поиском
 * или фильтром — плоским списком, как и показывает его таблица.
 */

/** Сколько записей на странице: выбор под таблицей. */
export const PAGE_SIZES = [20, 50, 100] as const;

/** Свойства записи адресуются в таблице и фильтре ключом с номером: `property-12`. */
const PROPERTY_PREFIX = 'property-';

/** Что выбирают в поле фильтра — тот же вид, что у поля на фронте. */
export enum FilterKind {
  /** Варианты: «Список», привязка, логическое поле записи */
  Options = 'options',
  /** Подстрока: строка, текст, HTML, текстовое поле записи */
  Text = 'text',
  /** Диапазон числа */
  Range = 'range',
  /** Заполнено или нет: файл, изображение, таблица */
  Filled = 'filled',
}

/** Поле фильтра и что в нём выбрано. */
export type RecordFilter = { key: string } & (
  | { kind: FilterKind.Options; codes: string[] }
  | { kind: FilterKind.Text; text: string }
  | { kind: FilterKind.Range; from: number | null; to: number | null }
  | { kind: FilterKind.Filled; isFilled: boolean }
);

/** Что просят у списка. */
export interface PageQuery {
  /** Номер страницы, с 1 */
  page: number;
  pageSize: number;
  /** Строка поиска; пусто — не ищем */
  search: string;
  /** Поля записи, по которым ищут подстроку; номер записи (ID) — всегда, целиком */
  searchIn: string[];
  /** Поле сортировки; null — порядок, в котором записи отдал раздел */
  sort: string | null;
  isDescending: boolean;
  /** Таблица показывает список деревом: страница — записи верхнего уровня с ветками */
  isTree: boolean;
  filters: RecordFilter[];
}

/** Свойство записи — то, что о нём нужно фильтру. */
export interface PageProperty {
  id: number;
  type: string;
  isMultiDomain?: boolean;
}

/** Значения свойств: ключ записи → номер свойства → значение. */
export type RecordValues = Map<string, Map<number, unknown>>;

/** Запись любого списка: номер, место в дереве и поля раздела. */
export interface PageRow {
  id: number | string;
  parentId?: number | string | null;
  [key: string]: unknown;
}

export interface RecordsPage<T> {
  items: T[];
  /** Сколько всего: у дерева — записей верхнего уровня, иначе — записей */
  total: number;
}

/**
 * «Изменено» записи — позднее из двух: правки самой записи (`updatedAt` её
 * раздела) и правки значений её свойств (`editedAt`, ключ записи → время).
 * Значения лежат отдельно от записи, и сохранение одних свойств строку
 * раздела не трогает — а у страниц почти всё и есть свойства.
 */
export function withEditedAt<T extends PageRow>(rows: T[], editedAt: Map<string, Date>): T[] {
  return rows.map((row) => {
    const edited = editedAt.get(String(row.id));
    if (edited === undefined) return row;
    const own = typeof row.updatedAt === 'string' ? new Date(row.updatedAt).getTime() : NaN;
    return Number.isNaN(own) || edited.getTime() > own ? { ...row, updatedAt: edited.toISOString() } : row;
  });
}

/** Черновик записи глазами страницы: изменённые поля и свойства. */
export interface PageDraft {
  recordId: string;
  fields: Record<string, unknown>;
  values: { propertyId: number; value: unknown }[];
}

/**
 * Записи и значения такими, какими их видит редактор, — с черновиками поверх:
 * ищут и сортируют по тому, что сейчас в карточке, а не по тому, что на сайте.
 * Номер и родителя черновик не меняет: номер у записи один, а дерево таблицы
 * строится по опубликованному — перенос в другую ветку случится с публикацией.
 */
export function withDrafts<T extends PageRow>(
  rows: T[],
  values: RecordValues,
  drafts: PageDraft[],
): { rows: T[]; values: RecordValues } {
  if (drafts.length === 0) return { rows, values };
  const byId = new Map(drafts.map((draft) => [draft.recordId, draft]));

  const drafted = rows.map((row) => {
    const draft = byId.get(String(row.id));
    if (!draft) return row;
    const fields = Object.entries(draft.fields).filter(([key]) => key !== 'id' && key !== 'parentId');
    return { ...row, ...Object.fromEntries(fields) };
  });

  const merged: RecordValues = new Map(values);
  drafts.forEach((draft) => {
    const own = new Map(merged.get(draft.recordId) ?? []);
    draft.values.forEach(({ propertyId, value }) => own.set(propertyId, value));
    merged.set(draft.recordId, own);
  });
  return { rows: drafted, values: merged };
}

export function pageRecords<T extends PageRow>(
  rows: T[],
  query: PageQuery,
  properties: PageProperty[],
  values: RecordValues,
): RecordsPage<T> {
  const search = query.search.trim().toLowerCase();
  const isFiltered = search !== '' || query.filters.length > 0;
  const byId = new Map(properties.map((property) => [property.id, property]));
  const compare = comparatorOf(query.sort, query.isDescending);
  const start = (query.page - 1) * query.pageSize;

  if (isFiltered || !query.isTree) {
    const found = isFiltered
      ? rows.filter(
          (row) =>
            (search === '' || matchesSearch(search, query.searchIn, row)) &&
            query.filters.every((filter) => matchesFilter(filter, fieldItems(filter.key, row, byId, values))),
        )
      : rows;
    const sorted = compare === null ? found : [...found].sort(compare);
    return { items: sorted.slice(start, start + query.pageSize), total: sorted.length };
  }

  const { roots, childrenOf } = treeOf(rows);
  const order = (list: T[]): T[] => (compare === null ? list : [...list].sort(compare));
  const items: T[] = [];
  // Кольцо в родителях обходу не страшно: пройденные записи помним
  const seen = new Set<string>();
  const walk = (row: T) => {
    const id = String(row.id);
    if (seen.has(id)) return;
    seen.add(id);
    items.push(row);
    order(childrenOf.get(id) ?? []).forEach(walk);
  };
  const sortedRoots = order(roots);
  sortedRoots.slice(start, start + query.pageSize).forEach(walk);
  return { items, total: sortedRoots.length };
}

/**
 * Записи верхнего уровня и дети каждой записи. Запись, чей родитель не пришёл,
 * сама себе родитель или замкнута в кольцо, встаёт наверх: терять строки
 * из-за битой ссылки нельзя.
 */
function treeOf<T extends PageRow>(rows: T[]): { roots: T[]; childrenOf: Map<string, T[]> } {
  const ids = new Set(rows.map((row) => String(row.id)));
  const roots: T[] = [];
  const childrenOf = new Map<string, T[]>();
  for (const row of rows) {
    const parent = row.parentId === null || row.parentId === undefined ? null : String(row.parentId);
    if (parent === null || parent === String(row.id) || !ids.has(parent)) {
      roots.push(row);
    } else {
      childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), row]);
    }
  }

  // Кольцо (2 → 3 → 2) от верхнего уровня не достижимо: первая его запись
  // встаёт наверх, остальные — под ней, как и лежат
  const reached = new Set<string>();
  const reach = (row: T) => {
    const id = String(row.id);
    if (reached.has(id)) return;
    reached.add(id);
    (childrenOf.get(id) ?? []).forEach(reach);
  };
  roots.forEach(reach);
  for (const row of rows) {
    if (reached.has(String(row.id))) continue;
    roots.push(row);
    reach(row);
  }
  return { roots, childrenOf };
}

/** Номер — целиком (по «12» находится запись 12, а не 112), остальное — подстрокой. */
function matchesSearch(search: string, searchIn: string[], row: PageRow): boolean {
  if (String(row.id) === search.replace(/^#/, '')) return true;
  return searchIn.some((key) => textOf(row[key]).toLowerCase().includes(search));
}

/** Поле записи текстом: у объектов и массивов текста нет — по ним не ищут. */
const textOf = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';

/**
 * Логическое поле записи — по правилу имён проекта его ключ начинается с `is`
 * (`isActive`): у него выбор «да / нет», а не подстрока.
 */
export const isBooleanField = (key: string): boolean => /^is[A-Z]/.test(key);

/**
 * Значения поля у записи — списком. У поля записи — оно само (у логического —
 * `true`/`false` строкой). У свойства — его значения: у множественного
 * несколько, у пустого ни одного, у мультидоменного — значения всех доменов,
 * у HTML — текст без разметки, иначе подстрока находилась бы в тегах.
 */
function fieldItems(
  key: string,
  row: PageRow,
  properties: Map<number, PageProperty>,
  values: RecordValues,
): unknown[] {
  if (!key.startsWith(PROPERTY_PREFIX)) {
    return [isBooleanField(key) ? String(row[key] === true) : textOf(row[key])];
  }

  const property = properties.get(Number(key.slice(PROPERTY_PREFIX.length)));
  // Свойство удалили, а поле в фильтре осталось — оно ничего не находит
  if (!property) return [];
  const stored = values.get(String(row.id))?.get(property.id);
  const domainValues = property.isMultiDomain === true ? domainValuesOf(stored) : [stored];
  const items = domainValues.flatMap((value) =>
    Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value],
  );
  return property.type === PropertyType.Html ? items.map((item) => htmlText(String(item))) : items;
}

/** Значения мультидоменного свойства: общее и уникальные — без разбора, чьи. */
const domainValuesOf = (value: unknown): unknown[] =>
  Array.isArray(value)
    ? value.map((item) => (typeof item === 'object' && item !== null && 'value' in item ? item.value : item))
    : [value];

const htmlText = (html: string): string => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Значение варианта, как его держит фильтр: номер варианта «Списка», `true`/`false`
 * логического поля или ключ привязки «список/запись».
 */
const optionValueOf = (item: unknown): string => {
  const { listKey, recordId } = (item ?? {}) as { listKey?: unknown; recordId?: unknown };
  return typeof listKey === 'string' && typeof recordId === 'string'
    ? `${listKey}/${recordId}`
    : String(item);
};

function matchesFilter(filter: RecordFilter, items: unknown[]): boolean {
  switch (filter.kind) {
    case FilterKind.Options:
      return items.some((item) => filter.codes.includes(optionValueOf(item)));
    case FilterKind.Text: {
      const text = filter.text.trim().toLowerCase();
      return items.some((item) => String(item).toLowerCase().includes(text));
    }
    case FilterKind.Range:
      return items.some((item) => {
        const number = Number(item);
        if (Number.isNaN(number) || item === '' || item === null) return false;
        return (filter.from === null || number >= filter.from) && (filter.to === null || number <= filter.to);
      });
    case FilterKind.Filled:
      return items.some((item) => item !== '') === filter.isFilled;
  }
}

/**
 * Сравнение записей по полю: числа — числом (номер 10 после 9), строки —
 * по алфавиту, пустое — в конце в любую сторону. Равные — новые выше: так
 * у списка без поля сортировки (файлы) порядок по умолчанию — новые сверху.
 */
function comparatorOf(sort: string | null, isDescending: boolean): ((a: PageRow, b: PageRow) => number) | null {
  if (sort === null) return null;
  const sign = isDescending ? -1 : 1;
  const byField = (a: PageRow, b: PageRow): number => {
    const left = sort === 'id' ? Number(a.id) : a[sort];
    const right = sort === 'id' ? Number(b.id) : b[sort];
    const isLeftEmpty = left === null || left === undefined || left === '';
    const isRightEmpty = right === null || right === undefined || right === '';
    if (isLeftEmpty || isRightEmpty) return isLeftEmpty === isRightEmpty ? 0 : isLeftEmpty ? 1 : -1;
    if (typeof left === 'number' && typeof right === 'number') return sign * (left - right);
    return sign * textOf(left).localeCompare(textOf(right), 'ru');
  };
  return (a, b) => byField(a, b) || Number(b.id) - Number(a.id);
}

/**
 * Поля фильтра из параметра запроса — JSON-массив `[{ key, kind, … }]`.
 * Непонятное — 400: молча отбросить поле значило бы показать не то, что просили.
 */
export function parseFilters(json: string | undefined): RecordFilter[] {
  if (json === undefined || json.trim() === '') return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new BadRequestException('Фильтр — не JSON');
  }
  if (!Array.isArray(raw)) throw new BadRequestException('Фильтр — не массив полей');
  return raw.map(filterOf);
}

function filterOf(raw: unknown): RecordFilter {
  const item = (raw ?? {}) as Record<string, unknown>;
  const key = item.key;
  if (typeof key !== 'string' || key === '') throw new BadRequestException('У поля фильтра нет ключа');

  switch (item.kind) {
    case FilterKind.Options:
      if (!Array.isArray(item.codes) || !item.codes.every((code) => typeof code === 'string')) break;
      return { key, kind: FilterKind.Options, codes: item.codes as string[] };
    case FilterKind.Text:
      if (typeof item.text !== 'string') break;
      return { key, kind: FilterKind.Text, text: item.text };
    case FilterKind.Range: {
      const from = boundOf(item.from);
      const to = boundOf(item.to);
      if (from === undefined || to === undefined) break;
      return { key, kind: FilterKind.Range, from, to };
    }
    case FilterKind.Filled:
      if (typeof item.isFilled !== 'boolean') break;
      return { key, kind: FilterKind.Filled, isFilled: item.isFilled };
  }
  throw new BadRequestException(`Непонятное поле фильтра: ${key}`);
}

/** Граница диапазона: число или null; иное — undefined, то есть ошибка. */
const boundOf = (value: unknown): number | null | undefined =>
  value === null || value === undefined ? null : typeof value === 'number' && Number.isFinite(value) ? value : undefined;
