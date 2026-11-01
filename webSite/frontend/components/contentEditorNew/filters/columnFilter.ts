import { linkListOf, linkOptions, type LinkOption, type LinkOptionGroup } from '../../../logic/contentLinks';
import { isLinkType, PropertyType } from '../../../logic/listSettings';
import type { EditorLinkTarget } from '../../../redux/action-creaters/contentEditorNew';
import { cellText, ID_COLUMN_KEY, type TableColumn } from '../table/columns';

/**
 * Фильтр таблицы: какие поля в нём, что в каждом выбрано и подходит ли запись.
 *
 * Фильтруют по тем же полям, из которых собирают таблицу: колонки раздела
 * (название, код, активность) и свойства записей. Поле фильтра адресуется
 * ключом колонки (`name`, `property-12`) — колонка может быть и не видна,
 * ключ от этого не меняется.
 *
 * Набор полей — один на список для всех и лежит на сервере, а что в полях
 * выбрано — в адресе страницы (`?f.name=фар&f.property-12=static`): ссылкой
 * с отобранной таблицей можно поделиться, а соседу чужой выбор не мешает.
 *
 * Отбирает сервер — тем же маршрутом, что отдаёт страницу таблицы
 * (`api/records.ts`): поле уходит туда как есть, `{ key, kind, … }`. Сверяет
 * он по самому полю записи, а не по подписи в ячейке, — поэтому у логического
 * поля варианты `true`/`false`, а колонка со своей подписью в фильтр не встаёт.
 *
 * Чистые функции: ни React, ни стора.
 */

/** Что выбирают в поле фильтра. */
export enum FilterKind {
  /** Варианты на выбор: «Список», привязка, логическое поле раздела */
  Options = 'options',
  /** Подстрока: строка, текст, HTML, поле раздела */
  Text = 'text',
  /** Диапазон: число */
  Range = 'range',
  /** Заполнено или нет: файл, изображение, таблица */
  Filled = 'filled',
}

const KIND_OF_TYPE: Record<string, FilterKind> = {
  [PropertyType.List]: FilterKind.Options,
  [PropertyType.ContentLink]: FilterKind.Options,
  [PropertyType.ContentTypeLink]: FilterKind.Options,
  [PropertyType.ListOptionLink]: FilterKind.Options,
  [PropertyType.String]: FilterKind.Text,
  [PropertyType.Text]: FilterKind.Text,
  [PropertyType.Html]: FilterKind.Text,
  [PropertyType.Number]: FilterKind.Range,
};

/**
 * Логическое поле раздела — по правилу имён проекта его ключ начинается с `is`
 * (`isActive`). Подстрока в «Да / Нет» не ищется — у него выбор из двух.
 */
const isBooleanColumn = (key: string): boolean => /^is[A-Z]/.test(key);

/**
 * Вид поля фильтра: варианты («Список», привязка, логическое поле раздела),
 * подстрока, диапазон числа или «заполнено». У свойства — по типу: у кого нет
 * ни вариантов, ни текста, тому «заполнено». У колонки раздела типа нет, есть
 * только текст ячейки: по нему ищут подстроку, а у логического поля выбирают.
 */
export const filterKindOf = (field: TableColumn): FilterKind => {
  if (field.property) return KIND_OF_TYPE[field.property.type] ?? FilterKind.Filled;
  return isBooleanColumn(field.key) ? FilterKind.Options : FilterKind.Text;
};

/** Поле фильтра: ключ колонки и что в нём выбрано — у каждого вида своё. */
export type ColumnFilter = { key: string } & (
  /** Подходит запись, у которой есть хоть один из выбранных вариантов */
  | { kind: FilterKind.Options; codes: string[] }
  | { kind: FilterKind.Text; text: string }
  /** Границы включительно; null — с этой стороны без границы */
  | { kind: FilterKind.Range; from: number | null; to: number | null }
  /** null — всё равно */
  | { kind: FilterKind.Filled; isFilled: boolean | null }
);

/** В поле ничего не выбрано: только что поставили в фильтр или сбросили. */
export const emptyFilter = (field: TableColumn): ColumnFilter => {
  const { key } = field;
  switch (filterKindOf(field)) {
    case FilterKind.Options:
      return { key, kind: FilterKind.Options, codes: [] };
    case FilterKind.Text:
      return { key, kind: FilterKind.Text, text: '' };
    case FilterKind.Range:
      return { key, kind: FilterKind.Range, from: null, to: null };
    default:
      return { key, kind: FilterKind.Filled, isFilled: null };
  }
};

/** В поле ничего не выбрано — оно никого не отсеивает. */
export const isEmptyFilter = (filter: ColumnFilter): boolean => {
  switch (filter.kind) {
    case FilterKind.Options:
      return filter.codes.length === 0;
    case FilterKind.Text:
      return filter.text.trim() === '';
    case FilterKind.Range:
      return filter.from === null && filter.to === null;
    case FilterKind.Filled:
      return filter.isFilled === null;
  }
};

/**
 * Поля, по которым можно фильтровать: колонки раздела и свойства записей —
 * все, из которых собирают таблицу, кроме превью (в ячейке картинка, а не
 * текст) и колонок со своей подписью (`logic`): сервер сверяет поле записи,
 * а не подпись, и «1,2 МБ» в байтах не найдётся. Логическим колонкам подпись
 * не мешает — у них выбор «да / нет». Номера записи в фильтре нет: его целиком
 * находит строка поиска.
 */
export const filterableFields = (available: TableColumn[]): TableColumn[] =>
  available.filter(
    ({ key, column }) =>
      key !== ID_COLUMN_KEY &&
      (column === undefined || (!column.isPreview && (column.logic === undefined || isBooleanColumn(key)))),
  );

/**
 * Что выбрано в полях фильтра, как оно лежит в адресе: ключ колонки →
 * значения её параметра. Ничего не выбрано — ключа нет.
 */
export type FilterParams = Record<string, string[]>;

/** Параметры фильтра в адресе — с приставкой: рядом бывают свои (`sectionId`, `id`). */
const PARAM_PREFIX = 'f.';

/** Что выбрано в полях — из адреса страницы; чужие параметры не трогаем. */
export const filterParamsOf = (query: Record<string, string | string[] | undefined>): FilterParams =>
  Object.fromEntries(
    Object.entries(query).flatMap(([param, value]) =>
      param.startsWith(PARAM_PREFIX) && value !== undefined
        ? [[param.slice(PARAM_PREFIX.length), Array.isArray(value) ? value : [value]]]
        : [],
    ),
  );

/**
 * Адрес с выбранным в фильтре: прежние параметры фильтра заменяются целиком,
 * остальные (номер раздела, открытая запись) остаются как были.
 */
export const queryWithFilter = (
  query: Record<string, string | string[] | undefined>,
  params: FilterParams,
): Record<string, string | string[]> => ({
  ...Object.fromEntries(
    Object.entries(query).flatMap(([param, value]) =>
      param.startsWith(PARAM_PREFIX) || value === undefined ? [] : [[param, value]],
    ),
  ),
  ...Object.fromEntries(
    Object.entries(params)
      .filter(([, values]) => values.length > 0)
      .map(([key, values]) => [`${PARAM_PREFIX}${key}`, values]),
  ),
});

/**
 * Что выбрано в поле — в значения его параметра: варианты — по одному
 * параметру на вариант, диапазон — `1..10` (с одной стороны можно пусто),
 * «заполнено» — `filled` / `empty`. Ничего не выбрано — пусто.
 */
export const filterParamOf = (filter: ColumnFilter): string[] => {
  switch (filter.kind) {
    case FilterKind.Options:
      return filter.codes;
    case FilterKind.Text:
      return filter.text === '' ? [] : [filter.text];
    case FilterKind.Range:
      return filter.from === null && filter.to === null
        ? []
        : [`${filter.from ?? ''}..${filter.to ?? ''}`];
    case FilterKind.Filled:
      return filter.isFilled === null ? [] : [filter.isFilled ? 'filled' : 'empty'];
  }
};

/** Граница диапазона из адреса: пусто или не число — без границы. */
const boundOf = (text: string | undefined): number | null => {
  if (text === undefined || text.trim() === '') return null;
  const number = Number(text);
  return Number.isNaN(number) ? null : number;
};

/**
 * Поле фильтра из значений его параметра. Вид — по колонке, а не из адреса:
 * адрес правят руками, и непонятное значение даёт пустое поле, а не ошибку.
 */
const filterOf = (field: TableColumn, values: string[]): ColumnFilter => {
  const filter = emptyFilter(field);
  const [first = ''] = values;
  switch (filter.kind) {
    case FilterKind.Options:
      return { ...filter, codes: values };
    case FilterKind.Text:
      return { ...filter, text: first };
    case FilterKind.Range: {
      const [from, to] = first.split('..');
      return { ...filter, from: boundOf(from), to: boundOf(to) };
    }
    case FilterKind.Filled:
      return { ...filter, isFilled: first === 'filled' ? true : first === 'empty' ? false : null };
  }
};

/** Поле фильтра вместе с колонкой, к которой оно относится. */
export interface FilterEntry {
  filter: ColumnFilter;
  field: TableColumn;
}

/**
 * Поля фильтра по порядку набора, с тем, что в них выбрано. Колонки, которой
 * больше нет (свойство удалили), — пропускаем: поле пропадает, а не отбирает
 * по пустоте. Выбранное для поля, которого в наборе нет, не действует.
 */
export const filterEntries = (
  keys: string[],
  params: FilterParams,
  fields: TableColumn[],
): FilterEntry[] =>
  keys.flatMap((key) => {
    const field = fields.find((item) => item.key === key);
    return field ? [{ field, filter: filterOf(field, params[key] ?? []) }] : [];
  });

/** Поля, которые правда отбирают: в них что-то выбрано. */
export const activeFilterEntries = (entries: FilterEntry[]): FilterEntry[] =>
  entries.filter(({ filter }) => !isEmptyFilter(filter));

/**
 * Из чего выбирают в поле с вариантами — с теми же подписями, что в ячейке
 * и в карточке:
 *
 * - у «Списка» — его варианты;
 * - у привязки — записи списка, заданного в свойстве (без него — любые записи
 *   панели по группам);
 * - у логического поля раздела — `true`/`false` с подписями, которые колонка
 *   показывает для «да» и «нет» («Разрешён / Отключён»). Её логику для этого
 *   зовут на записи из одного этого поля: подпись от других полей не зависит.
 */
export const filterOptions = (
  field: TableColumn,
  targets: EditorLinkTarget[],
): (LinkOption | LinkOptionGroup)[] => {
  const { column, property } = field;
  if (column) {
    return [true, false].map((value) => {
      const text = cellText(field.key, column, { id: '', [field.key]: value }, []);
      return { value: String(value), label: text || (value ? 'Да' : 'Нет') };
    });
  }
  if (isLinkType(property.type as PropertyType)) {
    return linkOptions(targets, linkListOf(property));
  }
  // Вариант «Списка» — его номером строкой: так он лежит в адресе страницы
  return ((property.options as { id: number; name: string }[] | undefined) ?? []).map((option) => ({
    value: String(option.id),
    label: option.name,
  }));
};

/** Варианты по группам: у привязки без списка-источника они сгруппированы, у остальных группа одна, без подписи. */
export const optionGroups = (
  options: (LinkOption | LinkOptionGroup)[],
): { label: string | null; options: LinkOption[] }[] => {
  const loose = options.filter((option): option is LinkOption => !('options' in option));
  const groups = options.filter((option): option is LinkOptionGroup => 'options' in option);
  return [
    ...(loose.length > 0 ? [{ label: null, options: loose }] : []),
    ...groups.map((group) => ({ label: group.label, options: group.options })),
  ];
};

/**
 * Что выбрано в поле — коротко, для чипа фильтра: «Да», «Статическая +1»,
 * «содержит «фар»», «от 10 до 20». Ничего не выбрано — null: на чипе
 * остаётся одно имя поля.
 */
export const filterSummary = (
  filter: ColumnFilter,
  options: (LinkOption | LinkOptionGroup)[],
): string | null => {
  if (isEmptyFilter(filter)) return null;
  switch (filter.kind) {
    case FilterKind.Options: {
      const flat = optionGroups(options).flatMap((group) => group.options);
      // У записи из дерева — путь: «Седан #23» на чипе без модели ничего не скажет
      const labels = new Map(flat.map((option) => [option.value, option.path ?? option.label]));
      // Отмеченная ветка — одной записью: «Kia», а не «Kia +6» с её моделями и кузовами
      const covered = new Set(
        flat.filter((option) => filter.codes.includes(option.value)).flatMap((option) => option.descendants ?? []),
      );
      const [first, ...rest] = filter.codes.filter((code) => !covered.has(code));
      const label = labels.get(first) ?? first;
      return rest.length > 0 ? `${label} +${rest.length}` : label;
    }
    case FilterKind.Text:
      return `содержит «${filter.text.trim()}»`;
    case FilterKind.Range:
      if (filter.from !== null && filter.to !== null) return `от ${filter.from} до ${filter.to}`;
      return filter.from !== null ? `от ${filter.from}` : `до ${filter.to}`;
    case FilterKind.Filled:
      return filter.isFilled ? 'заполнено' : 'не заполнено';
  }
};
