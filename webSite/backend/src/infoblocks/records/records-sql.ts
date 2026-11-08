import { PropertyType } from '../settings/properties/property';
import {
  FilterKind,
  isBooleanField,
  pageRecords,
  withDrafts,
  type PageDraft,
  type PageProperty,
  type PageQuery,
  type PageRow,
  type RecordFilter,
  type RecordValues,
} from './records-page';

/**
 * Отбор записей запросом к базе — те же правила, что у `pageRecords`
 * (`records-page.ts`), только `WHERE` / `ORDER BY` / `LIMIT` вместо перебора
 * в памяти. Так читаются большие списки (товары, элементы типов контента):
 * из базы приходят только записи страницы, а `total` — это `COUNT`.
 *
 * Здесь только сборка текста запроса, без Nest и без самой базы. Запрос
 * исполняет `RecordsService`; что он находит то же, что и память, проверяет
 * `records-sql.spec.ts` на настоящей базе.
 *
 * Псевдонимы запроса: `s` — строка таблицы раздела, `r` — её строка
 * в `infoblock_records` (внешний ID, время правки свойств; у записи без
 * значений её нет), `v` — строка значения свойства.
 */

/** Таблица раздела, из которой список читается запросом. */
export interface SqlTable {
  table: string;
  /** Колонка владельца вложенного списка: `contentId` у элементов типа */
  owner?: string;
  /** У записей есть колонка `parentId` — дерево раздела */
  hasParent: boolean;
}

/** Черновики таблицы админки: их записи оценивает память, сюда — готовый ответ. */
export interface SqlDrafts {
  /** Записи с черновиком: запрос их не оценивает */
  ids: number[];
  /** Какие из них проходят поиск и фильтр — с черновиком поверх */
  matching: number[];
  /** Значение поля сортировки у записи с черновиком, если черновик его меняет */
  sortKeys: Map<number, unknown>;
}

/**
 * Черновики для запроса: `rows` и `values` — опубликованные записи с черновиком
 * и их значения. Память накладывает черновик и отбирает прежними правилами
 * (`withDrafts` + `pageRecords`); поле сортировки, которое черновик меняет,
 * уходит в запрос значением.
 */
export function sqlDraftsOf(
  rows: PageRow[],
  values: RecordValues,
  drafts: PageDraft[],
  query: PageQuery,
  properties: PageProperty[],
): SqlDrafts {
  const drafted = withDrafts(rows, values, drafts);
  const matching = pageRecords(
    drafted.rows,
    { ...query, page: 1, pageSize: Math.max(drafted.rows.length, 1), sort: null, isTree: false },
    properties,
    drafted.values,
  ).items.map((row) => Number(row.id));
  // Номер и родителя черновик не меняет (`withDrafts`) — по ним сортирует база
  const sort = query.sort;
  const sortKeys = new Map(
    sort === null || sort === 'id' || sort === 'parentId'
      ? []
      : drafts.flatMap((draft) => (sort in draft.fields ? [[Number(draft.recordId), draft.fields[sort]] as const] : [])),
  );
  return { ids: drafts.map((draft) => Number(draft.recordId)), matching, sortKeys };
}

export interface SqlSelection {
  table: SqlTable;
  /** Настройки списка; нет их — 0, тогда и строк записей с значениями нет */
  settingsId: number;
  /** Владелец вложенного списка (`content-items.3` → 3) */
  ownerId: number | null;
  search: string;
  searchIn: string[];
  filters: RecordFilter[];
  properties: PageProperty[];
  /** Поле записи или свойство (внешнее API); null — без сортировки, по номеру */
  sort: { field: string } | { propertyId: number } | null;
  isDescending: boolean;
  /**
   * Сайт (внешнее API): только активные и хоть раз опубликованные записи,
   * мультидоменные значения — для домена. Без него — как в админке: значения
   * всех доменов, «Изменено» — с правкой свойств.
   */
  site?: { domainId: number | null };
  /** Родитель (внешнее API, `parentId`): null — верхний уровень; не задан — любой */
  parentId?: string | null;
  drafts?: SqlDrafts;
  /** `COLLATE …` для строк — порядок как у `localeCompare('ru')`; пусто — порядок базы */
  collation: string;
}

/**
 * Части запроса: `SELECT … FROM ${from}${joins} WHERE ${where} ORDER BY ${orderBy}`
 * и значения параметров. `joins` нужны только сортировке — `COUNT` без них.
 */
export interface SqlParts {
  from: string;
  joins: string;
  where: string;
  orderBy: string;
  replacements: Record<string, unknown>;
}

type FieldType = 'int' | 'text' | 'bool' | 'date';

interface FieldSql {
  sql: string;
  type: FieldType;
}

const SQL_TYPES: Record<FieldType, string> = { int: 'integer', text: 'text', bool: 'boolean', date: 'timestamptz' };

const PROPERTY_PREFIX = 'property-';

/** Число из строки, как `Number()`: десятичное, со знаком и порядком; иначе NULL. */
const numberOfText = (sql: string) =>
  `(CASE WHEN ${sql} ~ '^\\s*[-+]?([0-9]+\\.?[0-9]*|\\.[0-9]+)([eE][-+]?[0-9]+)?\\s*$' THEN (${sql})::float8 END)`;

/** Текст HTML без разметки — как `htmlText` у отбора в памяти. */
const htmlTextOf = (sql: string) =>
  `btrim(regexp_replace(regexp_replace(${sql}, '<[^>]*>', ' ', 'g'), '\\s+', ' ', 'g'))`;

/** Сборщик одного запроса: параметры нумеруются сами, имена не сталкиваются. */
class Builder {
  readonly replacements: Record<string, unknown> = {};
  private next = 0;

  constructor(readonly selection: SqlSelection) {}

  param(value: unknown): string {
    const name = `p${this.next++}`;
    this.replacements[name] = value;
    return `:${name}`;
  }

  /** Псевдоним строки значений в подзапросе: у каждого поля фильтра свой */
  alias(): string {
    return `v${this.next++}`;
  }

  /** `IN (…)`; пустой перечень — ничего не находит */
  isIn(sql: string, items: unknown[]): string {
    return items.length === 0 ? 'FALSE' : `${sql} IN (${this.param(items)})`;
  }
}

/** Поле записи раздела — колонкой; неизвестное поле — null (у записи его нет). */
function fieldOf(key: string, { table, site }: SqlSelection): FieldSql | null {
  switch (key) {
    case 'id':
      return { sql: 's.id', type: 'int' };
    case 'code':
      return { sql: `COALESCE(s.code, '')`, type: 'text' };
    case 'name':
      return { sql: 's.name', type: 'text' };
    case 'isActive':
      return { sql: 's."isActive"', type: 'bool' };
    case 'sort':
      return { sql: 's.sort', type: 'int' };
    case 'createdAt':
      return { sql: 's."createdAt"', type: 'date' };
    // «Изменено» в админке — и правка свойств (`withEditedAt`); сайт видит правку записи
    case 'updatedAt':
      return { sql: site ? 's."updatedAt"' : 'GREATEST(s."updatedAt", r."updatedAt")', type: 'date' };
    case 'authorId':
      return { sql: 's."userId"', type: 'int' };
    case 'externalId':
      return { sql: 'r."externalId"', type: 'text' };
    case 'parentId':
      return table.hasParent ? { sql: 's."parentId"', type: 'int' } : null;
  }
  return table.owner !== undefined && key === table.owner ? { sql: `s."${table.owner}"`, type: 'int' } : null;
}

/** Поле текстом — как `textOf` отбора в памяти: даты ISO, логическое — `true`/`false`. */
function textOfField(field: FieldSql | null): string {
  if (field === null) return `''`;
  switch (field.type) {
    case 'int':
      return `COALESCE(${field.sql}::text, '')`;
    case 'bool':
      return `COALESCE(${field.sql}::text, '')`;
    case 'date':
      return `COALESCE(to_char(${field.sql} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '')`;
    case 'text':
      return `COALESCE(${field.sql}, '')`;
  }
}

/**
 * Есть ли значение в строке `v`: колонка своего типа заполнена, у привязки —
 * ссылка своего списка (чужие отбрасывает и чтение значений).
 */
function presentOf(b: Builder, property: PageProperty, v: string): string {
  switch (property.type) {
    case PropertyType.Number:
      return `${v}.number IS NOT NULL`;
    case PropertyType.File:
    case PropertyType.Image:
      return `(${v}.number IS NOT NULL OR (${v}.text IS NOT NULL AND ${v}.text <> ''))`;
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return `${v}."optionId" IS NOT NULL`;
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
      return `(${v}.json->>'listKey' = ${b.param(property.linkList ?? '')} AND ${v}.json->>'recordId' IS NOT NULL)`;
    case PropertyType.Table:
      return `${v}.json IS NOT NULL`;
    default:
      return `(${v}.text IS NOT NULL AND ${v}.text <> '')`;
  }
}

/**
 * Строки значений свойства, которые видит отбор, — как их собирает чтение
 * (`valuesMap`) и видит фильтр в памяти:
 * - у обычного свойства — общие строки (уникальные значения доменов остались
 *   от мультидоменного прошлого и не читаются);
 * - у мультидоменного в админке — строки всех доменов, на сайте — значение
 *   домена: своя группа сильнее общей, общая не действует на «кроме»;
 * - у одиночного — первая строка группы: множественность могли выключить,
 *   а строки остались.
 */
function effectiveOf(b: Builder, property: PageProperty, v: string): string {
  const parts = [`${v}."propertyId" = ${Number(property.id)}`, presentOf(b, property, v)];
  const site = b.selection.site;

  if (property.isMultiDomain !== true) {
    parts.push(`${v}."domainIds" IS NULL`);
  } else if (site !== undefined) {
    if (site.domainId === null) {
      parts.push(`${v}."domainIds" IS NULL`);
    } else {
      const domain = `ARRAY[${Number(site.domainId)}]::int[]`;
      const o = `${v}o`;
      parts.push(
        `(${v}."domainIds" @> ${domain} OR (${v}."domainIds" IS NULL` +
          ` AND NOT (${Number(site.domainId)} = ANY(COALESCE(${v}."exceptDomainIds", '{}')))` +
          ` AND NOT EXISTS (SELECT 1 FROM infoblock_values ${o} WHERE ${o}."recordId" = ${v}."recordId"` +
          ` AND ${o}."propertyId" = ${v}."propertyId" AND ${o}."domainIds" @> ${domain} AND ${presentOf(b, property, o)})))`,
      );
    }
  }

  // У обычного свойства первая строка — всегда `sort = 0`: сохранение пишет
  // строки свойства заново, с нуля, и общая группа идёт первой. У мультидоменного
  // так только у общей группы — у групп доменов первую ищем
  if (property.multiple !== true && property.isMultiDomain !== true) {
    parts.push(`${v}.sort = 0`);
  } else if (property.multiple !== true) {
    const e = `${v}e`;
    parts.push(
      `NOT EXISTS (SELECT 1 FROM infoblock_values ${e} WHERE ${e}."recordId" = ${v}."recordId"` +
        ` AND ${e}."propertyId" = ${v}."propertyId" AND ${e}."domainIds" IS NOT DISTINCT FROM ${v}."domainIds"` +
        ` AND ${e}.sort < ${v}.sort AND ${presentOf(b, property, e)})`,
    );
  }
  return parts.join(' AND ');
}

/** Значение строки `v` текстом — как `String(item)` у фильтра в памяти; у таблицы и привязки — null. */
function valueTextOf(property: PageProperty, v: string): string | null {
  switch (property.type) {
    case PropertyType.Number:
      return `${v}.number::text`;
    case PropertyType.File:
    case PropertyType.Image:
      return `COALESCE(${v}.number::text, ${v}.text)`;
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return `${v}."optionId"::text`;
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
    case PropertyType.Table:
      return null;
    case PropertyType.Html:
      return htmlTextOf(`${v}.text`);
    default:
      return `${v}.text`;
  }
}

/** Значение строки `v` числом — как `Number(item)`; у таблицы и привязки — null. */
function valueNumberOf(property: PageProperty, v: string): string | null {
  switch (property.type) {
    case PropertyType.Number:
    case PropertyType.File:
    case PropertyType.Image:
      return `${v}.number`;
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return `${v}."optionId"`;
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
    case PropertyType.Table:
      return null;
    default:
      return numberOfText(`${v}.text`);
  }
}

/** Диапазон над выражением: границы, которых нет, не проверяются. */
function rangeOf(b: Builder, sql: string, from: number | null, to: number | null): string {
  const parts = [`${sql} IS NOT NULL`];
  if (from !== null) parts.push(`${sql} >= ${b.param(from)}`);
  if (to !== null) parts.push(`${sql} <= ${b.param(to)}`);
  return parts.join(' AND ');
}

/** Поле фильтра по полю записи: у записи значение одно — само поле текстом. */
function fieldFilterOf(b: Builder, filter: RecordFilter): string {
  const field = fieldOf(filter.key, b.selection);
  const text = isBooleanField(filter.key)
    ? field === null
      ? `'false'`
      : `(CASE WHEN ${field.sql} IS TRUE THEN 'true' ELSE 'false' END)`
    : textOfField(field);

  switch (filter.kind) {
    case FilterKind.Options:
      return b.isIn(text, filter.codes);
    case FilterKind.Text:
      return `strpos(lower(${text}), ${b.param(filter.text.trim().toLowerCase())}) > 0`;
    case FilterKind.Range:
      return rangeOf(b, field?.type === 'int' ? field.sql : numberOfText(text), filter.from, filter.to);
    case FilterKind.Filled:
      return filter.isFilled ? `${text} <> ''` : `${text} = ''`;
  }
}

/** Поле фильтра по свойству: есть ли у записи значение, которое подходит. */
function propertyFilterOf(b: Builder, filter: RecordFilter, property: PageProperty | undefined): string {
  // Свойство удалили, а поле в фильтре осталось — оно ничего не находит
  if (property === undefined) return filter.kind === FilterKind.Filled && !filter.isFilled ? 'TRUE' : 'FALSE';
  const v = b.alias();
  const exists = (match: string) =>
    `EXISTS (SELECT 1 FROM infoblock_values ${v} WHERE ${v}."recordId" = r.id AND ${effectiveOf(b, property, v)}` +
    `${match === 'TRUE' ? '' : ` AND ${match}`})`;

  switch (filter.kind) {
    case FilterKind.Options:
      return exists(optionsMatchOf(b, filter.codes, property, v));
    case FilterKind.Text: {
      const text = valueTextOf(property, v);
      return text === null ? 'FALSE' : exists(`strpos(lower(${text}), ${b.param(filter.text.trim().toLowerCase())}) > 0`);
    }
    case FilterKind.Range: {
      const number = valueNumberOf(property, v);
      return number === null ? 'FALSE' : exists(rangeOf(b, number, filter.from, filter.to));
    }
    case FilterKind.Filled:
      return filter.isFilled ? exists('TRUE') : `NOT ${exists('TRUE')}`;
  }
}

/** Варианты фильтра: номер варианта «Списка», `список/запись` привязки, иначе значение текстом. */
function optionsMatchOf(b: Builder, codes: string[], property: PageProperty, v: string): string {
  switch (property.type) {
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return b.isIn(`${v}."optionId"`, codes.filter((code) => /^\d+$/.test(code)).map(Number));
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink: {
      // Ссылки чужого списка в значениях не видны, поэтому и выбрать их нельзя
      const prefix = `${property.linkList ?? ''}/`;
      const ids = codes.filter((code) => code.startsWith(prefix)).map((code) => code.slice(prefix.length));
      return b.isIn(`${v}.json->>'recordId'`, ids);
    }
    case PropertyType.Table:
      return 'FALSE';
    default:
      return b.isIn(valueTextOf(property, v) as string, codes);
  }
}

/** Поиск: номер записи целиком (с `#` или без), поля из `searchIn` — подстрокой. */
function searchOf(b: Builder): string | null {
  const search = b.selection.search.trim().toLowerCase();
  if (search === '') return null;
  const needle = b.param(search);
  const fields = b.selection.searchIn.flatMap((key) => {
    const field = fieldOf(key, b.selection);
    return field === null ? [] : [`strpos(lower(${textOfField(field)}), ${needle}) > 0`];
  });
  return `(${[`s.id::text = ${b.param(search.replace(/^#/, ''))}`, ...fields].join(' OR ')})`;
}

/** Все условия отбора: владелец, сайт, родитель, поиск, фильтр — с черновиками. */
function whereOf(b: Builder): string {
  const { selection } = b;
  const fixed: string[] = [];
  if (selection.table.owner !== undefined) {
    fixed.push(`s."${selection.table.owner}" = ${b.param(selection.ownerId ?? 0)}`);
  }
  if (selection.site !== undefined) {
    fixed.push(
      `s."isActive" IS NOT FALSE`,
      `NOT EXISTS (SELECT 1 FROM infoblock_drafts d WHERE d."settingsId" = ${Number(selection.settingsId)}` +
        ` AND d."recordKey" = s.id::text AND d."isNew")`,
    );
  }
  if (selection.parentId !== undefined && selection.table.hasParent) {
    fixed.push(selection.parentId === null ? `s."parentId" IS NULL` : `s."parentId"::text = ${b.param(selection.parentId)}`);
  }

  const byId = new Map(selection.properties.map((property) => [property.id, property]));
  const search = searchOf(b);
  const matched = [
    ...(search === null ? [] : [search]),
    ...selection.filters.map((filter) =>
      filter.key.startsWith(PROPERTY_PREFIX)
        ? propertyFilterOf(b, filter, byId.get(Number(filter.key.slice(PROPERTY_PREFIX.length))))
        : fieldFilterOf(b, filter),
    ),
  ];

  // Записи с черновиком оценены памятью: из них проходят только `matching`.
  // Без поиска и фильтра проходят все — и с черновиком тоже
  let found = matched.length === 0 ? 'TRUE' : matched.join(' AND ');
  const drafts = selection.drafts;
  if (drafts !== undefined && drafts.ids.length > 0 && matched.length > 0) {
    found = `((${found}) AND s.id NOT IN (${b.param(drafts.ids)}))`;
    if (drafts.matching.length > 0) found += ` OR s.id IN (${b.param(drafts.matching)})`;
  }
  return [...fixed, `(${found})`].join(' AND ');
}

/** Значение черновика для сортировки — в тип колонки; не подходит под тип — пусто. */
function draftKeyOf(value: unknown, type: FieldType): unknown {
  switch (type) {
    case 'int':
      return Number.isInteger(value) ? value : null;
    case 'bool':
      return typeof value === 'boolean' ? value : null;
    case 'text':
      return typeof value === 'string' ? value : null;
    case 'date':
      return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null;
  }
}

/**
 * Сортировка — как `comparatorOf` отбора в памяти: пустое в конце в любую
 * сторону, строки — по-русски, равные — новые выше (номер по убыванию).
 */
function orderOf(b: Builder): { joins: string; orderBy: string } {
  const { selection } = b;
  const direction = selection.isDescending ? 'DESC' : 'ASC';
  const byId = `s.id DESC`;
  const sort = selection.sort;
  if (sort === null) return { joins: '', orderBy: byId };

  let key: FieldSql | null;
  let joins = '';
  if ('propertyId' in sort) {
    const property = selection.properties.find((item) => item.id === sort.propertyId);
    // У множественного значение — список, в памяти он «пустой»: порядок по номеру
    if (property === undefined || property.multiple === true) return { joins: '', orderBy: byId };
    const isNumber = property.type === PropertyType.Number;
    const column = isNumber ? 'sv.number' : 'sv.text';
    // Сортируют только по одиночному свойству: у обычного строка значения
    // одна — простое соединение; у мультидоменного строку домена выбирает подзапрос
    joins =
      property.isMultiDomain === true
        ? ` LEFT JOIN LATERAL (SELECT ${column} AS k FROM infoblock_values sv` +
          ` WHERE sv."recordId" = r.id AND ${effectiveOf(b, property, 'sv')} ORDER BY sv.sort LIMIT 1) sk ON TRUE`
        : ` LEFT JOIN (SELECT sv."recordId", ${column} AS k FROM infoblock_values sv` +
          ` WHERE ${effectiveOf(b, property, 'sv')}) sk ON sk."recordId" = r.id`;
    key = { sql: 'sk.k', type: isNumber ? 'int' : 'text' };
  } else {
    key = fieldOf(sort.field, selection);
  }
  if (key === null) return { joins: '', orderBy: byId };

  // Черновик меняет поле сортировки — его значение подставляется вместо колонки
  const keys = Array.from(selection.drafts?.sortKeys ?? []);
  if (keys.length > 0 && !('propertyId' in sort)) {
    const rows = keys.map(([id, value]) => `(${Number(id)}, CAST(${b.param(draftKeyOf(value, key!.type))} AS ${SQL_TYPES[key!.type]}))`);
    joins += ` LEFT JOIN (VALUES ${rows.join(', ')}) AS dk(id, k) ON dk.id = s.id`;
    key = { sql: `(CASE WHEN dk.id IS NOT NULL THEN dk.k ELSE ${key.sql} END)`, type: key.type };
  }

  // Время — с точностью до миллисекунд, как его видит JS: иначе равные в памяти
  // записи база развела бы по микросекундам
  if (key.type === 'date') key = { sql: `date_trunc('milliseconds', ${key.sql})`, type: 'date' };
  const isEmpty = key.type === 'text' ? `(${key.sql} IS NULL OR ${key.sql} = '')` : `(${key.sql} IS NULL)`;
  const collated = key.type === 'text' && selection.collation !== '' ? `${key.sql} ${selection.collation}` : key.sql;
  return { joins, orderBy: `${isEmpty} ASC, ${collated} ${direction}, ${byId}` };
}

/** Запрос отбора по частям. */
export function selectionSql(selection: SqlSelection): SqlParts {
  const b = new Builder(selection);
  const where = whereOf(b);
  const { joins, orderBy } = orderOf(b);
  return { from: fromOf(selection), joins, where, orderBy, replacements: b.replacements };
}

/** Таблица раздела со строками записей: у записи без значений строки нет — `LEFT JOIN`. */
const fromOf = ({ table, settingsId }: SqlSelection): string =>
  `"${table.table}" s LEFT JOIN infoblock_records r` +
  ` ON r."settingsId" = ${Number(settingsId)} AND r."recordKey" = s.id::text`;

/**
 * Подсчёт значений свойств `facets` у отобранных записей — фасеты одним
 * запросом: строка на свойство и значение (вариант, привязанная запись),
 * у чисел — одна строка с границами.
 */
export function tallySql(selection: SqlSelection, facets: PageProperty[]): { sql: string; replacements: Record<string, unknown> } {
  const b = new Builder({ ...selection, sort: null, drafts: undefined });
  const where = whereOf(b);
  const keyOf = (property: PageProperty): string => {
    switch (property.type) {
      case PropertyType.List:
      case PropertyType.ListOptionLink:
        return `v."optionId"::text`;
      case PropertyType.ContentLink:
      case PropertyType.ContentTypeLink:
        return `v.json->>'recordId'`;
      default:
        return 'NULL';
    }
  };
  const cases = facets.map((property) => `WHEN ${Number(property.id)} THEN ${keyOf(property)}`).join(' ');
  const effective = facets.map((property) => `(${effectiveOf(b, property, 'v')})`).join(' OR ');
  const sql =
    `WITH base AS MATERIALIZED (SELECT r.id FROM "${selection.table.table}" s JOIN infoblock_records r` +
    ` ON r."settingsId" = ${Number(selection.settingsId)} AND r."recordKey" = s.id::text WHERE ${where})` +
    ` SELECT v."propertyId" AS "propertyId", CASE v."propertyId" ${cases} END AS "key",` +
    ` COUNT(*)::int AS "count", MIN(v.number) AS "min", MAX(v.number) AS "max"` +
    ` FROM base JOIN infoblock_values v ON v."recordId" = base.id` +
    ` WHERE ${effective === '' ? 'FALSE' : effective} GROUP BY 1, 2`;
  return { sql, replacements: b.replacements };
}
