import { CONTENTS_LIST } from '../infoblocks/contents/content-lists';
import { PropertyType } from '../infoblocks/settings/properties/property';
import { BATCH_LIMIT, DOMAINS_API, PAGES_API, type ApiList, type RecordField, type WriteField } from './api-lists';
import { FACET_TYPES, isExpandable, linkListOf, type ApiPropertyDef } from './external-values';
import { API_KEY_HEADER } from './keys/api-key.guard';
import { PAGE_SIZES } from '../infoblocks/records/records-page';

/**
 * OpenAPI-спецификация внешнего API, собранная из настроек списков: у каждого
 * списка своя схема записи — с кодами его свойств, их типами и вариантами
 * «Списка». Поэтому документация не пишется руками и не устаревает: завели
 * свойство — оно в спецификации. Скрытых свойств сюда не передают.
 *
 * Чистая функция: на входе списки со свойствами, на выходе JSON спецификации.
 */

type Schema = Record<string, unknown>;

export interface SpecList {
  list: ApiList;
  properties: ApiPropertyDef[];
}

/** Куда раскрываются привязки (`expand`): ключ списка → схема его записи. */
type ExpandTargets = ReadonlyMap<string, string>;

const ref = (name: string): Schema => ({ $ref: `#/components/schemas/${name}` });
const nullable = (schema: Schema): Schema => ({ anyOf: [schema, { type: 'null' }] });

const FIELD_SCHEMAS: Record<RecordField, Schema> = {
  id: { type: 'integer', description: 'Номер записи' },
  externalId: { type: ['string', 'null'], description: 'Внешний ID — номер записи в системе-источнике; null — не задан' },
  code: { type: 'string', description: 'Символьный код' },
  name: { type: 'string', description: 'Название' },
  parentId: { type: ['integer', 'null'], description: 'Родитель в дереве; null — запись верхнего уровня' },
  sort: { type: 'integer', description: 'Сортировка' },
  path: { type: 'string', description: 'Полный адрес страницы на сайте; у главной — «/»' },
  address: { type: 'string', description: 'Полный адрес домена, у поддомена — вместе с доменом' },
  createdAt: { type: 'string', format: 'date-time', description: 'Создано' },
  updatedAt: { type: 'string', format: 'date-time', description: 'Изменено — с правкой свойств' },
};

/** Схема одного значения свойства по его типу. */
function valueSchema(property: ApiPropertyDef, targets: ExpandTargets): Schema {
  switch (property.type) {
    case PropertyType.Number:
      return { type: 'number' };
    case PropertyType.Html:
      return { type: 'string', contentMediaType: 'text/html' };
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return {
        type: 'string',
        enum: property.options.map((option) => option.code),
        description: property.options.map((option) => `\`${option.code}\` — ${option.name}`).join(', '),
      };
    case PropertyType.File:
    case PropertyType.Image:
      return ref('File');
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink: {
      const target = targets.get(linkListOf(property));
      return target ? { anyOf: [ref('Link'), ref(target)] } : ref('Link');
    }
    case PropertyType.Table:
      return { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Строки таблицы' };
    default:
      return { type: 'string' };
  }
}

function propertySchema(property: ApiPropertyDef, targets: ExpandTargets): Schema {
  const one = valueSchema(property, targets);
  const title = [property.name, property.hint].filter(Boolean).join(' — ');
  const typeNote =
    (property.isMultiDomain ? ' Мультидоменное: значение для `domain`.' : '') +
    (isExpandable(property, targets) ? ' С `expand` — связанная запись целиком.' : '');
  if (property.multiple) return { type: 'array', items: one, description: title + typeNote };
  return { ...nullable(one), description: title + typeNote };
}

/** Поля записи в теле записи (`fields`). */
const WRITE_FIELD_SCHEMAS: Record<WriteField, Schema> = {
  externalId: {
    type: ['string', 'null'],
    maxLength: 255,
    description: 'Внешний ID: уникален в списке; пусто или null — стереть',
  },
  name: { type: 'string', description: 'Название; при создании обязательно' },
  code: { type: 'string', description: 'Символьный код: строчная латиница, цифры, дефис' },
  isActive: { type: 'boolean', description: 'Активна ли запись; неактивную чтение не отдаёт' },
  sort: { type: 'integer', description: 'Сортировка, по умолчанию 500: меньше — выше' },
  parentId: { type: ['integer', 'null'], description: 'Номер родителя; null — запись верхнего уровня' },
  parentExternalId: { type: ['string', 'null'], description: 'Родитель внешним ID — вместо parentId' },
};

/** Схема одного значения свойства в теле записи: варианты и привязки — ещё и кодами. */
function inputValueSchema(property: ApiPropertyDef): Schema {
  switch (property.type) {
    case PropertyType.Number:
      return { type: 'number' };
    case PropertyType.List:
    case PropertyType.ListOptionLink:
      return {
        anyOf: [{ type: 'string', enum: property.options.map((option) => option.code) }, { type: 'integer' }],
        description: 'Код варианта или его номер',
      };
    case PropertyType.File:
    case PropertyType.Image:
      return { type: 'integer', description: 'Номер уже загруженного файла' };
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
      return ref('LinkInput');
    case PropertyType.Table:
      return { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Строки таблицы' };
    default:
      return { type: 'string' };
  }
}

function inputPropertySchema(property: ApiPropertyDef): Schema {
  const one = inputValueSchema(property);
  const value = property.multiple ? { type: 'array', items: one } : one;
  const title = [property.name, property.hint].filter(Boolean).join(' — ');
  if (property.isMultiDomain) {
    return {
      type: ['array', 'null'],
      items: ref('DomainGroupInput'),
      description: `${title}. Мультидоменное: группы по доменам, value группы — ${property.multiple ? 'массив значений' : 'одно значение'}`,
    };
  }
  return { ...nullable(value), description: `${title}. null — стереть` };
}

/**
 * Тело записи. У upsert и пакета внешний ID — в адресе или в строке пакета,
 * поэтому в их `fields` его нет (`isUpsert`).
 */
function inputSchema({ list, properties }: SpecList, isUpsert: boolean): Schema {
  const fields = list.writeFields.filter((field) => !isUpsert || field !== 'externalId');
  return {
    type: 'object',
    properties: {
      fields: {
        type: 'object',
        additionalProperties: false,
        description: 'Поля записи; неприсланные остаются как были',
        properties: Object.fromEntries(fields.map((field) => [field, WRITE_FIELD_SCHEMAS[field]])),
      },
      properties: {
        type: 'object',
        additionalProperties: false,
        description: 'Свойства по коду; неприсланные остаются как были, null стирает значение',
        properties: Object.fromEntries(properties.map((property) => [property.code, inputPropertySchema(property)])),
      },
    },
  };
}

function recordSchema({ list, properties }: SpecList, targets: ExpandTargets): Schema {
  return {
    type: 'object',
    required: [...list.fields, 'properties'],
    properties: {
      ...Object.fromEntries(list.fields.map((field) => [field, FIELD_SCHEMAS[field]])),
      properties: {
        type: 'object',
        description: 'Свойства записи по коду. Ключ есть всегда: пустое — null, у множественного — []',
        required: properties.map((property) => property.code),
        properties: Object.fromEntries(properties.map((property) => [property.code, propertySchema(property, targets)])),
      },
    },
  };
}

const query = (name: string, schema: Schema, description: string, isRequired = false): Schema => ({
  name,
  in: 'query',
  required: isRequired,
  description,
  schema,
});

/** `expand` — массив кодов в одном параметре через запятую (`style: form`, `explode: false`). */
function expandParams(properties: ApiPropertyDef[], targets: ExpandTargets): Schema[] {
  const codes = properties.filter((property) => isExpandable(property, targets)).map((property) => property.code);
  if (codes.length === 0) return [];
  return [
    {
      ...query(
        'expand',
        { type: 'array', items: { type: 'string', enum: codes } },
        'Раскрыть привязки: вместо `Link` — связанная запись целиком, как в `items/{id}` её списка, ' +
          'для того же `domain`. Один уровень: привязки внутри неё — `Link`. Записи, которой API не отдаёт, — `Link`, как без `expand`',
      ),
      style: 'form',
      explode: false,
    },
  ];
}

const DOMAIN_PARAM = query('domain', { type: 'string', examples: ['ekb.farkop.ru'] }, 'Домен: мультидоменные свойства — его значением. Без него — общим');

/** Параметры фильтра: по одному на свойство, у числа — два. */
function filterParams(properties: ApiPropertyDef[]): Schema[] {
  return properties.flatMap((property): Schema[] => {
    const name = `filter[${property.code}]`;
    switch (property.type) {
      case PropertyType.Number:
        return [
          query(`${name}[gte]`, { type: 'number' }, `${property.name} — от`),
          query(`${name}[lte]`, { type: 'number' }, `${property.name} — до`),
        ];
      case PropertyType.List:
      case PropertyType.ListOptionLink:
        return [
          query(
            name,
            { type: 'string', enum: property.options.map((option) => option.code) },
            `${property.name}: код варианта; несколько — через запятую`,
          ),
        ];
      case PropertyType.ContentLink:
      case PropertyType.ContentTypeLink:
        return [query(name, { type: 'string' }, `${property.name}: номер записи; несколько — через запятую`)];
      case PropertyType.String:
      case PropertyType.Text:
      case PropertyType.Html:
        return [query(name, { type: 'string' }, `${property.name}: подстрока`)];
      default:
        return [];
    }
  });
}

/** По чему сортируют: поля записи и свойства-строки и числа. */
export function sortKeys({ list, properties }: SpecList): string[] {
  const fields = list.fields.filter((field) => field !== 'parentId' && field !== 'externalId');
  const own = properties
    .filter((property) => !property.multiple && [PropertyType.Number, PropertyType.String].includes(property.type))
    .map((property) => property.code);
  return [...fields, ...own];
}

const ok = (description: string, schema: Schema): Schema => ({
  '200': { description, content: { 'application/json': { schema } } },
  '401': { $ref: '#/components/responses/Unauthorized' },
});

const notFound = { '404': { $ref: '#/components/responses/NotFound' } };

/** Ответы записи: кроме успеха — ошибки проверок, ключа и прав. */
const writeErrors = {
  '400': { $ref: '#/components/responses/BadRequest' },
  '401': { $ref: '#/components/responses/Unauthorized' },
  '403': { $ref: '#/components/responses/Forbidden' },
  '409': { $ref: '#/components/responses/Conflict' },
};

const WRITE_NOTE = '**Нужен ключ с правом записи в этот список.**';

/** Метод записи: пометка о праве — и в описании, и значком в документации. */
const writeOperation = (operation: Schema): Schema => ({
  ...operation,
  description: `${WRITE_NOTE} ${operation.description as string}`,
  'x-badges': [{ name: 'Запись', color: 'orange' }],
});

const jsonBody = (schema: Schema): Schema => ({
  required: true,
  content: { 'application/json': { schema } },
});

const EXTERNAL_ID_PARAM: Schema = {
  name: 'externalId',
  in: 'path',
  required: true,
  schema: { type: 'string', maxLength: 255 },
  description: 'Внешний ID записи — номер в системе-источнике',
};

const ID_OR_CODE_PARAM: Schema = {
  name: 'idOrCode',
  in: 'path',
  required: true,
  schema: { type: 'string' },
  description: 'Номер или символьный код записи',
};

/**
 * Тег списка — его раздел в меню документации. Имя тега уникально на всю
 * спецификацию, поэтому с разделом («Контент · Новости»: тип контента может
 * называться и «Товары»); в меню — без него (`x-displayName`).
 */
const tagOf = (list: ApiList): string => `${list.group} · ${list.name}`;

/** Тег метода «Типы контента»: он в разделе «Контент», но не список. */
const TYPES_TAG = 'Контент · Типы контента';

function listPaths(spec: SpecList, targets: ExpandTargets): Record<string, Schema> {
  const { list, properties } = spec;
  const expand = expandParams(properties, targets);
  const tag = tagOf(list);
  const opId = list.path.replace(/^\//, '').replace(/[^a-zA-Z0-9]+/g, '_');
  const isMultiDomain = properties.some((property) => property.isMultiDomain);
  const domain = isMultiDomain ? [DOMAIN_PARAM] : [];
  const facetProps = properties.filter((property) => FACET_TYPES.has(property.type));
  const input = inputSchemaName(list);
  const upsertInput = upsertSchemaName(list);

  const paths: Record<string, Schema> = {
    [`${list.path}/items`]: {
      get: {
        tags: [tag],
        operationId: `${opId}_items`,
        summary: `${list.name} — записи`,
        description: 'Страница записей со всеми свойствами. Отдаются только активные опубликованные записи.',
        parameters: [
          query('page', { type: 'integer', minimum: 1, default: 1 }, 'Номер страницы, с 1'),
          query('pageSize', { type: 'integer', enum: [...PAGE_SIZES], default: PAGE_SIZES[0] }, 'Записей на странице'),
          query('search', { type: 'string' }, `Поиск: номер записи целиком, ${list.searchIn.join(', ')} — подстрокой`),
          ...filterParams(properties),
          query('sort', { type: 'string', enum: sortKeys(spec), default: 'sort' }, 'Поле или код свойства для сортировки'),
          query('order', { type: 'string', enum: ['asc', 'desc'], default: 'asc' }, 'Направление сортировки'),
          ...(list.fields.includes('parentId')
            ? [query('parentId', { type: 'string' }, 'Только дети этой записи; `root` — записи верхнего уровня')]
            : []),
          ...expand,
          ...domain,
        ],
        responses: ok('Страница записей', {
          type: 'object',
          required: ['items', 'total', 'page', 'pageSize'],
          properties: {
            items: { type: 'array', items: ref(list.schema) },
            total: { type: 'integer', description: 'Всего записей с учётом поиска и фильтра' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
          },
        }),
      },
      post: writeOperation({
        tags: [tag],
        operationId: `${opId}_create`,
        summary: `${list.name} — создать`,
        description: 'Новая запись из `fields` и `properties`; сразу публикуется. С `fields.externalId` — сразу с внешним ID.',
        requestBody: jsonBody(ref(input)),
        responses: {
          '201': { description: 'Запись создана', content: { 'application/json': { schema: ref('WriteResult') } } },
          ...writeErrors,
        },
      }),
    },
    [`${list.path}/items/{idOrCode}`]: {
      get: {
        tags: [tag],
        operationId: `${opId}_item`,
        summary: `${list.name} — запись`,
        description: 'Одна запись по номеру или символьному коду.',
        parameters: [ID_OR_CODE_PARAM, ...expand, ...domain],
        responses: { ...ok('Запись', ref(list.schema)), ...notFound },
      },
      patch: writeOperation({
        tags: [tag],
        operationId: `${opId}_update`,
        summary: `${list.name} — изменить`,
        description: 'Меняется только присланное: поля из `fields`, свойства из `properties`. Сразу публикуется; черновик записи не трогается.',
        parameters: [ID_OR_CODE_PARAM],
        requestBody: jsonBody(ref(input)),
        responses: { ...ok('Запись изменена', ref('WriteResult')), ...writeErrors, ...notFound },
      }),
      delete: writeOperation({
        tags: [tag],
        operationId: `${opId}_delete`,
        summary: `${list.name} — удалить`,
        description: 'Удалить запись вместе со значениями её свойств. Защищённую панель не удалит — 409.',
        parameters: [ID_OR_CODE_PARAM],
        responses: { '204': { description: 'Удалено' }, ...writeErrors, ...notFound },
      }),
    },
    [`${list.path}/items/external/{externalId}`]: {
      get: {
        tags: [tag],
        operationId: `${opId}_item_external`,
        summary: `${list.name} — запись по внешнему ID`,
        description: 'Одна запись по внешнему ID — номеру в системе-источнике.',
        parameters: [EXTERNAL_ID_PARAM, ...expand, ...domain],
        responses: { ...ok('Запись', ref(list.schema)), ...notFound },
      },
      put: writeOperation({
        tags: [tag],
        operationId: `${opId}_upsert`,
        summary: `${list.name} — записать по внешнему ID`,
        description:
          'Upsert: запись с этим внешним ID есть — меняется присланное, нет — заводится с ним. Так интеграция держит запись в актуальном виде, не храня номеров панели.',
        parameters: [EXTERNAL_ID_PARAM],
        requestBody: jsonBody(ref(upsertInput)),
        responses: { ...ok('Запись создана или изменена', ref('WriteResult')), ...writeErrors },
      }),
      delete: writeOperation({
        tags: [tag],
        operationId: `${opId}_delete_external`,
        summary: `${list.name} — удалить по внешнему ID`,
        description: 'Удалить запись с этим внешним ID.',
        parameters: [EXTERNAL_ID_PARAM],
        responses: { '204': { description: 'Удалено' }, ...writeErrors, ...notFound },
      }),
    },
    [`${list.path}/items/batch`]: {
      post: writeOperation({
        tags: [tag],
        operationId: `${opId}_batch`,
        summary: `${list.name} — пакет по внешнему ID`,
        description:
          `Upsert до ${BATCH_LIMIT} записей одним запросом, по порядку. Ошибка одной записи не останавливает остальные: ` +
          'результат — по каждой записи в порядке запроса. Запись, заведённая раньше в пакете, уже видна следующим — дерево собирается `parentExternalId`.',
        requestBody: jsonBody({
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              maxItems: BATCH_LIMIT,
              items: {
                allOf: [ref(upsertInput), { type: 'object', required: ['externalId'], properties: { externalId: { type: 'string', maxLength: 255 } } }],
              },
            },
          },
        }),
        responses: {
          ...ok('Результат по каждой записи', {
            type: 'object',
            required: ['items'],
            properties: { items: { type: 'array', items: ref('WriteResult') } },
          }),
          ...writeErrors,
        },
      }),
    },
    [`${list.path}/properties`]: {
      get: {
        tags: [tag],
        operationId: `${opId}_properties`,
        summary: `${list.name} — свойства`,
        description: 'Свойства записей списка — чтобы построить фильтр или карточку. У «Списка» — все варианты с подписями.',
        responses: ok('Свойства', { type: 'array', items: ref('Property') }),
      },
    },
  };

  if (facetProps.length > 0) {
    paths[`${list.path}/facets`] = {
      get: {
        tags: [tag],
        operationId: `${opId}_facets`,
        summary: `${list.name} — фасеты`,
        description:
          'Значения фильтра со счётчиками — с учётом уже выбранного: вариант свойства считается без его собственного фильтра. ' +
          `Свойства: ${facetProps.map((property) => `\`${property.code}\``).join(', ')}.`,
        parameters: [
          query('search', { type: 'string' }, 'Поиск, как у записей'),
          ...filterParams(properties),
          ...domain,
        ],
        responses: ok('Фасеты по коду свойства', {
          type: 'object',
          properties: Object.fromEntries(facetProps.map((property) => [property.code, ref('Facet')])),
        }),
      },
    };
  }
  return paths;
}

function extraPaths(lists: SpecList[]): Record<string, Schema> {
  const paths: Record<string, Schema> = {
    '/contents': {
      get: {
        tags: [TYPES_TAG],
        operationId: 'contents_types',
        summary: 'Типы контента',
        description: 'Какие типы контента есть на сайте: код, название и адрес методов.',
        responses: ok('Типы контента', { type: 'array', items: ref('ContentType') }),
      },
    },
  };
  const pages = lists.find((spec) => spec.list === PAGES_API);
  if (pages) {
    paths['/pages/by-url'] = {
      get: {
        tags: [tagOf(PAGES_API)],
        operationId: 'pages_by_url',
        summary: 'Страница по адресу',
        description: 'Страница по полному адресу на сайте — то, что нужно роутеру сайта.',
        parameters: [
          query('url', { type: 'string', examples: ['/about'] }, 'Адрес страницы', true),
          ...(pages.properties.some((property) => property.isMultiDomain) ? [DOMAIN_PARAM] : []),
        ],
        responses: { ...ok('Страница', ref(PAGES_API.schema)), ...notFound },
      },
    };
  }
  if (lists.some((spec) => spec.list === DOMAINS_API)) {
    paths['/domains/by-host'] = {
      get: {
        tags: [tagOf(DOMAINS_API)],
        operationId: 'domains_by_host',
        summary: 'Домен по хосту',
        description: 'Домен, на который пришёл посетитель: сайт передаёт свой хост и получает свойства домена.',
        parameters: [query('host', { type: 'string', examples: ['ekb.farkop.ru'] }, 'Хост из адресной строки', true)],
        responses: { ...ok('Домен', ref(DOMAINS_API.schema)), ...notFound },
      },
    };
  }
  return paths;
}

const INTRO = `Данные сайта из SparkPanel: чтение для сайта и запись для интеграций — учётной системы, склада, CRM.

**Ключ.** Каждый запрос — с заголовком \`${API_KEY_HEADER}\`. Ключи создаются в панели: «Настройки → API». Читает любой ключ; пишет ключ с правом записи и только в списки, которые ему разрешили (иначе 403).

**Методы.** У каждого списка одни и те же: записи (\`/items\`), запись (\`/items/{idOrCode}\` и \`/items/external/{externalId}\`), свойства (\`/properties\`) и фасеты для фильтра (\`/facets\`).

**Запись.** Создать — \`POST /items\`, изменить — \`PATCH /items/{idOrCode}\`, удалить — \`DELETE\`. Интеграции удобнее внешний ID — номер записи в её системе: \`PUT /items/external/{externalId}\` заводит запись или правит существующую, \`POST /items/batch\` делает то же пакетом до ${BATCH_LIMIT} записей. Тело — \`{ fields, properties }\`: свойства по коду, «Список» — кодом или номером варианта, привязка — номером, кодом или \`{ "externalId": "…" }\`, файл — номером загруженного файла. \`null\` стирает значение, неприсланное не трогается. Записанное сразу публикуется; проверки и журнал — те же, что в панели.

**Свойства** приходят объектом \`properties\` по коду свойства: «Список» — кодом варианта, файл и изображение — объектом \`File\`, привязка — объектом \`Link\`. Скрытые свойства не отдаются.

**Связи:** \`expand=код,код\` у \`/items\` и \`/items/{idOrCode}\` — привязки этих свойств приходят записями целиком, на один уровень. Какие коды можно, сказано у метода.

**Фильтр:** \`filter[код]=значение\`. У «Списка» — коды вариантов через запятую, у привязки — номера записей, у числа — \`filter[код][gte]\` и \`filter[код][lte]\`, у строки — подстрока.

**Домены.** Мультидоменные свойства — значением домена из параметра \`domain\`, без него — общим значением.

**Типы для сайта:** \`npx openapi-typescript <адрес этой спецификации> -o spark-api.d.ts\`.

Ошибки: 400 — непонятный параметр или значение, 401 — нет ключа или он отозван, 403 — ключу нельзя писать сюда, 404 — нет записи, 409 — занято (код, внешний ID) или запись защищена.`;

/** Имя схемы тела записи списка. */
const inputSchemaName = (list: ApiList): string => `${list.schema}Input`;

/** Имя схемы тела upsert и строки пакета — без внешнего ID в `fields`. */
const upsertSchemaName = (list: ApiList): string => `${list.schema}Upsert`;

const SHARED_SCHEMAS: Record<string, Schema> = {
  File: {
    type: 'object',
    required: ['id', 'name', 'url', 'mimeType', 'size'],
    properties: {
      id: { type: 'integer' },
      name: { type: 'string' },
      url: { type: 'string', format: 'uri' },
      mimeType: { type: 'string' },
      size: { type: 'integer', description: 'Байт' },
    },
  },
  Link: {
    type: 'object',
    required: ['list', 'id', 'name'],
    properties: {
      list: { type: 'string', description: 'Ключ списка панели' },
      id: { type: ['integer', 'string'], description: 'Номер записи' },
      name: { type: ['string', 'null'], description: 'Название записи' },
    },
  },
  Property: {
    type: 'object',
    required: ['code', 'name', 'type', 'isMultiple', 'isMultiDomain'],
    properties: {
      code: { type: 'string', description: 'Ключ в properties и в filter[…]' },
      name: { type: 'string' },
      hint: { type: 'string' },
      type: { type: 'string', enum: Object.values(PropertyType) },
      isMultiple: { type: 'boolean', description: 'Несколько значений — приходит массивом' },
      isMultiDomain: { type: 'boolean', description: 'Значение своё на домен' },
      options: {
        type: 'array',
        description: 'Варианты — у «Списка»',
        items: {
          type: 'object',
          required: ['value', 'label'],
          properties: { value: { type: 'string' }, label: { type: 'string' } },
        },
      },
    },
  },
  Facet: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { type: 'string', enum: ['list', 'number', 'content-link'] },
      values: {
        type: 'array',
        description: 'У «Списка»: { value, label, count }; у привязки: { list, id, name, count }',
        items: { type: 'object', additionalProperties: true },
      },
      min: { type: ['number', 'null'], description: 'У числа' },
      max: { type: ['number', 'null'], description: 'У числа' },
    },
  },
  ContentType: {
    type: 'object',
    required: ['code', 'name', 'path', 'total'],
    properties: {
      code: { type: 'string', description: 'Код типа — часть адреса' },
      name: { type: 'string' },
      path: { type: 'string', description: 'Адрес методов типа' },
      total: { type: 'integer', description: 'Элементов в типе' },
    },
  },
  LinkInput: {
    anyOf: [
      { type: 'integer', description: 'Номер записи' },
      { type: 'string', description: 'Символьный код записи' },
      {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          code: { type: 'string' },
          externalId: { type: 'string', description: 'Внешний ID записи' },
        },
        description: 'Одно из: id, code, externalId',
      },
    ],
    description: 'Привязка: номер, код или { "externalId": "…" } записи',
  },
  DomainGroupInput: {
    type: 'object',
    required: ['domainIds', 'value'],
    properties: {
      domainIds: { type: ['array', 'null'], items: { type: 'integer' }, description: 'Номера доменов; null — общее значение' },
      exceptDomainIds: { type: 'array', items: { type: 'integer' }, description: 'У общего значения — домены-исключения' },
      value: { description: 'Значение для этих доменов' },
    },
  },
  WriteResult: {
    type: 'object',
    required: ['externalId', 'id', 'status'],
    properties: {
      externalId: { type: ['string', 'null'], description: 'Внешний ID записи' },
      id: { type: ['integer', 'null'], description: 'Номер записи в панели; у ошибки пакета — null' },
      status: { type: 'string', enum: ['created', 'updated', 'error'] },
      error: { type: 'string', description: 'Текст ошибки — у status: error' },
    },
  },
  Error: {
    type: 'object',
    properties: { statusCode: { type: 'integer' }, message: { type: 'string' } },
  },
};

export function buildSpec({ serverUrl, siteName, lists }: { serverUrl: string; siteName: string; lists: SpecList[] }): Schema {
  const targets: ExpandTargets = new Map([
    [CONTENTS_LIST, 'ContentType'],
    ...lists.map((spec): [string, string] => [spec.list.listKey, spec.list.schema]),
  ]);
  const groups = Array.from(new Set(lists.map((spec) => spec.list.group)));
  if (!groups.includes('Контент')) groups.push('Контент');
  const tagsOf = (group: string): Schema[] => [
    ...(group === 'Контент' ? [{ name: TYPES_TAG, 'x-displayName': 'Типы контента' }] : []),
    ...lists
      .filter((spec) => spec.list.group === group)
      .map((spec) => ({ name: tagOf(spec.list), 'x-displayName': spec.list.name })),
  ];
  // Пунктом меню — список, группой — несколько: у группы из одного списка
  // (была «Страницы → Страницы») пункт повторял бы её имя. Тег вне групп
  // Scalar не показывает вовсе, поэтому страницы и домены — вместе, в «Сайте»
  const tagGroups = groups.map((group) => ({ name: group, tags: tagsOf(group) }));

  return {
    openapi: '3.1.0',
    info: { title: `${siteName || 'SparkPanel'} — API`, version: 'v1', description: INTRO },
    servers: [{ url: serverUrl }],
    security: [{ ApiKey: [] }],
    tags: tagGroups.flatMap((group) => group.tags),
    'x-tagGroups': tagGroups.map((group) => ({ name: group.name, tags: group.tags.map((tag) => tag.name) })),
    paths: {
      ...extraPaths(lists),
      ...Object.assign({}, ...lists.map((spec) => listPaths(spec, targets))),
    },
    components: {
      securitySchemes: { ApiKey: { type: 'apiKey', in: 'header', name: API_KEY_HEADER } },
      responses: {
        Unauthorized: { description: 'Нет ключа или он отозван', content: { 'application/json': { schema: ref('Error') } } },
        NotFound: { description: 'Нет записи', content: { 'application/json': { schema: ref('Error') } } },
        BadRequest: { description: 'Не прошли проверки: поля, свойства, значения', content: { 'application/json': { schema: ref('Error') } } },
        Forbidden: { description: 'Ключу не разрешена запись в этот список', content: { 'application/json': { schema: ref('Error') } } },
        Conflict: {
          description: 'Код или внешний ID уже заняты, запись защищена от удаления',
          content: { 'application/json': { schema: ref('Error') } },
        },
      },
      schemas: {
        ...SHARED_SCHEMAS,
        ...Object.fromEntries(lists.map((spec) => [spec.list.schema, recordSchema(spec, targets)])),
        ...Object.fromEntries(lists.map((spec) => [inputSchemaName(spec.list), inputSchema(spec, false)])),
        ...Object.fromEntries(lists.map((spec) => [upsertSchemaName(spec.list), inputSchema(spec, true)])),
      },
    },
  };
}
