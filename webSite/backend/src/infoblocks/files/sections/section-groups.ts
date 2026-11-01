import { CONTENT_ITEMS_KIND } from '../../contents/content-lists';

/**
 * Группы над разделами свойств: одна на список, в названии — путь до списка,
 * как он лежит в меню панели: «Контент / SEO / Мета-теги по цветам»,
 * «Товары / Категории».
 *
 * В базе групп нет: сервер собирает их при каждой выдаче разделов. Поэтому
 * их не заводят, не удаляют и не переименовывают — переименовали или
 * перенесли тип контента, и название группы поменялось само.
 */

/** Группа над разделами свойств одного списка. */
export interface SectionGroup {
  /** Ключ списка: группа у списка одна */
  key: string;
  name: string;
}

/** Тип контента — сколько нужно, чтобы подняться от него к корню. */
export interface ContentTypeNode {
  id: number;
  parentId: number | null;
  name: string;
}

/** Разделитель ступеней пути в названии группы. */
const PATH_SEPARATOR = ' / ';

/** Подписи пунктов меню, под которыми лежат списки. */
const MENU_NAMES: Record<string, string> = {
  contents: 'Контент',
  products: 'Товары',
  users: 'Пользователи',
  settings: 'Настройки',
};

/** Список → пункт меню над ним. Нет здесь — список сам верхний пункт. */
const MENU_PARENTS: Record<string, string> = {
  'product-categories': 'products',
  roles: 'users',
  domains: 'settings',
  storages: 'settings',
};

/** Номер группы в выдаче: строкой, чтобы не спутать с номером раздела. */
export const groupId = (key: string): string => `group-${key}`;

/** Номер раздела свойства в выдаче — по номеру свойства: в базе такого раздела нет. */
export const propertySectionId = (propertyId: number): string => `property-${propertyId}`;

/**
 * Путь до списка одной строкой. У элементов типа контента это «Контент»
 * и цепочка типов по `parentId` (кольцо в родителях не зацикливает),
 * у остальных — пункт меню, если список лежит под ним, и сам список.
 */
export function listTitle(listKey: string, listName: string, contentTypes: ContentTypeNode[]): string {
  const itemsPrefix = `${CONTENT_ITEMS_KIND}.`;
  if (listKey.startsWith(itemsPrefix)) {
    const byId = new Map(contentTypes.map((type) => [type.id, type]));
    const chain: string[] = [];
    const seen = new Set<number>();
    let current = byId.get(Number(listKey.slice(itemsPrefix.length)));
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current.name);
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    // Тип не нашёлся — хотя бы имя самого списка
    return [MENU_NAMES.contents, ...(chain.length > 0 ? chain : [listName])].join(PATH_SEPARATOR);
  }

  const parent = MENU_PARENTS[listKey];
  return [...(parent ? [MENU_NAMES[parent]] : []), MENU_NAMES[listKey] ?? listName].join(PATH_SEPARATOR);
}
