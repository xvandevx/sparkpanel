import { CATEGORIES_LIST, PRODUCTS_LIST } from '../infoblocks/products/product-lists';

/**
 * Какие списки панели видны во внешнем API и где: адрес, раздел в документации,
 * поля записи. Типы контента добавляются сюда же при запросе — по одному
 * списку на тип, адрес — код типа.
 */

/** Поле записи раздела (не свойство): ключ в ответе и что оно значит. */
export type RecordField = 'id' | 'code' | 'name' | 'parentId' | 'sort' | 'path' | 'address' | 'createdAt' | 'updatedAt';

export interface ApiList {
  /** Ключ списка панели: по нему читаются записи, свойства и значения */
  listKey: string;
  /** Адрес методов списка от `/api/v1` */
  path: string;
  /** Группа в меню документации: «Сайт» (страницы, домены), «Контент», «Каталог» */
  group: string;
  name: string;
  /** Имя схемы записи в спецификации */
  schema: string;
  /** Поля записи в ответе, в этом порядке */
  fields: RecordField[];
  /** Поля, по которым ищет `search`, кроме номера */
  searchIn: RecordField[];
}

const RECORD: RecordField[] = ['id', 'code', 'name', 'sort', 'createdAt', 'updatedAt'];
const TREE_RECORD: RecordField[] = ['id', 'code', 'name', 'parentId', 'sort', 'createdAt', 'updatedAt'];

export const PAGES_API: ApiList = {
  listKey: 'pages',
  path: '/pages',
  group: 'Сайт',
  name: 'Страницы',
  schema: 'Page',
  fields: [...TREE_RECORD, 'path'],
  searchIn: ['name', 'code', 'path'],
};

export const DOMAINS_API: ApiList = {
  listKey: 'domains',
  path: '/domains',
  group: 'Сайт',
  name: 'Домены',
  schema: 'Domain',
  fields: ['id', 'name', 'address', 'parentId', 'sort', 'createdAt', 'updatedAt'],
  searchIn: ['name', 'address'],
};

/** Списки с постоянным адресом. Порядок — порядок разделов в документации. */
export const FIXED_LISTS: ApiList[] = [
  PAGES_API,
  {
    listKey: PRODUCTS_LIST,
    path: '/catalog/products',
    group: 'Каталог',
    name: 'Товары',
    schema: 'Product',
    fields: RECORD,
    searchIn: ['name', 'code'],
  },
  {
    listKey: CATEGORIES_LIST,
    path: '/catalog/categories',
    group: 'Каталог',
    name: 'Категории',
    schema: 'Category',
    fields: TREE_RECORD,
    searchIn: ['name', 'code'],
  },
  DOMAINS_API,
];

/** Список элементов типа контента: адрес и схема — по коду типа. */
export const contentApiList = (listKey: string, code: string, name: string): ApiList => ({
  listKey,
  path: `/contents/${code}`,
  group: 'Контент',
  name,
  schema: 'Content_' + code.replace(/[^a-zA-Z0-9]/g, '_'),
  fields: TREE_RECORD,
  searchIn: ['name', 'code'],
});
