/**
 * Адреса раздела «Инфоблоки». Уровни — настоящие страницы, а не параметры
 * запроса: по ним строится подменю слева, и подсветка активного пункта
 * работает обычным сравнением путей.
 *
 * Открытая в шторке запись живёт рядом, в `?id=` — этим занимается общий
 * `useRecordRoute` редактора контента.
 */

export const INFOBLOCKS_ROOT = '/admin/infoblocks';

export const sectionPath = (sectionId: number): string => `${INFOBLOCKS_ROOT}/${sectionId}`;

export const blockPath = (sectionId: number, blockId: number): string =>
  `${INFOBLOCKS_ROOT}/${sectionId}/${blockId}`;
