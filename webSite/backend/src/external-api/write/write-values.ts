import { BadRequestException } from '@nestjs/common';
import { CONTENTS_LIST } from '../../infoblocks/contents/content-lists';
import { PropertyType, type ContentLink } from '../../infoblocks/settings/properties/property';
import type { PanelValue } from '../../mcp/mcp-values';

/**
 * Свойства записи от интеграции — в значения панели. Интеграция адресует
 * свойство кодом (номер свойства у каждой установки панели свой), вариант
 * «Списка» — номером или кодом, привязку — номером, кодом или внешним ID
 * записи. Панель же ждёт номера: номер свойства, номер варианта,
 * `{ listKey, recordId }`. Остальное (строки, числа, таблицы, группы доменов)
 * уходит как есть — его проверяет маршрут значений, теми же правилами,
 * что и правку из панели.
 */

/** Свойство списка — то, что нужно для перевода значения. */
export interface WriteProperty {
  id?: number;
  code: string;
  name: string;
  type: PropertyType;
  multiple: boolean;
  isMultiDomain: boolean;
  linkList: string;
  options: { id?: number; code: string }[];
}

/** На какую запись указывает привязка: номер, код или внешний ID. */
export type LinkRef = { id: number } | { code: string } | { externalId: string };

/** Номер записи списка по ссылке; нет такой записи — исключение. */
export type LinkResolver = (listKey: string, ref: LinkRef) => Promise<number>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Привязка из тела: `12` — номер, `"bosch"` — код, `{ "externalId": "…" }` —
 * внешний ID. Объектом можно и `{ "id" }`, `{ "code" }` — и то, что отдаёт
 * чтение (`{ list, id, name }`), и формат панели (`{ listKey, recordId }`).
 */
export function linkRefOf(property: WriteProperty, item: unknown): LinkRef {
  if (typeof item === 'number' && Number.isInteger(item)) return { id: item };
  if (typeof item === 'string' && item.trim() !== '') return { code: item.trim() };
  if (isObject(item)) {
    if (typeof item.externalId === 'string' && item.externalId.trim() !== '') return { externalId: item.externalId.trim() };
    if (typeof item.code === 'string' && item.code.trim() !== '') return { code: item.code.trim() };
    const id = item.id ?? item.recordId;
    if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) return { id: Number(id) };
  }
  throw new BadRequestException(
    `Привязка «${property.name}»: номер записи, её код или { "externalId": "…" }, а пришло ${JSON.stringify(item)}`,
  );
}

/** Вариант «Списка» — номером или кодом. Номер проверит маршрут значений; кода нет — 400 здесь. */
export function optionIdOf(property: WriteProperty, item: unknown): unknown {
  if (typeof item !== 'string') return item;
  const option =
    property.options.find((candidate) => candidate.code === item) ??
    property.options.find((candidate) => /^\d+$/.test(item) && candidate.id === Number(item));
  if (option?.id === undefined) {
    const known = property.options.map((candidate) => candidate.code).join(', ') || 'вариантов нет';
    throw new BadRequestException(`У свойства «${property.name}» нет варианта «${item}». Есть: ${known}`);
  }
  return option.id;
}

/** Одно значение свойства (не группа доменов и не массив множественного). */
async function oneValue(property: WriteProperty, item: unknown, resolve: LinkResolver): Promise<unknown> {
  if (item === null) return null;
  switch (property.type) {
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return optionIdOf(property, item);
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink: {
      const listKey = property.type === PropertyType.ContentTypeLink ? CONTENTS_LIST : property.linkList;
      const recordId = await resolve(listKey, linkRefOf(property, item));
      return { listKey, recordId: String(recordId) } satisfies ContentLink;
    }
    case PropertyType.File:
    case PropertyType.Image:
      // Свой файл — номером, внешний — адресом `https://…`. Объект `File`
      // из чтения тоже подходит: у своего берётся номер, у внешнего — адрес
      if (!isObject(item)) return item;
      return item.id !== undefined && item.id !== null ? item.id : item.url;
    default:
      return item;
  }
}

/** Значение свойства: у множественного — массив, каждое переводится отдельно. */
async function valueOf(property: WriteProperty, value: unknown, resolve: LinkResolver): Promise<unknown> {
  if (value === null) return null;
  if (property.multiple && property.type !== PropertyType.Table && Array.isArray(value)) {
    return Promise.all(value.map((item) => oneValue(property, item, resolve)));
  }
  return oneValue(property, value, resolve);
}

/**
 * Свойства по кодам — в значения панели по номерам. Незнакомый код — 400:
 * опечатка в коде иначе молча не записала бы ничего. `null` стирает значение,
 * а свойств, которых в теле нет, правка не касается.
 */
export async function panelValues(
  properties: WriteProperty[],
  byCode: Record<string, unknown>,
  resolve: LinkResolver,
): Promise<PanelValue[]> {
  const result: PanelValue[] = [];
  for (const [code, raw] of Object.entries(byCode)) {
    const property = properties.find((item) => item.code === code);
    if (!property || property.id === undefined) {
      const known = properties.map((item) => item.code).join(', ') || 'свойств нет';
      throw new BadRequestException(`Нет свойства «${code}». Есть: ${known}`);
    }
    const value = raw === undefined ? null : raw;
    // Мультидоменное — группы `{ domainIds, exceptDomainIds, value }`: переводится значение внутри
    const converted =
      property.isMultiDomain && Array.isArray(value)
        ? await Promise.all(
            value.map(async (group) =>
              isObject(group) ? { ...group, value: await valueOf(property, group.value ?? null, resolve) } : group,
            ),
          )
        : await valueOf(property, value, resolve);
    result.push({ propertyId: property.id, value: converted });
  }
  return result;
}
