/**
 * Ключи списков раздела «Контент». Ключ списка — он же тип записи в журнале.
 *
 * Отдельным файлом, а не в сервисах: реестр видов списков (`infoblock-kinds.ts`)
 * берёт ключи отсюда, а сервисы сами читают реестр — константа в сервисе
 * замкнула бы импорты в кольцо.
 */
export const CONTENTS_LIST = 'contents';

/** Вид списков элементов: у каждого типа свой список `content-items.<номер типа>`. */
export const CONTENT_ITEMS_KIND = 'content-items';

/** Список элементов одного типа: свойства у элементов каждого типа свои. */
export const contentItemsList = (contentId: number): string =>
  `${CONTENT_ITEMS_KIND}.${contentId}`;
