import { BadRequestException } from '@nestjs/common';
import { PropertyType } from '../infoblocks/settings/properties/property';
import type { McpField } from './mcp-lists';

/**
 * Чистые функции MCP: как записи и свойства панели выглядят для ассистента
 * и обратно. Панель адресует свойство номером, ассистент — кодом: код
 * читается и не меняется от того, в каком порядке свойства заводили.
 */

/** Свойство списка — как его отдаёт `GET /infoblocks/settings/:listKey/properties`. */
export interface PanelProperty {
  id?: number;
  code: string;
  name: string;
  hint: string;
  type: PropertyType;
  required: boolean;
  multiple: boolean;
  isMultiDomain: boolean;
  isExternal?: boolean;
  options: { id?: number; code: string; name: string }[];
  linkList: string;
  columns: number | null;
  headers: string[];
  formats: string[];
  maxSizeMb: number | null;
}

/** Значение свойства, как его хранит панель: номер свойства → что угодно. */
export interface PanelValue {
  propertyId: number;
  value: unknown;
}

/** Черновик записи — как его отдают `infoblocks/drafts` и страница записей. */
export interface PanelDraft {
  recordId: string;
  fields: Record<string, unknown>;
  values: PanelValue[];
  isNew: boolean;
  authorEmail: string;
  updatedAt: string;
}

const FORMATS: Record<PropertyType, string> = {
  [PropertyType.String]: 'строка',
  [PropertyType.Text]: 'строка, можно в несколько строк',
  [PropertyType.Html]: 'строка с HTML-разметкой',
  [PropertyType.Number]: 'число',
  [PropertyType.File]:
    'номер файла — из upload_file или find_records по списку files.N — или адрес внешнего файла "https://…" (не скачивается)',
  [PropertyType.Image]:
    'номер файла-изображения — из upload_file или find_records по списку files.N — или адрес внешней картинки "https://…" (не скачивается)',
  [PropertyType.List]: 'номер варианта — id из options',
  [PropertyType.ListOptionLink]: 'номер варианта — id из options',
  [PropertyType.ContentLink]: 'ссылка на запись: { "listKey": "content-items.3", "recordId": "12" }',
  [PropertyType.ContentTypeLink]: 'ссылка на тип контента: { "listKey": "contents", "recordId": "3" }',
  [PropertyType.Table]: 'таблица — массив строк, строка — массив ячеек-строк: [["A1", "B1"], ["A2", "B2"]]',
};

/** Каким должно быть значение свойства — подсказка ассистенту в describe_list. */
export function valueFormat(property: PanelProperty): string {
  const one = FORMATS[property.type] ?? 'как в панели';
  const value = property.multiple ? `массив значений, каждое — ${one}` : one;
  if (!property.isMultiDomain) return value;
  return (
    'массив групп по доменам: { "domainIds": null, "exceptDomainIds": [], "value": … } — общее для всех доменов ' +
    `(кроме перечисленных), { "domainIds": [номера доменов], "value": … } — для своих; value — ${value}`
  );
}

/** Свойство для describe_list: только то, что нужно, чтобы прочитать и записать значение. */
export function propertyOut(property: PanelProperty) {
  const isOptions = property.type === PropertyType.List || property.type === PropertyType.ListOptionLink;
  const isFile = property.type === PropertyType.File || property.type === PropertyType.Image;
  const isLink = property.type === PropertyType.ContentLink || property.type === PropertyType.ContentTypeLink;
  return {
    code: property.code,
    name: property.name,
    type: property.type,
    value: valueFormat(property),
    ...(property.hint ? { hint: property.hint } : {}),
    ...(property.required ? { isRequired: true } : {}),
    // Такое свойство заполняет внешняя система, и в панели его не правят — пишет его только MCP
    ...(property.isExternal ? { isExternal: true } : {}),
    ...(isOptions ? { options: property.options.map(({ id, code, name }) => ({ id, code, name })) } : {}),
    ...(isLink && property.linkList ? { linkList: property.linkList } : {}),
    ...(property.type === PropertyType.Table ? { columns: property.columns, headers: property.headers } : {}),
    ...(isFile && property.formats.length > 0 ? { formats: property.formats } : {}),
    ...(isFile && property.maxSizeMb ? { maxSizeMb: property.maxSizeMb } : {}),
  };
}

/** Значения записи по кодам свойств; скрытых панель не отдаёт — их нет и здесь. */
export function propertiesByCode(properties: PanelProperty[], values: PanelValue[]): Record<string, unknown> {
  const codes = new Map(properties.map((property) => [property.id, property.code]));
  return Object.fromEntries(
    values.flatMap(({ propertyId, value }) => {
      const code = codes.get(propertyId);
      return code === undefined ? [] : [[code, value]];
    }),
  );
}

/** Свойства от ассистента (по кодам) — в значения панели (по номерам). Незнакомый код — ошибка. */
export function valuesOf(properties: PanelProperty[], byCode: Record<string, unknown>): PanelValue[] {
  return Object.entries(byCode).map(([code, value]) => {
    const property = properties.find((item) => item.code === code);
    if (!property || property.id === undefined) {
      const known = properties.map((item) => item.code).join(', ') || 'свойств нет';
      throw new BadRequestException(`Нет свойства «${code}». Есть: ${known}`);
    }
    return { propertyId: property.id, value: value === undefined ? null : value };
  });
}

/** Поля записи от ассистента: только те, что принимает раздел, — остальное ошибка, а не тишина. */
export function assertFields(fields: Record<string, unknown>, allowed: McpField[]): void {
  const keys = new Set(allowed.map((field) => field.key));
  const extra = Object.keys(fields).filter((key) => !keys.has(key));
  if (extra.length > 0) {
    throw new BadRequestException(`Таких полей у записи нет: ${extra.join(', ')}. Есть: ${Array.from(keys).join(', ')}`);
  }
}

/** Одни значения поверх других — по номеру свойства: так черновик копит правки. */
export function mergeValues(base: PanelValue[], changes: PanelValue[]): PanelValue[] {
  const merged = new Map(base.map((item) => [item.propertyId, item.value]));
  changes.forEach((item) => merged.set(item.propertyId, item.value));
  return Array.from(merged, ([propertyId, value]) => ({ propertyId, value }));
}

/** Поле фильтра от ассистента: ключ — поле записи или код свойства. */
export interface McpFilter {
  key: string;
  kind: string;
  [rest: string]: unknown;
}

/** Поля фильтра — в вид таблицы панели: свойство там `property-<номер>`. */
export function panelFilters(filters: McpFilter[], properties: PanelProperty[]): Record<string, unknown>[] {
  return filters.map((filter) => ({ ...filter, key: panelKey(filter.key, properties) }));
}

/** Ключ для сортировки и фильтра: поле записи как есть, свойство по коду — номером. */
export function panelKey(key: string, properties: PanelProperty[]): string {
  const property = properties.find((item) => item.code === key);
  return property?.id !== undefined ? `property-${property.id}` : key;
}

/** Служебное, что раздел отдаёт, а ассистенту не нужно. */
const HIDDEN_KEYS = new Set(['userId']);

/** Запись для ассистента: поля раздела, свойства по кодам и, если есть, черновик рядом. */
export function recordOut(
  row: Record<string, unknown>,
  properties: PanelProperty[],
  values: PanelValue[],
  draft: PanelDraft | undefined,
) {
  return {
    ...Object.fromEntries(Object.entries(row).filter(([key]) => !HIDDEN_KEYS.has(key))),
    properties: propertiesByCode(properties, values),
    ...(draft
      ? {
          draft: {
            isNew: draft.isNew,
            fields: draft.fields,
            properties: propertiesByCode(properties, draft.values),
            savedBy: draft.authorEmail,
            savedAt: draft.updatedAt,
          },
        }
      : {}),
  };
}

/** Тип файла по имени — если ассистент его не назвал. */
const MIME_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  zip: 'application/zip',
  mp4: 'video/mp4',
};

export const mimeTypeOf = (fileName: string): string =>
  MIME_TYPES[fileName.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
