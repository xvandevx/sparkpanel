/**
 * Где в панели открывается запись списка: страница списка плюс номер записи
 * в адресе (`?id=7`) — по нему редактор контента сам откроет карточку.
 * Чистые функции: ни React, ни сети.
 */

/** Параметр адреса, в котором редактор контента держит открытую запись. */
export const RECORD_PARAM = 'id';

/** Списки со своей страницей. Чего здесь нет, своей страницы пока не имеет. */
const LIST_PATHS: Record<string, string> = {
  pages: '/admin/pages',
  contents: '/admin/contents',
  products: '/admin/products',
  'product-categories': '/admin/products/categories',
  'file-sections': '/admin/files',
  users: '/admin/users',
  roles: '/admin/users/roles',
  storages: '/admin/settings/storages',
  domains: '/admin/settings/domains',
};

/** Вложенные списки: ключ с номером владельца → страница этого владельца. */
const NESTED_PATHS: [prefix: string, path: (id: string) => string][] = [
  ['content-items.', (id) => `/admin/contents/${id}`],
  ['files.', (id) => `/admin/files/${id}`],
  ['property-files.', (id) => `/admin/files/property-${id}`],
];

/** Страница списка по его ключу; null — у списка своей страницы нет (формы, инфоблоки). */
export const listPagePath = (listKey: string): string | null => {
  if (listKey in LIST_PATHS) return LIST_PATHS[listKey];
  const nested = NESTED_PATHS.find(([prefix]) => listKey.startsWith(prefix));
  return nested ? nested[1](listKey.slice(nested[0].length)) : null;
};

/** Адрес записи: страница её списка с открытой карточкой; null — открыть негде. */
export const recordPagePath = (listKey: string, recordId: string): string | null => {
  const path = listPagePath(listKey);
  return path === null ? null : `${path}?${RECORD_PARAM}=${encodeURIComponent(recordId)}`;
};
