import { BadRequestException } from '@nestjs/common';
import { CONTENTS_LIST } from '../infoblocks/contents/content-lists';
import { FilterKind, type PageRow, type RecordFilter, type RecordValues } from '../infoblocks/records/records-page';
import {
  externalFileName,
  isExternalUrl,
  isLinkType,
  linkKey,
  PropertyType,
  type ContentLink,
  type DomainGroup,
  type PropertyDef,
} from '../infoblocks/settings/properties/property';

/**
 * Значения записей глазами внешнего API: свойство — по коду, «Список» — кодом
 * варианта, файл — с адресом, привязка — с названием записи, мультидоменное —
 * значение одного домена. Фильтр `filter[код]` переводится в поля общего
 * отбора (`records-page.ts`), фасеты считаются по отобранным записям.
 *
 * Чистые функции: ни Nest-сервисов, ни базы — правила проверяются тестом.
 */

/** Свойство, которое API отдаёт: не скрытое, сохранённое (с номером). */
export type ApiPropertyDef = PropertyDef & { id: number };

/**
 * Файл или изображение в ответе. Внешний файл (значение — адрес, файл лежит
 * на чужом сервере) приходит той же формой: без номера, типа и веса, с `isExternal`.
 */
export interface ApiFile {
  id: number | null;
  name: string;
  url: string;
  mimeType: string | null;
  size: number | null;
  isExternal: boolean;
}

/** Внешний файл в ответе: всё, что о нём известно, — адрес. */
export const externalApiFile = (url: string): ApiFile => ({
  id: null,
  name: externalFileName(url),
  url,
  mimeType: null,
  size: null,
  isExternal: true,
});

/** Привязка к записи в ответе: список, номер и название записи. */
export interface ApiLink {
  list: string;
  id: number | string;
  name: string | null;
}

/**
 * Что нужно, чтобы показать значения: файлы по номеру, названия привязанных
 * записей по `список/запись` и раскрытые привязки (`expand`) — номер свойства →
 * связанные записи целиком по `список/запись`.
 */
export interface ValueContext {
  files: Map<number, ApiFile>;
  linkNames: Map<string, string | null>;
  expanded: Map<number, Map<string, unknown>>;
}

/** Типы, по которым строят фильтр, — у них есть фасеты. */
export const FACET_TYPES: ReadonlySet<PropertyType> = new Set([
  PropertyType.Number,
  PropertyType.List,
  PropertyType.ListOptionLink,
  PropertyType.ContentLink,
  PropertyType.ContentTypeLink,
]);

/** Номер записи числом, если он число: у страниц `"12"`, у старых списков бывают ключи вида `element-7`. */
export const recordIdOf = (recordId: string): number | string =>
  /^\d+$/.test(recordId) ? Number(recordId) : recordId;

/** Откуда записи привязки: у привязки к типу контента — всегда типы. */
export const linkListOf = (property: PropertyDef): string =>
  property.type === PropertyType.ContentTypeLink ? CONTENTS_LIST : property.linkList;

/**
 * Значение мультидоменного свойства для домена: уникальное значение домена
 * сильнее общего; общее не действует на домены из «кроме». Без домена —
 * общее значение.
 */
export function domainValue(stored: unknown, domainId: number | null): unknown {
  if (!Array.isArray(stored)) return stored ?? null;
  const groups = stored as DomainGroup[];
  if (domainId !== null) {
    const own = groups.find((group) => group.domainIds !== null && group.domainIds.includes(domainId));
    if (own) return own.value;
  }
  const common = groups.find((group) => group.domainIds === null);
  if (!common) return null;
  if (domainId !== null && (common.exceptDomainIds ?? []).includes(domainId)) return null;
  return common.value;
}

/**
 * Значения записей так, как их видит API: только отдаваемые свойства,
 * мультидоменные — уже для одного домена. По ним же и фильтруют: фильтр
 * на домене ищет по значениям этого домена.
 */
export function apiValues(stored: RecordValues, properties: ApiPropertyDef[], domainId: number | null): RecordValues {
  const result: RecordValues = new Map();
  stored.forEach((byProperty, recordId) => {
    const own = new Map<number, unknown>();
    for (const property of properties) {
      const value = byProperty.get(property.id);
      if (value === undefined) continue;
      own.set(property.id, property.isMultiDomain ? domainValue(value, domainId) : value);
    }
    result.set(recordId, own);
  });
  return result;
}

/** Значения свойства у записи — списком: у пустого ни одного, у множественного несколько. */
export const itemsOf = (value: unknown): unknown[] =>
  value === null || value === undefined || value === '' ? [] : Array.isArray(value) ? value : [value];

/**
 * Значение свойства в ответе. Пустое — `null`, у множественного — `[]`:
 * ключ свойства в `properties` есть всегда, сайту не нужно проверять, есть ли он.
 */
export function apiValue(property: ApiPropertyDef, value: unknown, context: ValueContext): unknown {
  const one = (item: unknown): unknown => {
    switch (property.type) {
      case PropertyType.List:
      case PropertyType.ListOptionLink:
        return property.options.find((option) => option.id === item)?.code ?? null;
      case PropertyType.File:
      case PropertyType.Image:
        return isExternalUrl(item) ? externalApiFile(item) : context.files.get(Number(item)) ?? null;
      case PropertyType.ContentLink:
      case PropertyType.ContentTypeLink: {
        const link = item as ContentLink;
        // Связанной записи API не отдаёт (удалена, выключена, черновик) — привязка как без expand
        const record = context.expanded.get(property.id)?.get(linkKey(link));
        if (record !== undefined) return record;
        return {
          list: link.listKey,
          id: recordIdOf(link.recordId),
          name: context.linkNames.get(linkKey(link)) ?? null,
        } satisfies ApiLink;
      }
      default:
        return item;
    }
  };
  if (property.multiple) return itemsOf(value).map(one).filter((item) => item !== null);
  return value === null || value === undefined || value === '' ? null : one(value);
}

/**
 * Можно ли раскрыть привязку: да, если её список-источник API отдаёт
 * (`targets` — ключи списков API и типы контента; набор или словарь по ключу).
 * Привязка к ролям или к пользователям раскрылась бы в то, чего наружу не показывают.
 */
export const isExpandable = (property: ApiPropertyDef, targets: { has(listKey: string): boolean }): boolean =>
  isLinkType(property.type) && targets.has(linkListOf(property));

/** `expand=categories,brand` — в раскрываемые свойства. Непонятное — 400, как у фильтра. */
export function parseExpand(raw: string | undefined, properties: ApiPropertyDef[], targets: ReadonlySet<string>): ApiPropertyDef[] {
  const codes = Array.from(new Set((raw ?? '').split(',').map((code) => code.trim()).filter((code) => code !== '')));
  return codes.map((code) => {
    const property = properties.find((item) => item.code === code);
    if (!property) throw new BadRequestException(`Нет свойства «${code}»`);
    if (!isLinkType(property.type)) throw new BadRequestException(`«${code}» не привязка: раскрывают только привязки`);
    if (!isExpandable(property, targets)) throw new BadRequestException(`«${code}» привязано к списку, которого нет в API`);
    return property;
  });
}

/** Поле фильтра и чьё оно: фасет свойства не учитывает собственный выбор. */
export interface ApiFilter {
  propertyId: number;
  filter: RecordFilter;
  /** У привязки — номера выбранных записей: по ним записи сначала отбирают в базе */
  linkIds?: string[];
}

/**
 * `filter[код]=…` из адреса — в поля общего отбора. Express уже разобрал
 * скобки: приходит объект `{ brand: 'bosch,thule', price: { gte: '1000' } }`.
 * Непонятное — 400: молча отбросить фильтр значило бы отдать не то, что просили.
 */
export function parseApiFilters(raw: unknown, properties: ApiPropertyDef[]): ApiFilter[] {
  if (raw === undefined || raw === null || raw === '') return [];
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BadRequestException('Фильтр задаётся так: filter[код свойства]=значение');
  }
  return Object.entries(raw as Record<string, unknown>).map(([code, value]) => {
    const property = properties.find((item) => item.code === code);
    if (!property) throw new BadRequestException(`Нет свойства «${code}»`);
    const filter = filterOf(property, value);
    return isLinkType(property.type)
      ? { propertyId: property.id, filter, linkIds: listOf(property, value) }
      : { propertyId: property.id, filter };
  });
}

function filterOf(property: ApiPropertyDef, value: unknown): RecordFilter {
  const key = `property-${property.id}`;
  switch (property.type) {
    case PropertyType.Number: {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const { gte, lte, ...rest } = value as Record<string, unknown>;
        if (Object.keys(rest).length > 0) {
          throw new BadRequestException(`У числа «${property.code}» — только [gte] и [lte]`);
        }
        return { key, kind: FilterKind.Range, from: boundOf(property, gte), to: boundOf(property, lte) };
      }
      const exact = boundOf(property, value);
      return { key, kind: FilterKind.Range, from: exact, to: exact };
    }
    case PropertyType.List:
    case PropertyType.ListOptionLink: {
      const codes = listOf(property, value);
      const ids = property.options.flatMap((option) =>
        option.id !== undefined && codes.includes(option.code) ? [String(option.id)] : [],
      );
      return { key, kind: FilterKind.Options, codes: ids };
    }
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink: {
      const list = linkListOf(property);
      return { key, kind: FilterKind.Options, codes: listOf(property, value).map((id) => `${list}/${id}`) };
    }
    case PropertyType.String:
    case PropertyType.Text:
    case PropertyType.Html:
      if (typeof value !== 'string') throw new BadRequestException(`У «${property.code}» фильтр — строка`);
      return { key, kind: FilterKind.Text, text: value };
    default:
      throw new BadRequestException(`По свойству «${property.code}» не фильтруют`);
  }
}

/** Несколько значений: через запятую или повтором параметра. */
function listOf(property: ApiPropertyDef, value: unknown): string[] {
  const parts = Array.isArray(value) ? value : [value];
  if (!parts.every((part) => typeof part === 'string')) {
    throw new BadRequestException(`У «${property.code}» фильтр — значения через запятую`);
  }
  return (parts as string[])
    .flatMap((part) => part.split(','))
    .map((part) => part.trim())
    .filter((part) => part !== '');
}

function boundOf(property: ApiPropertyDef, value: unknown): number | null {
  if (value === undefined || value === '') return null;
  const number = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(number)) throw new BadRequestException(`У «${property.code}» граница — число`);
  return number;
}

/** Фасет «Списка»: каждый вариант и сколько записей с ним. */
export interface OptionsFacet {
  type: 'list';
  values: { value: string; label: string; count: number }[];
}

/** Фасет привязки: записи, к которым привязаны, и сколько раз. */
export interface LinksFacet {
  type: 'content-link';
  values: (ApiLink & { count: number })[];
}

/** Фасет числа: диапазон значений; записей без значения — нет. */
export interface RangeFacet {
  type: 'number';
  min: number | null;
  max: number | null;
}

export type ApiFacet = OptionsFacet | LinksFacet | RangeFacet;

/** Фасет свойства по уже отобранным записям. */
export function facetOf(
  property: ApiPropertyDef,
  rows: PageRow[],
  values: RecordValues,
  linkNames: Map<string, string | null>,
): ApiFacet {
  // Циклом, а не flatMap: у фасета по всему списку записей тысячи
  const items: unknown[] = [];
  for (const row of rows) items.push(...itemsOf(values.get(String(row.id))?.get(property.id)));

  if (property.type === PropertyType.Number) {
    const numbers = items.map(Number).filter((number) => Number.isFinite(number));
    return {
      type: 'number',
      min: numbers.length ? numbers.reduce((a, b) => Math.min(a, b)) : null,
      max: numbers.length ? numbers.reduce((a, b) => Math.max(a, b)) : null,
    };
  }

  if (property.type === PropertyType.List || property.type === PropertyType.ListOptionLink) {
    const counts = countOf(items.map(String));
    return {
      type: 'list',
      values: property.options.map((option) => ({
        value: option.code,
        label: option.name,
        count: counts.get(String(option.id)) ?? 0,
      })),
    };
  }

  const links = new Map(items.map((item) => [linkKey(item as ContentLink), item as ContentLink]));
  const counts = countOf(items.map((item) => linkKey(item as ContentLink)));
  return {
    type: 'content-link',
    values: Array.from(counts, ([key, count]) => {
      const link = links.get(key) as ContentLink;
      return { list: link.listKey, id: recordIdOf(link.recordId), name: linkNames.get(key) ?? null, count };
    }).sort((a, b) => b.count - a.count),
  };
}

const countOf = (keys: string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  keys.forEach((key) => counts.set(key, (counts.get(key) ?? 0) + 1));
  return counts;
};
