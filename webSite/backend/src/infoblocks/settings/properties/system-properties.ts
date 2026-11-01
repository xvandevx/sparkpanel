import { CATEGORIES_LIST, PRODUCTS_LIST } from '../../products/product-lists';
import { FORM_FIELDS_LIST, FORMS_LIST } from '../../forms/form-lists';
import { PropertyType } from './property';

/** Код свойства «Адрес» у страниц: по нему сервер собирает полный адрес страницы. */
export const PAGE_URL_PROPERTY = 'url';

/** Коды свойств подключения у внешних хранилищ: по ним сервер ходит в S3. */
export const STORAGE_PROPERTY = {
  endpoint: 'endpoint',
  region: 'region',
  bucket: 'bucket',
  accessKey: 'accessKey',
  secretKey: 'secretKey',
  publicUrl: 'publicUrl',
} as const;

/**
 * Системные свойства — те, что заводит сам сервер, а не пользователь в «Настройках
 * списка». На них держится что-то вне списка (роль пользователя прочитают права),
 * поэтому через API такое свойство не меняется и не удаляется (`isBlocked`).
 * Значения у записей правятся как у любого другого свойства.
 *
 * Это единственное место, где они перечислены. Ключ — вид списка
 * (`infoblock-kinds.ts`): у вложенного вида свойство получит каждый его список
 * (`infoblock-elements` — записи всех инфоблоков). С этим перечнем базу сверяет
 * `SystemPropertiesService` при каждом старте сервера и при заведении настроек
 * нового списка: добавили сюда свойство — оно появится у всех списков вида,
 * убрали — станет обычным, и его можно будет удалить руками.
 */
export interface SystemProperty {
  /** Ключ значения; у системного свойства он постоянный — на него опирается код */
  code: string;
  name: string;
  /** Подсказка под полем в карточке записи */
  hint?: string;
  type: PropertyType;
  required?: boolean;
  multiple?: boolean;
  /** Значение не отдаётся через API — секрет, который нужен только серверу */
  isHidden?: boolean;
  /** Привязка к контенту: из какого списка выбирать запись */
  linkList?: string;
}

export const SYSTEM_PROPERTIES: Record<string, SystemProperty[]> = {
  pages: [
    // Сегмент адреса: из сегментов по цепочке родителей сервер собирает полный
    // адрес страницы. Не обязателен — пусто у главной; у вложенной пустым
    // не сохранится, это проверяет раздел страниц
    {
      code: PAGE_URL_PROPERTY,
      name: 'Адрес',
      hint:
        'Пусто — главная страница, адрес «/». Иначе адрес складывается по дереву: ' +
        'адрес родителя плюс это значение, например /catalog/towbars',
      type: PropertyType.String,
    },
  ],
  // Подключение к S3. Сохраняется, только если хранилище с ним отвечает, —
  // это проверяет раздел хранилищ. Секрет наружу не отдаётся: его знает только сервер
  storages: [
    {
      code: STORAGE_PROPERTY.endpoint,
      name: 'Адрес S3 API',
      hint: 'Например, https://storage.yandexcloud.net',
      type: PropertyType.String,
      required: true,
    },
    {
      code: STORAGE_PROPERTY.region,
      name: 'Регион',
      hint: 'Нужен не всем хранилищам; пусто — us-east-1',
      type: PropertyType.String,
    },
    { code: STORAGE_PROPERTY.bucket, name: 'Бакет', type: PropertyType.String, required: true },
    { code: STORAGE_PROPERTY.accessKey, name: 'Ключ доступа', type: PropertyType.String, required: true },
    {
      code: STORAGE_PROPERTY.secretKey,
      name: 'Секретный ключ',
      // Что поле после сохранения пустое, карточка пишет сама — у любого скрытого
      type: PropertyType.String,
      isHidden: true,
    },
    {
      code: STORAGE_PROPERTY.publicUrl,
      name: 'Публичный адрес',
      hint:
        'По нему файлы откроются на сайте: домен бакета или CDN. Пусто — адрес и бакет. ' +
        'Чтение файлов открывается в самом хранилище',
      type: PropertyType.String,
    },
  ],
  users: [
    // Роль пользователя — запись списка ролей (`infoblocks/roles`). Одна: права
    // складываются из одной роли, а нужна вторая — заводят роль, где есть обе
    { code: 'role', name: 'Роль', type: PropertyType.ContentLink, linkList: 'roles' },
  ],
  [PRODUCTS_LIST]: [
    // Категории товара — записи списка категорий (`infoblocks/products/categories`).
    // Несколько: один товар лежит и в «Кроссовках», и в «Распродаже»
    {
      code: 'categories',
      name: 'Категории',
      type: PropertyType.ContentLink,
      multiple: true,
      linkList: CATEGORIES_LIST,
    },
  ],
  [FORMS_LIST]: [
    // Поля формы — записи списка полей (`infoblocks/forms/fields`). Несколько,
    // и порядок значений — порядок вопросов в форме. Одно поле («Телефон»)
    // подключают к скольким угодно формам
    {
      code: 'fields',
      name: 'Поля',
      type: PropertyType.ContentLink,
      multiple: true,
      linkList: FORM_FIELDS_LIST,
    },
  ],
  [FORM_FIELDS_LIST]: [
    // Текст в пустом поле на сайте. Своего у поля — только стандартное (код,
    // название, активность); тип, обязательность и прочее заводят свойствами списка
    { code: 'placeholder', name: 'Плейсхолдер', type: PropertyType.String },
  ],
};

/** Системные свойства вида списка; у большинства видов их нет. */
export const systemPropertiesOf = (kind: string): SystemProperty[] => SYSTEM_PROPERTIES[kind] ?? [];
