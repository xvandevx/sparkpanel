/**
 * Свойства записей списка: описание (тип, код, обязательность, ограничения типа)
 * и проверка значений по нему. Чистые функции — без базы: их одинаково зовут и
 * запись значений (строго), и чтение (мягко, по уже изменившимся настройкам).
 */
import { CONTENTS_LIST } from '../../contents/content-lists';

export enum PropertyType {
  /** Однострочный текст */
  String = 'string',
  Number = 'number',
  /** Файл медиатеки: значение — номер файла */
  File = 'file',
  /** Изображение медиатеки: номер файла, с ограничением формата, веса и разрешения */
  Image = 'image',
  /** Значение из заданных в настройках вариантов */
  List = 'list',
  /** Многострочный текст */
  Text = 'text',
  /** HTML-разметка из визуального редактора */
  Html = 'html',
  /**
   * Привязка к записям контента: страница, элемент типа контента, роль,
   * категория, форма. Сами типы контента сюда не входят — для них свой тип
   */
  ContentLink = 'content-link',
  /** Привязка к типу контента из раздела «Контент»: та же ссылка, список — всегда типы */
  ContentTypeLink = 'content-type-link',
  /**
   * Привязка к значениям «Списка» другого свойства: выбирают его вариант.
   * Значение — номер варианта, как у самого «Списка»; варианты свои не заводят
   */
  ListOptionLink = 'list-option-link',
  /** Таблица заданного в настройках размера: строки × столбцы */
  Table = 'table',
}

/**
 * Типы, которые панель понимает сегодня. В настройках, сохранённых прежними
 * версиями, встречаются и другие (был тип «мета», его больше нет):
 * такие свойства отбрасываются при чтении — иначе их не сохранить (enum в DTO
 * их уже не принимает) и не показать.
 */
const KNOWN_PROPERTY_TYPES: ReadonlySet<string> = new Set(Object.values(PropertyType));

/**
 * Несколько значений можно включить любому типу, кроме таблицы: у неё строки
 * и так добавляются сколько угодно, а вторая таблица в том же свойстве
 * неотличима от лишних строк первой — значение `string[][]` и `string[][][]`
 * по виду совпадают.
 */
export const supportsMultiple = (type: PropertyType): boolean =>
  type !== PropertyType.Table;

/**
 * Типы с одним и тем же значением — текстом в колонке `text`: строка, текст
 * и HTML. Между ними тип меняется и у заполненного свойства — значения
 * читаются новым типом как есть.
 */
const TEXT_TYPES: ReadonlySet<PropertyType> = new Set([
  PropertyType.String,
  PropertyType.Text,
  PropertyType.Html,
]);

/**
 * Можно ли сменить тип свойства. Пока ни у одной записи нет его значения —
 * на любой: терять нечего. Заполненному — только внутри строки, текста и HTML:
 * остальные типы хранят значение по-своему («12 шт.» числом не станет).
 */
export const canChangeType = (from: PropertyType, to: PropertyType, isFilled: boolean): boolean =>
  from === to || !isFilled || (TEXT_TYPES.has(from) && TEXT_TYPES.has(to));

/** Форматы изображений, из которых выбирают в настройках свойства. */
export const IMAGE_FORMATS = ['jpg', 'png', 'webp', 'gif', 'svg', 'avif'] as const;

/** Размер таблицы: больше этого шторка уже не покажет по-человечески. */
export const TABLE_MAX_ROWS = 50;
export const TABLE_MAX_COLUMNS = 20;

/**
 * Вариант «Списка»: в значении записи хранится его номер — код правят, и
 * выбранное от этого теряться не должно. Код уходит на сайт, название видит
 * редактор. У нового, ещё не сохранённого варианта номера нет.
 */
export interface PropertyOption {
  id?: number;
  code: string;
  name: string;
}

/** Вкладка карточки записи. Свойства раскладываются по ним кодом вкладки. */
export interface TabDef {
  /** Ключ вкладки; на него ссылается свойство */
  code: string;
  /** Подпись вкладки в карточке записи */
  name: string;
}

export interface PropertyDef {
  /** Ключ значения; после сохранения не меняется — по нему значения и хранятся */
  code: string;
  name: string;
  /** Подсказка под полем в карточке записи; пусто — без подсказки */
  hint: string;
  type: PropertyType;
  /** Код вкладки, на которой показывать поле; пусто — вкладка «Свойства» */
  tab: string;
  required: boolean;
  multiple: boolean;
  /**
   * Мультидоменное: значение своё на домен сайта — общее плюс свои у отдельных
   * доменов и поддоменов. Подходит любому типу
   */
  isMultiDomain: boolean;
  /**
   * Значение не отдаётся через API: его пишут, но ни карточка, ни сайт его не
   * читают — для паролей и ключей. Подходит любому типу
   */
  isHidden: boolean;
  /**
   * Заполняется из внешнего источника: в панели значение не правят, пишет его
   * внешняя система через MCP. Подходит любому типу
   */
  isExternal: boolean;
  /**
   * Варианты для «Списка». У привязки к значениям списка — варианты того
   * свойства, на которое она смотрит (их подставляет чтение, не храним); у остальных пусто
   */
  options: PropertyOption[];
  /** Допустимые форматы (расширения) у файла и изображения; пусто — любые */
  formats: string[];
  /** Наибольший вес файла или изображения, МБ; null — без ограничения */
  maxSizeMb: number | null;
  /** Наибольшее разрешение изображения, px; null — без ограничения */
  maxWidth: number | null;
  maxHeight: number | null;
  /** Столбцов в таблице; у остальных типов null. Строк в записи сколько угодно */
  columns: number | null;
  /** Заголовки столбцов таблицы; пусто — таблица без шапки */
  headers: string[];
  /**
   * Откуда привязка к записям: ключ списка (`pages`, `content-items.8`).
   * Обязателен: «любая запись панели» тянула бы в выбор все записи разом.
   * Пусто осталось только у свойств, заведённых до этого правила, — выбрать
   * в таком поле нечего, пока источник не зададут
   */
  linkList: string;
  /** Свойство-«Список», варианты которого выбирает привязка к значениям списка */
  optionsPropertyId: number | null;
}

/** Ссылка привязки к контенту: список и запись в нём — те же ключи, что у настроек. */
export interface ContentLink {
  listKey: string;
  recordId: string;
}

/** Что известно о файле медиатеки — для проверки по ограничениям свойства. */
export interface FileFacts {
  id: number;
  name: string;
  mimeType: string;
  size: number;
}

/**
 * Значение мультидоменного свойства — группа доменов и значение для неё.
 * Общее (`domainIds: null`) идёт первым и действует на все домены, кроме
 * `exceptDomainIds`; остальные группы — уникальные значения, каждое для
 * одного или нескольких доменов. Уникальное сильнее общего и исключений.
 * Внутри `value` — обычное значение свойства: у множественного — массив.
 */
export interface DomainGroup {
  /** null — общее значение, для всех доменов */
  domainIds: number[] | null;
  value: unknown;
  /** Только у общего: домены, на которые оно не распространяется */
  exceptDomainIds?: number[];
}

/** Значения свойств одной записи: код свойства → значение. Пустых ключей нет. */
export type PropertyValueMap = Record<string, unknown>;

const DEFAULT_TABLE_COLUMNS = 3;

/** Свойство как оно приходит: из тела запроса или из строк базы. */
export type ListPropertyInput = Partial<Omit<PropertyDef, 'options'>> & {
  options?: Partial<PropertyOption>[];
};

/**
 * Описание свойств в том виде, в каком его хранят: пробелы срезаны, у каждого
 * типа только свои настройки — варианты у списка, форматы у файлов, размер
 * у таблицы. Лишнее обнуляется, чтобы не висело в базе невидимым.
 */
export function normalizeProperties(input: ListPropertyInput[]): PropertyDef[] {
  return input
    .filter((property) => KNOWN_PROPERTY_TYPES.has(String(property.type)))
    .map((property) => {
      const type = property.type as PropertyType;
      const isFile = type === PropertyType.File || type === PropertyType.Image;
      const isImage = type === PropertyType.Image;
      const isTable = type === PropertyType.Table;

      const columns = isTable ? positiveIntOrNull(property.columns) ?? DEFAULT_TABLE_COLUMNS : null;

      return {
        code: String(property.code ?? '').trim(),
        name: String(property.name ?? '').trim(),
        hint: String(property.hint ?? '').trim(),
        type,
        tab: String(property.tab ?? '').trim(),
        required: Boolean(property.required),
        multiple: supportsMultiple(type) && Boolean(property.multiple),
        isMultiDomain: Boolean(property.isMultiDomain),
        isHidden: Boolean(property.isHidden),
        isExternal: Boolean(property.isExternal),
        options: type === PropertyType.List ? normalizeOptions(property.options ?? []) : [],
        formats: isFile ? normalizeFormats(property.formats ?? [], isImage) : [],
        maxSizeMb: isFile ? positiveOrNull(property.maxSizeMb) : null,
        maxWidth: isImage ? positiveIntOrNull(property.maxWidth) : null,
        maxHeight: isImage ? positiveIntOrNull(property.maxHeight) : null,
        columns,
        // Заголовков ровно столько, сколько столбцов: лишние отрезаны, недостающие пусты
        headers: isTable ? normalizeHeaders(property.headers ?? [], columns ?? 0) : [],
        linkList:
          type === PropertyType.ContentLink ? String(property.linkList ?? '').trim() : '',
        optionsPropertyId:
          type === PropertyType.ListOptionLink ? positiveIntOrNull(property.optionsPropertyId) : null,
      };
    });
}

/**
 * Параметры типа свойства — всё, что не общее для всех типов: так они лежат
 * в `params` строки свойства. Вариантов «Списка» здесь нет: они лежат строками
 * в своей таблице.
 */
export const paramsOf = (property: PropertyDef) => ({
  formats: property.formats,
  maxSizeMb: property.maxSizeMb,
  maxWidth: property.maxWidth,
  maxHeight: property.maxHeight,
  columns: property.columns,
  headers: property.headers,
  linkList: property.linkList,
  optionsPropertyId: property.optionsPropertyId,
});

/** Вкладки в том виде, в каком их хранят: без пробелов по краям и без пустых. */
export function normalizeTabs(input: Partial<TabDef>[]): TabDef[] {
  return input
    .map((tab) => ({
      code: String(tab.code ?? '').trim(),
      name: String(tab.name ?? '').trim(),
    }))
    .filter((tab) => tab.code !== '' && tab.name !== '');
}

/** Ошибка описания вкладок (повтор кода) или ссылки свойства на несуществующую вкладку. */
export function tabsError(tabs: TabDef[], properties: PropertyDef[]): string | null {
  const codes = new Set<string>();
  for (const tab of tabs) {
    if (codes.has(tab.code)) return `Код вкладки «${tab.code}» повторяется`;
    codes.add(tab.code);
  }

  for (const property of properties) {
    if (property.tab !== '' && !codes.has(property.tab)) {
      return `Свойство «${property.name}» ссылается на несуществующую вкладку`;
    }
  }

  return null;
}

/**
 * Ошибка описания свойств (повтор кода свойства или варианта, список без
 * вариантов, огромная таблица) или null.
 */
export function propertiesError(properties: PropertyDef[]): string | null {
  const codes = new Set<string>();
  for (const property of properties) {
    if (codes.has(property.code)) return `Код свойства «${property.code}» повторяется`;
    codes.add(property.code);
    if (property.type === PropertyType.List && property.options.length === 0) {
      return `У списка «${property.name}» нет вариантов`;
    }
    if (property.type === PropertyType.ContentLink && property.linkList === '') {
      return `У привязки «${property.name}» не выбрано, откуда брать записи`;
    }
    if (property.type === PropertyType.ListOptionLink && property.optionsPropertyId === null) {
      return `У привязки «${property.name}» не выбрано свойство-список`;
    }
    // Повтор не схлопываем молча: у варианта номер, и выбросить один из двух
    // значило бы стереть его у записей
    const optionCodes = property.options.map((option) => option.code);
    const repeated = optionCodes.find((code, index) => optionCodes.indexOf(code) !== index);
    if (repeated !== undefined) {
      return `Код варианта «${repeated}» в списке «${property.name}» повторяется`;
    }
    if (property.type === PropertyType.Table && (property.columns ?? 0) > TABLE_MAX_COLUMNS) {
      return `В таблице «${property.name}» больше ${TABLE_MAX_COLUMNS} столбцов`;
    }
  }
  return null;
}

/**
 * Коды, значения которых после смены настроек уже не прочитать: свойство удалили
 * или сменили ему тип (строка «12 шт.» числом не станет). Их значения стирают.
 */
export function staleCodes(before: PropertyDef[], after: PropertyDef[]): string[] {
  const next = new Map(after.map((property) => [property.code, property]));
  return before
    .filter((property) => next.get(property.code)?.type !== property.type)
    .map((property) => property.code);
}

export interface NormalizedValues {
  values: PropertyValueMap;
  /** Тексты ошибок; при мягком чтении всегда пусто — плохие значения просто отброшены */
  errors: string[];
}

/**
 * Значения записи, приведённые к описанию свойств. Незнакомые коды отбрасываются
 * всегда: свойства могли удалить, пока форма была открыта.
 *
 * `strict` — запись: неверное значение и пустое обязательное дают ошибку.
 * Без него — чтение: что не подходит под текущие настройки, молча пропадает.
 */
export function normalizeValues(
  properties: PropertyDef[],
  input: PropertyValueMap,
  strict: boolean,
): NormalizedValues {
  const values: PropertyValueMap = {};
  const errors: string[] = [];

  for (const property of properties) {
    const raw = input[property.code];
    const value = normalizeValue(property, raw);

    if (value === INVALID) {
      if (strict) errors.push(`Неверное значение свойства «${property.name}»`);
      continue;
    }
    if (value === null) {
      if (strict && property.required) errors.push(`Свойство «${property.name}» обязательно`);
      continue;
    }
    // У мультидоменного обязательно общее: домены без уникального берут его
    if (strict && property.required && property.isMultiDomain && (value as DomainGroup[])[0].value === null) {
      errors.push(`Свойство «${property.name}» обязательно: заполните значение для всех доменов`);
      continue;
    }
    values[property.code] = value;
  }

  return { values, errors };
}

/** Номера записей, на которые ссылаются значения указанных типов, — для проверки владельца. */
export function referencedIds(
  properties: PropertyDef[],
  values: PropertyValueMap,
  types: PropertyType[],
): number[] {
  const ids = properties
    .filter((property) => types.includes(property.type) && values[property.code] !== undefined)
    .flatMap((property) => toArray(values[property.code]) as number[]);
  return unique(ids);
}

/**
 * Значения записи без деления по доменам: у мультидоменного свойства —
 * значения всех групп одним списком. Так их проверяют на ссылки — файл
 * или запись в уникальном значении должны существовать так же, как в общем.
 */
export function plainValues(properties: PropertyDef[], values: PropertyValueMap): PropertyValueMap {
  const multiDomain = new Set(
    properties.filter((property) => property.isMultiDomain).map((property) => property.code),
  );
  return Object.fromEntries(
    Object.entries(values).map(([code, value]) => [
      code,
      multiDomain.has(code)
        ? (value as DomainGroup[]).flatMap((group) => (group.value === null ? [] : toArray(group.value)))
        : value,
    ]),
  );
}

/** Домены, на которые ссылаются мультидоменные значения: группы и исключения. */
export function referencedDomainIds(properties: PropertyDef[], values: PropertyValueMap): number[] {
  return unique(
    properties
      .filter((property) => property.isMultiDomain && values[property.code] !== undefined)
      .flatMap((property) =>
        (values[property.code] as DomainGroup[]).flatMap((group) => [
          ...(group.domainIds ?? []),
          ...(group.exceptDomainIds ?? []),
        ]),
      ),
  );
}

/** Типы-привязки: значение у обоих — ссылка `{ listKey, recordId }`. */
export const isLinkType = (type: PropertyType): boolean =>
  type === PropertyType.ContentLink || type === PropertyType.ContentTypeLink;

/** Все привязки к контенту в значениях записи, без повторов. */
export function referencedLinks(
  properties: PropertyDef[],
  values: PropertyValueMap,
): ContentLink[] {
  const links = properties
    .filter((property) => isLinkType(property.type))
    .flatMap((property) =>
      values[property.code] === undefined ? [] : (toArray(values[property.code]) as ContentLink[]),
    );
  return uniqueBy(links, linkKey);
}

export const linkKey = (link: ContentLink): string => `${link.listKey}/${link.recordId}`;

/**
 * Подходит ли файл под ограничения свойства: изображение ли это, формат, вес.
 * Разрешение здесь не проверяется — в карточке файла его нет, его проверяет
 * шторка, загрузив картинку.
 */
export function fileRuleError(property: PropertyDef, file: FileFacts): string | null {
  if (property.type === PropertyType.Image && !file.mimeType.startsWith('image/')) {
    return `«${file.name}» — не изображение`;
  }
  if (property.formats.length && !formatMatches(extensionOf(file.name), property.formats)) {
    return `«${file.name}»: формат не подходит, нужен ${property.formats.join(', ')}`;
  }
  if (property.maxSizeMb !== null && file.size > property.maxSizeMb * 1024 * 1024) {
    return `«${file.name}» больше ${property.maxSizeMb} МБ`;
  }
  return null;
}

/** Плоский снимок для журнала: ключи совпадают с полями формы (`props.price`). */
export function valuesSnapshot(values: PropertyValueMap): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};

  for (const [code, value] of Object.entries(values)) {
    snapshot[`props.${code}`] = value;
  }

  return snapshot;
}

/** Расширение файла без точки, строчными. */
export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Одинаковые форматы под разными именами: `photo.jpeg` — это тоже JPG. */
const FORMAT_ALIASES: Record<string, string> = { jpeg: 'jpg', tif: 'tiff' };
const canonicalFormat = (format: string): string => FORMAT_ALIASES[format] ?? format;

export const formatMatches = (extension: string, formats: string[]): boolean =>
  formats.map(canonicalFormat).includes(canonicalFormat(extension));

const INVALID = Symbol('invalid');

type Normalized = unknown | null | typeof INVALID;

function normalizeValue(property: PropertyDef, raw: unknown): Normalized {
  if (isEmpty(raw)) return null;
  if (property.isMultiDomain) return normalizeDomainGroups(property, raw);

  switch (property.type) {
    // Строка — одна строчка, пробелы по краям в ней лишние; у текста и разметки
    // переносы и отступы — часть содержимого, их храним как есть
    case PropertyType.String:
      return normalizeMany(property, raw, toTrimmedString, false);

    case PropertyType.Text:
    case PropertyType.Html:
      // Повторы тут не схлопываем: два одинаковых абзаца — это два абзаца,
      // а не случайно выбранный дважды вариант
      return normalizeMany(property, raw, (item) => (typeof item === 'string' ? item : INVALID), false);

    case PropertyType.Number:
      return normalizeMany(property, raw, toNumber, false);

    case PropertyType.List:
    case PropertyType.ListOptionLink: {
      // Значение — номер варианта: по коду выбранное пропадало бы со сменой кода.
      // У привязки варианты — того свойства, на которое она смотрит
      const ids = new Set(property.options.map((option) => option.id));
      return normalizeMany(
        property,
        raw,
        (item) => {
          const id = toId(item);
          return id !== INVALID && ids.has(id as number) ? id : INVALID;
        },
        true,
      );
    }

    case PropertyType.File:
    case PropertyType.Image:
      return normalizeMany(property, raw, toId, true);

    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink: {
      // Ссылку из другого списка не ломаем об ошибку, а отбрасываем: источник
      // могли задать, когда значения уже сохранены, и остальные ссылки должны
      // уцелеть — иначе одна чужая запись уносит с собой всё поле
      const links = toArray(raw).filter((item) => belongsToList(item, property));
      return normalizeMany(property, links, toLink, true);
    }

    case PropertyType.Table:
      return toTable(raw, property.columns ?? DEFAULT_TABLE_COLUMNS);

    default:
      return INVALID;
  }
}

/**
 * Мультидоменное значение: каждая группа проверяется как обычное значение
 * свойства. Значение, сохранённое до того, как свойство стало мультидоменным,
 * становится общим. Группу без доменов или без значения ещё не дописали — её
 * отбрасываем; домен в двух уникальных группах — ошибка: значение у него одно.
 *
 * Исключения хранятся при общем значении, поэтому без общего не сохраняются:
 * им не на что действовать — у домена без уникального значения его и так нет.
 */
function normalizeDomainGroups(property: PropertyDef, raw: unknown): Normalized {
  const single: PropertyDef = { ...property, isMultiDomain: false };
  const groups: DomainGroup[] = isDomainGroupList(raw) ? raw : [{ domainIds: null, value: raw }];

  const commons = groups.filter((group) => group.domainIds === null);
  if (commons.length > 1) return INVALID;
  const common = commons[0];
  const commonValue = common ? normalizeValue(single, common.value) : null;
  const except = toIdList(common?.exceptDomainIds ?? []);
  if (commonValue === INVALID || except === INVALID) return INVALID;

  const own: DomainGroup[] = [];
  const taken = new Set<number>();
  for (const group of groups) {
    if (group.domainIds === null) continue;
    const ids = toIdList(group.domainIds);
    const value = normalizeValue(single, group.value);
    if (ids === INVALID || value === INVALID) return INVALID;
    if (ids.length === 0 || value === null) continue;
    if (ids.some((id) => taken.has(id))) return INVALID;
    ids.forEach((id) => taken.add(id));
    own.push({ domainIds: ids, value });
  }

  if (commonValue === null && own.length === 0) return null;
  return [
    {
      domainIds: null,
      value: commonValue,
      ...(commonValue !== null && except.length > 0 ? { exceptDomainIds: except } : {}),
    },
    ...own,
  ];
}

const isDomainGroupList = (raw: unknown): raw is DomainGroup[] =>
  Array.isArray(raw) &&
  raw.every((item) => typeof item === 'object' && item !== null && 'domainIds' in item && 'value' in item);

/** Номера доменов: положительные целые без повторов; что-то другое — ошибка. */
function toIdList(raw: unknown): number[] | typeof INVALID {
  if (!Array.isArray(raw)) return INVALID;
  if (!raw.every((id) => Number.isInteger(id) && id > 0)) return INVALID;
  return unique(raw as number[]);
}

/**
 * Значение свойства: у одиночного — одно, у множественного — массив.
 * Множественность могли переключить уже после того, как значения сохранили,
 * поэтому одиночное значение оборачивается в массив, а из массива для
 * одиночного берётся первое.
 *
 * `dedupe` — для выбора (варианты, файлы, привязки): выбрать один и тот
 * же пункт дважды нельзя. У текста и чисел повторы осмысленны и сохраняются.
 */
function normalizeMany(
  property: PropertyDef,
  raw: unknown,
  item: (value: unknown) => unknown,
  dedupe: boolean,
): Normalized {
  const items = toArray(raw)
    .filter((value) => !isEmpty(value))
    .map(item);
  if (items.includes(INVALID)) return INVALID;
  const list = dedupe ? uniqueBy(items, (value) => JSON.stringify(value)) : items;
  if (list.length === 0) return null;
  return property.multiple ? list : list[0];
}

const toTrimmedString = (raw: unknown): Normalized =>
  typeof raw === 'string' || typeof raw === 'number' ? String(raw).trim() : INVALID;

function toNumber(raw: unknown): Normalized {
  const value = typeof raw === 'string' ? Number(raw.trim().replace(',', '.')) : raw;
  return typeof value === 'number' && Number.isFinite(value) ? value : INVALID;
}

function toId(raw: unknown): Normalized {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : INVALID;
}

const LINK_PART_PATTERN = /^[a-z0-9][a-z0-9.-]{0,63}$/;

function toLink(raw: unknown): Normalized {
  if (!raw || typeof raw !== 'object') return INVALID;
  const { listKey, recordId } = raw as Record<string, unknown>;
  if (typeof listKey !== 'string' || typeof recordId !== 'string') return INVALID;
  if (!LINK_PART_PATTERN.test(listKey) || !LINK_PART_PATTERN.test(recordId)) return INVALID;
  return { listKey, recordId };
}

/**
 * Ссылка ведёт туда, куда смотрит свойство. У привязки к типу контента это
 * всегда типы; у привязки к записям — её список-источник, а без источника
 * (свойства, заведённые до того, как он стал обязательным) — никуда.
 */
const belongsToList = (raw: unknown, property: PropertyDef): boolean => {
  if (!raw || typeof raw !== 'object') return false;
  const { listKey } = raw as Record<string, unknown>;
  if (property.type === PropertyType.ContentTypeLink) return listKey === CONTENTS_LIST;
  return property.linkList !== '' && listKey === property.linkList;
};

/**
 * Таблица — строки ячеек. Столбцов ровно столько, сколько в настройках: лишние
 * отрезаются, недостающие добиваются пустыми. Строк сколько угодно — их
 * добавляют в карточке записи; пустые строки с конца не хранятся, а больше
 * `TABLE_MAX_ROWS` строк не принимаем: такую таблицу уже не отредактировать.
 */
function toTable(raw: unknown, columns: number): Normalized {
  if (!Array.isArray(raw) || raw.some((row) => !Array.isArray(row))) return INVALID;

  const table: string[][] = [];
  for (const source of raw as unknown[][]) {
    const cells: string[] = [];
    for (let column = 0; column < columns; column += 1) {
      const cell = source[column];
      if (cell !== undefined && cell !== null && typeof cell !== 'string' && typeof cell !== 'number') {
        return INVALID;
      }
      cells.push(cell === undefined || cell === null ? '' : String(cell).trim());
    }
    table.push(cells);
  }

  // Хвост из пустых строк — след удалённых: хранить его незачем
  while (table.length && table[table.length - 1].every((cell) => cell === '')) table.pop();

  // Потолок считается по тому, что ляжет в базу: пустая строка, которую мы и так
  // не храним, отказом в сохранении оборачиваться не должна
  if (table.length > TABLE_MAX_ROWS) return INVALID;

  return table.length ? table : null;
}

/**
 * Варианты списка: номер — то, что хранится в значении записи, код уходит
 * на сайт, название — подпись. Повтор кода не схлопывается — его ловит
 * `propertiesError`.
 */
function normalizeOptions(input: Partial<PropertyOption>[]): PropertyOption[] {
  return input
    .map((option) => {
      const name = String(option.name ?? '').trim();
      const code = String(option.code ?? '').trim();
      const id = positiveIntOrNull(option.id);
      return { ...(id === null ? {} : { id }), code: code || name, name: name || code };
    })
    .filter((option) => option.code !== '' && option.name !== '');
}

/** Заголовки столбцов: ровно по числу столбцов; целиком пустые не храним. */
function normalizeHeaders(input: string[], columns: number): string[] {
  const headers = Array.from({ length: columns }, (_, index) => String(input[index] ?? '').trim());
  return headers.some(Boolean) ? headers : [];
}

function normalizeFormats(formats: string[], imageOnly: boolean): string[] {
  const list = unique(
    formats
      .map((format) => canonicalFormat(format.trim().replace(/^\.+/, '').toLowerCase()))
      .filter((format) => /^[a-z0-9]{1,10}$/.test(format)),
  );
  return imageOnly
    ? list.filter((format) => (IMAGE_FORMATS as readonly string[]).includes(format))
    : list;
}

const positiveOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const positiveIntOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;

const toArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : [value]);

const unique = <T>(list: T[]): T[] => Array.from(new Set(list));

function uniqueBy<T>(list: T[], key: (item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const item of list) {
    const itemKey = key(item);
    if (!seen.has(itemKey)) seen.set(itemKey, item);
  }
  return Array.from(seen.values());
}

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);
