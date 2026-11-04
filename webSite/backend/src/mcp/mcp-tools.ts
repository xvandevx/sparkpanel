/**
 * Инструменты MCP — как их видит ассистент: имя, описание и схема аргументов.
 * Описания — инструкция для модели: она выбирает инструмент и заполняет
 * аргументы только по ним. Реализация — `mcp-tools.service.ts`.
 */

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** Подсказки клиенту: только ли чтение, можно ли потерять данные */
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean };
}

/** Инструмент меняет данные: в журнале MCP он «изменение». */
export const isChangeTool = (name: string): boolean =>
  MCP_TOOLS.find((tool) => tool.name === name)?.annotations.readOnlyHint === false;

const LIST = { type: 'string', description: 'Ключ списка из list_lists: pages, products, content-items.3, files.10 …' };
const RECORD_ID = { type: 'integer', minimum: 1, description: 'Номер записи (поле id)' };

const object = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: 'list_lists',
    description:
      'Все списки панели SparkPanel, с которыми можно работать: страницы, типы контента и элементы каждого типа, ' +
      'товары, категории, разделы файлов и файлы каждого раздела, домены. Для каждого — ключ, название, дерево ли он ' +
      'и включены ли черновики. Начинай с этого инструмента.',
    inputSchema: object({}),
    annotations: { readOnlyHint: true },
  },
  {
    name: 'describe_list',
    description:
      'Устройство списка: поля записи (name, code, parentId …), свойства по кодам с форматом значения, варианты ' +
      '«Списков» (их id и пишут в значение), куда ведут привязки, правила кода и черновиков. ' +
      'Вызови перед save_record и перед фильтром по свойствам.',
    inputSchema: object({ list: LIST }, ['list']),
    annotations: { readOnlyHint: true },
  },
  {
    name: 'find_records',
    description:
      'Записи списка страницей: поиск, фильтр, сортировка — как в таблице панели. Поиск и фильтр смотрят на запись ' +
      'с черновиком поверх; в ответе поля и свойства (по кодам) опубликованной версии, а у записи с черновиком ' +
      'рядом лежит draft. Фильтр — массив полей: { key, kind, … }, где key — поле записи или код свойства; ' +
      'kind "text" + text — подстрока; "options" + codes — одно из значений (варианты «Списка» — их id строкой, ' +
      'логическое поле — "true"/"false", привязка — "listKey/recordId"); "range" + from/to — числа (null — без границы); ' +
      '"filled" + isFilled — заполнено ли.',
    inputSchema: object(
      {
        list: LIST,
        search: { type: 'string', description: 'Номер записи целиком или подстрока названия и кода' },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              kind: { type: 'string', enum: ['text', 'options', 'range', 'filled'] },
              text: { type: 'string' },
              codes: { type: 'array', items: { type: 'string' } },
              from: { type: ['number', 'null'] },
              to: { type: ['number', 'null'] },
              isFilled: { type: 'boolean' },
            },
            required: ['key', 'kind'],
          },
        },
        sort: { type: 'string', description: 'Поле записи или код свойства; по умолчанию sort' },
        order: { type: 'string', enum: ['asc', 'desc'] },
        isDraftOnly: { type: 'boolean', description: 'Только записи с черновиком' },
        page: { type: 'integer', minimum: 1 },
        pageSize: { type: 'integer', enum: [20, 50, 100] },
      },
      ['list'],
    ),
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_record',
    description:
      'Одна запись по номеру: поля и свойства опубликованной версии, а если есть черновик — он в draft ' +
      '(draft.isNew — запись заведена черновиком и на сайте её ещё нет).',
    inputSchema: object({ list: LIST, id: RECORD_ID }, ['list', 'id']),
    annotations: { readOnlyHint: true },
  },
  {
    name: 'get_history',
    description: 'История изменений записи: кто, когда и что поменял — новые сверху. Есть не у всех списков.',
    inputSchema: object(
      { list: LIST, id: RECORD_ID, limit: { type: 'integer', minimum: 1, maximum: 100, description: 'По умолчанию 20' } },
      ['list', 'id'],
    ),
    annotations: { readOnlyHint: true },
  },
  {
    name: 'save_record',
    description:
      'Создать запись (без id) или изменить (с id): поля записи в fields, свойства по кодам в properties — только то, ' +
      'что меняется; null стирает значение. target — куда сохранить: "draft" — в черновик (на сайте не видно до ' +
      'publish_draft), "published" — сразу в опубликованное; черновик при этом не трогается. Без target — в черновик, ' +
      'если в списке включены черновики, иначе в опубликованное. Проверки те же, что в панели: обязательный и ' +
      'уникальный код, адрес страницы, формат значений.',
    inputSchema: object(
      {
        list: LIST,
        id: RECORD_ID,
        fields: { type: 'object', description: 'Поля записи из describe_list: { "name": "…", "isActive": true }' },
        properties: { type: 'object', description: 'Свойства по кодам: { "price": 1990, "brand": 7 }' },
        target: { type: 'string', enum: ['draft', 'published'] },
      },
      ['list'],
    ),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'publish_draft',
    description: 'Опубликовать черновик записи: его поля и свойства записываются в запись, черновик снимается.',
    inputSchema: object({ list: LIST, id: RECORD_ID }, ['list', 'id']),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: 'discard_draft',
    description:
      'Удалить черновик — запись остаётся опубликованной, как была. Запись, заведённую черновиком (draft.isNew), ' +
      'так не убрать — её удаляют delete_record.',
    inputSchema: object({ list: LIST, id: RECORD_ID }, ['list', 'id']),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: 'delete_record',
    description:
      'Удалить запись насовсем (у дерева — со вложенными, где раздел это позволяет). Защищённую запись ' +
      '(isBlocked: на неё ссылаются или в ней вложенные) панель не удалит.',
    inputSchema: object({ list: LIST, id: RECORD_ID }, ['list', 'id']),
    annotations: { readOnlyHint: false, destructiveHint: true },
  },
  {
    name: 'upload_file',
    description:
      'Загрузить файл до 18 МБ (base64 в теле вызова) или забрать к себе внешний по адресу (url, до 20 МБ — скачивает сервер): ' +
      'в раздел «Файлов» (sectionId — номер записи списка file-sections) или для свойства ' +
      '«Файл»/«Изображение» (propertyId — его номер, как в разделе свойства). В ответе номер файла — его пишут ' +
      'в значение свойства через save_record. Внешний файл можно и не забирать: адрес "https://…" пишется в значение как есть.',
    inputSchema: object(
      {
        fileName: { type: 'string', description: 'Имя с расширением: photo.jpg; при url — не нужно' },
        contentBase64: { type: 'string', description: 'Содержимое файла в base64' },
        url: { type: 'string', description: 'Вместо fileName и contentBase64: адрес внешнего файла http(s)' },
        mimeType: { type: 'string', description: 'Не указан — по расширению' },
        sectionId: { type: 'integer', minimum: 1 },
        propertyCode: { type: 'string', description: 'Вместо sectionId: код свойства «Файл»/«Изображение» …' },
        list: { ...LIST, description: '… и ключ его списка' },
      },
    ),
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
];

/** Подсказка ассистенту при подключении: с чего начать и как устроены черновики. */
export const MCP_INSTRUCTIONS =
  'SparkPanel — админ-панель сайта. Ты работаешь от имени владельца токена, с его правами, и каждая правка ' +
  'видна в истории записи. Порядок: list_lists → describe_list → find_records / get_record → save_record. ' +
  'Свойства всегда по кодам из describe_list. В списках с черновиками правка по умолчанию уходит в черновик: ' +
  'покажи её пользователю и публикуй (publish_draft или target "published") только когда он попросит.';
