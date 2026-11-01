import { CATEGORIES_LIST, PRODUCTS_LIST } from '../infoblocks/products/product-lists';

/**
 * Какие списки панели видны во внешнем API и где: адрес, раздел в документации,
 * поля записи. Типы контента добавляются сюда же при запросе — по одному
 * списку на тип, адрес — код типа.
 */

/** Поле записи раздела (не свойство): ключ в ответе и что оно значит. */
export type RecordField =
  | 'id'
  | 'externalId'
  | 'code'
  | 'name'
  | 'parentId'
  | 'sort'
  | 'path'
  | 'address'
  | 'createdAt'
  | 'updatedAt';

/**
 * Поле записи, которое пишут (`fields` в теле записи). Родителя можно задать
 * и внешним ID (`parentExternalId`): интеграция строит дерево, не зная номеров
 * панели. `externalId` в `fields` — только при создании и правке по номеру
 * или коду: у записи по внешнему ID он уже в адресе.
 */
export type WriteField = 'name' | 'code' | 'isActive' | 'sort' | 'parentId' | 'parentExternalId' | 'externalId';

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
  /** Поля записи, которые принимает запись через API */
  writeFields: WriteField[];
}

/** Больше записей в одном пакете записи не принимаем: пакет идёт одним запросом. */
export const BATCH_LIMIT = 500;

const RECORD: RecordField[] = ['id', 'externalId', 'code', 'name', 'sort', 'createdAt', 'updatedAt'];
const TREE_RECORD: RecordField[] = ['id', 'externalId', 'code', 'name', 'parentId', 'sort', 'createdAt', 'updatedAt'];

const WRITE: WriteField[] = ['externalId', 'name', 'code', 'isActive', 'sort'];
const TREE_WRITE: WriteField[] = [...WRITE, 'parentId', 'parentExternalId'];

export const PAGES_API: ApiList = {
  listKey: 'pages',
  path: '/pages',
  group: 'Сайт',
  name: 'Страницы',
  schema: 'Page',
  fields: [...TREE_RECORD, 'path'],
  searchIn: ['name', 'code', 'path'],
  writeFields: TREE_WRITE,
};

export const DOMAINS_API: ApiList = {
  listKey: 'domains',
  path: '/domains',
  group: 'Сайт',
  name: 'Домены',
  schema: 'Domain',
  fields: ['id', 'externalId', 'name', 'address', 'parentId', 'sort', 'createdAt', 'updatedAt'],
  searchIn: ['name', 'address'],
  writeFields: ['externalId', 'name', 'isActive', 'sort', 'parentId', 'parentExternalId'],
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
    writeFields: WRITE,
  },
  {
    listKey: CATEGORIES_LIST,
    path: '/catalog/categories',
    group: 'Каталог',
    name: 'Категории',
    schema: 'Category',
    fields: TREE_RECORD,
    searchIn: ['name', 'code'],
    writeFields: TREE_WRITE,
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
  writeFields: TREE_WRITE,
});
