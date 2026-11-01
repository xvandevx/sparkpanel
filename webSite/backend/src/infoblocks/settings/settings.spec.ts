import { BadRequestException } from '@nestjs/common';
import {
  assertRecordId,
  isScopedKind,
  listDefaultName,
  resolveInfoblock,
} from './infoblock-kinds';
import { SYSTEM_PROPERTIES } from './properties/system-properties';
import {
  TABLE_MAX_ROWS,
  fileRuleError,
  PropertyDef,
  PropertyType,
  canChangeType,
  normalizeProperties,
  normalizeTabs,
  normalizeValues,
  plainValues,
  propertiesError,
  referencedDomainIds,
  referencedIds,
  referencedLinks,
  staleCodes,
  tabsError,
  valuesSnapshot,
} from './properties/property';
import { parentError, reparentAfterRemove } from '../values/records-tree';

const property = (patch: Partial<PropertyDef>): PropertyDef => ({
  code: 'price',
  name: 'Цена',
  hint: '',
  type: PropertyType.Number,
  tab: '',
  required: false,
  multiple: false,
  isMultiDomain: false,
  isHidden: false,
  isExternal: false,
  options: [],
  formats: [],
  maxSizeMb: null,
  maxWidth: null,
  maxHeight: null,
  columns: null,
  headers: [],
  linkList: '',
  optionsPropertyId: null,
  ...patch,
});

describe('resolveInfoblock', () => {
  it('принимает живые списки', () => {
    expect(resolveInfoblock('pages')).toEqual({
      key: 'pages',
      kind: 'pages',
      entity: 'pages',
      isRootOnly: false,
      maxDepth: null,
    });
    // Уровней по умолчанию: списки плоские, страницы — дерево без предела, разделы файлов — 2
    expect(resolveInfoblock('roles').maxDepth).toBe(1);
    expect(resolveInfoblock('file-sections').maxDepth).toBe(2);
    // Товары плоские, категории товаров — дерево без предела, у обоих свой журнал
    expect(resolveInfoblock('products')).toMatchObject({ entity: 'products', maxDepth: 1 });
    expect(resolveInfoblock('product-categories')).toMatchObject({
      entity: 'product-categories',
      maxDepth: null,
    });
    // Формы и поля форм — два плоских списка, у каждого свой журнал
    expect(resolveInfoblock('forms')).toMatchObject({ entity: 'forms', maxDepth: 1 });
    expect(resolveInfoblock('form-fields')).toMatchObject({ entity: 'form-fields', maxDepth: 1 });
  });

  // Учётные записи и роли — управление панелью: правит их и видит журнал только root
  it('помечает списки, которые правит только главный администратор', () => {
    expect(resolveInfoblock('users').isRootOnly).toBe(true);
    expect(resolveInfoblock('roles').isRootOnly).toBe(true);
    expect(resolveInfoblock('pages').isRootOnly).toBe(false);
  });

  it('отдаёт вид списка без номера владельца', () => {
    expect(resolveInfoblock('files.2').kind).toBe('files');
    expect(isScopedKind('files')).toBe(true);
    expect(isScopedKind('users')).toBe(false);
  });

  // Имя несохранённых настроек — заголовок раздела: ключ списка там был бы непонятен
  it('называет список по виду, пока имя не задали', () => {
    expect(listDefaultName('roles')).toBe('Роли');
    expect(listDefaultName('files.7')).toBe('Файлы раздела');
  });

  it('отклоняет незнакомый вид и ключ с лишним владельцем', () => {
    expect(() => resolveInfoblock('orders')).toThrow(BadRequestException);
    // Инфоблоки и формы лежат в `to_delete/` — их видов пока нет
    expect(() => resolveInfoblock('infoblock-elements.3')).toThrow(BadRequestException);
    expect(() => resolveInfoblock('pages.2')).toThrow(BadRequestException);
    // Файлы — список раздела: без номера раздела ключ неполный
    expect(() => resolveInfoblock('files')).toThrow(BadRequestException);
  });

  it('принимает файлы раздела и разделы файлов', () => {
    expect(resolveInfoblock('files.2').key).toBe('files.2');
    expect(resolveInfoblock('file-sections').entity).toBeNull();
  });
});

describe('assertRecordId', () => {
  it('пропускает ключи записей разделов', () => {
    expect(() => assertRecordId('7')).not.toThrow();
    expect(() => assertRecordId('element-3')).not.toThrow();
  });

  it('отклоняет пустой и чужой формат', () => {
    expect(() => assertRecordId('')).toThrow(BadRequestException);
    expect(() => assertRecordId('../7')).toThrow(BadRequestException);
  });
});

describe('normalizeProperties', () => {
  it('оставляет варианты только списку, а множественность — всем, кроме таблицы', () => {
    const [text, list, grid] = normalizeProperties([
      property({
        code: ' title ',
        type: PropertyType.String,
        multiple: true,
        options: [{ code: 'x', name: 'X' }],
      }),
      property({
        code: 'badge',
        type: PropertyType.List,
        multiple: true,
        options: [
          { id: 3, code: ' hit ', name: ' Хит ' },
          { code: '', name: '' },
          { id: -1, code: 'new', name: 'Новинка' },
        ],
      }),
      property({ code: 'grid', type: PropertyType.Table, multiple: true }),
    ]);

    // Множественность теперь у любого типа, варианты — только у списка
    expect(text).toMatchObject({ code: 'title', multiple: true, options: [] });
    expect(list).toMatchObject({
      multiple: true,
      options: [
        { id: 3, code: 'hit', name: 'Хит' },
        // Номер не положительный — вариант считается новым
        { code: 'new', name: 'Новинка' },
      ],
    });
    // У таблицы строк и так сколько угодно — второй таблице взяться неоткуда
    expect(grid.multiple).toBe(false);
  });

  it('мультидоменность — у любого типа, а не присланная значит «выключено»', () => {
    const [text, grid] = normalizeProperties([
      property({ code: 'title', type: PropertyType.String, isMultiDomain: true }),
      property({ code: 'grid', type: PropertyType.Table, isMultiDomain: true }),
    ]);
    expect(text.isMultiDomain).toBe(true);
    expect(grid.isMultiDomain).toBe(true);

    // Клиент, который про домены не знает, флага не присылает
    const { isMultiDomain: _omitted, ...legacy } = property({ code: 'old' });
    expect(normalizeProperties([legacy])[0].isMultiDomain).toBe(false);
  });

  it('заголовков таблицы ровно столько, сколько столбцов', () => {
    const [two, none] = normalizeProperties([
      property({ type: PropertyType.Table, columns: 2, headers: ['Параметр', 'Значение', 'Лишний'] }),
      property({ code: 'plain', type: PropertyType.Table, columns: 2, headers: ['', '  '] }),
    ]);
    expect(two.headers).toEqual(['Параметр', 'Значение']);
    // Шапка целиком пустая — значит её нет
    expect(none.headers).toEqual([]);
  });

  it('источник привязки остаётся только у привязки к контенту', () => {
    const [link, text] = normalizeProperties([
      property({ type: PropertyType.ContentLink, linkList: 'infoblock-elements.3' }),
      property({ code: 'note', type: PropertyType.Text, linkList: 'pages' }),
    ]);
    expect(link.linkList).toBe('infoblock-elements.3');
    expect(text.linkList).toBe('');
  });
});

describe('propertiesError', () => {
  it('ловит повтор кода, повтор кода варианта и список без вариантов', () => {
    expect(propertiesError([property({}), property({ name: 'Ещё цена' })])).toMatch(/повторяется/);
    expect(propertiesError([property({ type: PropertyType.List })])).toMatch(/нет вариантов/);
    const [repeated] = normalizeProperties([
      property({
        type: PropertyType.List,
        options: [
          { id: 1, code: 'hit', name: 'Хит' },
          { code: 'hit', name: 'Повтор' },
        ],
      }),
    ]);
    expect(propertiesError([repeated])).toMatch(/варианта «hit».*повторяется/);
    expect(propertiesError([property({})])).toBeNull();
  });
});

describe('canChangeType', () => {
  it('незаполненному свойству тип меняется на любой', () => {
    expect(canChangeType(PropertyType.String, PropertyType.File, false)).toBe(true);
    expect(canChangeType(PropertyType.List, PropertyType.Table, false)).toBe(true);
  });

  it('заполненному — только между строкой, текстом и HTML', () => {
    expect(canChangeType(PropertyType.String, PropertyType.Html, true)).toBe(true);
    expect(canChangeType(PropertyType.Html, PropertyType.Text, true)).toBe(true);
    expect(canChangeType(PropertyType.String, PropertyType.Number, true)).toBe(false);
    expect(canChangeType(PropertyType.File, PropertyType.Image, true)).toBe(false);
  });

  it('тот же тип — не смена', () => {
    expect(canChangeType(PropertyType.Table, PropertyType.Table, true)).toBe(true);
  });
});

describe('staleCodes', () => {
  it('стирает удалённые свойства и свойства со сменённым типом', () => {
    const before = [
      property({ code: 'price' }),
      property({ code: 'note', type: PropertyType.String }),
      property({ code: 'kept', type: PropertyType.Text }),
    ];
    const after = [
      property({ code: 'note', type: PropertyType.Number }),
      property({ code: 'kept', type: PropertyType.Text, required: true }),
    ];
    expect(staleCodes(before, after)).toEqual(['price', 'note']);
  });
});

describe('normalizeValues', () => {
  const properties = [
    property({ code: 'price', required: true }),
    property({ code: 'title', name: 'Название', type: PropertyType.String }),
    property({
      code: 'badge',
      name: 'Метка',
      type: PropertyType.List,
      multiple: true,
      // Значение «Списка» — номер варианта, а не код
      options: [
        { id: 5, code: 'hit', name: 'Хит' },
        { id: 6, code: 'new', name: 'Новинка' },
      ],
    }),
    property({ code: 'cover', name: 'Обложка', type: PropertyType.File }),
    property({
      code: 'gallery',
      name: 'Галерея',
      type: PropertyType.File,
      multiple: true,
    }),
  ];

  it('приводит значения к типам и отбрасывает пустые и незнакомые', () => {
    const { values, errors } = normalizeValues(
      properties,
      {
        price: '19,5',
        title: '  Кроссовки  ',
        badge: [5, '5'],
        cover: '12',
        gallery: [3, '4', 3],
        unknown: 'x',
      },
      true,
    );

    expect(errors).toEqual([]);
    expect(values).toEqual({
      price: 19.5,
      title: 'Кроссовки',
      badge: [5],
      cover: 12,
      gallery: [3, 4],
    });
  });

  it('при записи ругается на неверное значение и пустое обязательное', () => {
    const { errors } = normalizeValues(
      properties,
      { title: 'x', badge: ['hit'], cover: -1 },
      true,
    );
    expect(errors).toEqual([
      'Свойство «Цена» обязательно',
      'Неверное значение свойства «Метка»',
      'Неверное значение свойства «Обложка»',
    ]);
  });

  it('при чтении молча отбрасывает то, что под настройки уже не подходит', () => {
    const { values, errors } = normalizeValues(
      properties,
      { price: 'дорого', badge: [9], cover: [7, 8] },
      false,
    );
    expect(errors).toEqual([]);
    // Свойство стало одиночным — из сохранённого массива берётся первое значение
    expect(values).toEqual({ cover: 7 });
  });
});

describe('referencedIds и valuesSnapshot', () => {
  const properties = [
    property({ code: 'cover', type: PropertyType.File }),
    property({ code: 'gallery', type: PropertyType.File, multiple: true }),
    property({ code: 'photo', type: PropertyType.Image }),
  ];
  const values = { cover: 5, gallery: [5, 6], photo: 2 };

  it('собирает номера ссылок нужного типа без повторов', () => {
    expect(referencedIds(properties, values, [PropertyType.File])).toEqual([5, 6]);
    expect(referencedIds(properties, values, [PropertyType.Image])).toEqual([2]);
  });

  it('снимок для журнала — с ключами полей формы', () => {
    expect(valuesSnapshot({ price: 10 })).toEqual({ 'props.price': 10 });
  });
});

describe('настройки типов свойств', () => {
  it('у каждого типа остаются только его настройки', () => {
    const [image, file, table, text] = normalizeProperties([
      property({
        code: 'photo',
        type: PropertyType.Image,
        formats: ['JPEG', '.png', 'pdf'],
        maxSizeMb: 2,
        maxWidth: 1920,
        maxHeight: 0,
        columns: 4,
      }),
      property({ code: 'doc', type: PropertyType.File, formats: ['.PDF', 'docx', 'pdf'], maxWidth: 10 }),
      property({ code: 'grid', type: PropertyType.Table, columns: null }),
      property({ code: 'note', type: PropertyType.Text, formats: ['jpg'], maxSizeMb: 5 }),
    ]);

    // jpeg — это jpg; pdf изображением не бывает
    expect(image).toMatchObject({
      formats: ['jpg', 'png'],
      maxSizeMb: 2,
      maxWidth: 1920,
      maxHeight: null,
      columns: null,
    });
    expect(file).toMatchObject({ formats: ['pdf', 'docx'], maxWidth: null });
    // Число столбцов, которое не задали, — 3
    expect(table).toMatchObject({ columns: 3 });
    expect(text).toMatchObject({ formats: [], maxSizeMb: null });
  });

  it('ловит слишком широкую таблицу', () => {
    const [table] = normalizeProperties([property({ type: PropertyType.Table, columns: 21 })]);
    expect(propertiesError([table])).toMatch(/столбц/);
  });
});

describe('ограничения по ревью', () => {
  const link = (listKey: string, recordId: string) => ({ listKey, recordId });

  it('источник привязки отбрасывает чужие ссылки, свои оставляет', () => {
    const related = property({
      code: 'related',
      name: 'Связанное',
      type: PropertyType.ContentLink,
      multiple: true,
      linkList: 'pages',
    });
    const stored = { related: [link('pages', '2'), link('forms', 'form-1')] };

    // Чужая ссылка уходит одна — остальное поле остаётся на месте
    expect(normalizeValues([related], stored, false).values).toEqual({
      related: [link('pages', '2')],
    });
    // Своих ссылок не осталось — значения нет
    expect(
      normalizeValues([related], { related: [link('forms', 'form-1')] }, false).values,
    ).toEqual({});
  });

  it('привязка к записям без источника не берёт ничего, к типу — только типы', () => {
    const anyRecord = property({ code: 'related', name: 'Связанное', type: PropertyType.ContentLink, multiple: true });
    const ofType = property({ code: 'kind', name: 'Тип', type: PropertyType.ContentTypeLink, multiple: true });
    const item = link('content-items.3', '7');
    const type = link('contents', '3');

    // Источник обязателен: без него свойство не сохранить, а прежние значения не читаются
    expect(propertiesError([anyRecord])).toMatch(/не выбрано, откуда брать записи/);
    expect(normalizeValues([anyRecord], { related: [item, type] }, false).values).toEqual({});
    expect(normalizeValues([ofType], { kind: [item, type] }, false).values).toEqual({
      kind: [type],
    });
    // Обе ссылки идут на проверку существования
    expect(referencedLinks([anyRecord, ofType], { related: [item], kind: [type] })).toEqual([item, type]);
  });

  it('источник — элементы одного типа контента', () => {
    const news = property({
      code: 'news',
      name: 'Новость',
      type: PropertyType.ContentLink,
      linkList: 'content-items.3',
    });
    expect(
      normalizeValues([news], { news: [link('content-items.3', '7'), link('content-items.4', '8')] }, false)
        .values,
    ).toEqual({ news: link('content-items.3', '7') });
  });

  it('привязка к значениям списка выбирает варианты чужого свойства', () => {
    const kind = property({
      code: 'kind',
      name: 'Тип страницы',
      type: PropertyType.ListOptionLink,
      optionsPropertyId: 12,
      // Варианты подставляет чтение — у самой привязки их нет
      options: [{ id: 200, code: 'dynamic', name: 'Динамическая' }],
    });
    expect(normalizeValues([kind], { kind: '200' }, true).values).toEqual({ kind: 200 });
    expect(normalizeValues([kind], { kind: 201 }, true).errors).toHaveLength(1);
    // Без свойства-источника не сохранить, а свои варианты при сохранении отбрасываются
    expect(propertiesError([{ ...kind, optionsPropertyId: null }])).toMatch(/свойство-список/);
    expect(normalizeProperties([kind])[0]).toMatchObject({ options: [], optionsPropertyId: 12 });
  });

  it('пустая строка сверх потолка таблицу не ломает', () => {
    const grid = property({ code: 'grid', name: 'Таблица', type: PropertyType.Table, columns: 1 });
    const filled = Array.from({ length: TABLE_MAX_ROWS }, (_row, index) => [String(index + 1)]);

    // Хвостовая пустая строка не хранится, значит и в потолок не считается
    const { values, errors } = normalizeValues([grid], { grid: [...filled, ['']] }, true);
    expect(errors).toEqual([]);
    expect((values.grid as string[][]).length).toBe(TABLE_MAX_ROWS);
    // А заполненная строка сверх потолка — по-прежнему ошибка
    expect(normalizeValues([grid], { grid: [...filled, ['лишняя']] }, true).errors).toHaveLength(1);
  });
});

describe('значения новых типов', () => {
  const table = property({ code: 'grid', name: 'Таблица', type: PropertyType.Table, columns: 2 });
  const link = property({
    code: 'related',
    name: 'Связанное',
    type: PropertyType.ContentLink,
    multiple: true,
    linkList: 'pages',
  });
  const html = property({ code: 'body', name: 'Текст', type: PropertyType.Html });

  it('у таблицы столбцов как в настройках, а строк сколько дали', () => {
    const { values } = normalizeValues(
      [table],
      { grid: [[' a ', 1, 'лишнее'], ['b'], ['третья строка']] },
      true,
    );
    // Лишний столбец отрезан, недостающий добит пустым, строки все три
    expect(values.grid).toEqual([
      ['a', '1'],
      ['b', ''],
      ['третья строка', ''],
    ]);
    // Пустые строки с конца не хранятся, таблица без значений — пусто
    expect(normalizeValues([table], { grid: [['x', ''], ['', '']] }, false).values).toEqual({
      grid: [['x', '']],
    });
    expect(normalizeValues([table], { grid: [['', ''], ['']] }, false).values).toEqual({});
  });

  it('привязки — без повторов и только правильного вида', () => {
    const page = { listKey: 'pages', recordId: '2' };
    const { values } = normalizeValues([link], { related: [page, { ...page }] }, true);
    expect(values.related).toEqual([page]);
    expect(referencedLinks([link], values)).toEqual([page]);
    expect(normalizeValues([link], { related: [{ listKey: 'pages' }] }, true).errors).toHaveLength(1);
  });

  it('HTML хранится как есть', () => {
    const body = '<p>Текст</p>\n<p>Второй абзац</p>';
    expect(normalizeValues([html], { body }, true).values.body).toBe(body);
  });
});

describe('fileRuleError', () => {
  const file = { id: 1, name: 'photo.JPEG', mimeType: 'image/jpeg', size: 3 * 1024 * 1024 };

  it('проверяет «только изображения», формат и вес', () => {
    const image = property({ name: 'Фото', type: PropertyType.Image, formats: ['jpg'], maxSizeMb: 2 });
    expect(fileRuleError(image, file)).toMatch(/больше 2 МБ/);
    expect(fileRuleError({ ...image, maxSizeMb: 5 }, file)).toBeNull();
    expect(fileRuleError({ ...image, formats: ['png'] }, file)).toMatch(/формат не подходит/);
    expect(fileRuleError(image, { ...file, name: 'doc.pdf', mimeType: 'application/pdf' })).toMatch(
      /не изображение/,
    );
  });
});

describe('дерево записей', () => {
  const parents = new Map<string, string | null>([
    ['1', null],
    ['2', '1'],
    ['3', '2'],
  ]);

  it('не даёт вложить запись в саму себя и в своих потомков', () => {
    expect(parentError('1', '1', parents)).toMatch(/саму себя/);
    expect(parentError('1', '3', parents)).toMatch(/вложенную/);
    expect(parentError('3', '1', parents)).toBeNull();
    expect(parentError('2', null, parents)).toBeNull();
  });

  // Категории товаров адресуются номером, а не строкой — правило то же
  it('проверяет и дерево с числовыми ключами', () => {
    const numeric = new Map<number, number | null>([
      [1, null],
      [2, 1],
    ]);
    expect(parentError(1, 2, numeric)).toMatch(/вложенную/);
    expect(parentError(2, 1, numeric)).toBeNull();
  });

  it('вложенные в удалённую запись поднимаются к её родителю', () => {
    expect(Array.from(reparentAfterRemove(['2'], parents))).toEqual([['3', '1']]);
    expect(Array.from(reparentAfterRemove(['1', '2'], parents))).toEqual([['3', null]]);
  });
});

describe('вкладки карточки записи', () => {
  it('пустые и неполные вкладки отбрасываются, пробелы срезаются', () => {
    expect(
      normalizeTabs([
        { code: ' seo ', name: ' SEO ' },
        { code: '', name: 'Без кода' },
        { code: 'empty', name: '  ' },
      ]),
    ).toEqual([{ code: 'seo', name: 'SEO' }]);
  });

  it('ловит повтор кода вкладки', () => {
    const tabs = normalizeTabs([
      { code: 'seo', name: 'SEO' },
      { code: 'seo', name: 'Ещё SEO' },
    ]);
    expect(tabsError(tabs, [])).toMatch(/повторяется/);
  });

  it('ловит ссылку свойства на несуществующую вкладку', () => {
    const tabs = normalizeTabs([{ code: 'seo', name: 'SEO' }]);
    const [onKnown] = normalizeProperties([property({ tab: 'seo' })]);
    const [onMissing] = normalizeProperties([property({ tab: 'delivery' })]);

    expect(tabsError(tabs, [onKnown])).toBeNull();
    expect(tabsError(tabs, [onMissing])).toMatch(/несуществующую вкладку/);
  });

  it('свойство без вкладки остаётся во вкладке «Свойства»', () => {
    const [plain] = normalizeProperties([property({})]);
    expect(plain.tab).toBe('');
    expect(tabsError([], [plain])).toBeNull();
  });
});

describe('SYSTEM_PROPERTIES', () => {
  // Перечень сверяется при старте: ошибка в нём роняет сервер, поэтому ловим её тестом
  it('называет только живые виды списков и годные свойства', () => {
    for (const [kind, defs] of Object.entries(SYSTEM_PROPERTIES)) {
      expect(() => resolveInfoblock(isScopedKind(kind) ? `${kind}.1` : kind)).not.toThrow();

      const properties = normalizeProperties(defs.map((def) => ({ ...def, tab: '' })));
      expect(properties).toHaveLength(defs.length);
      expect(propertiesError(properties)).toBeNull();
    }
  });

  it('назначает пользователю роль привязкой к списку ролей', () => {
    const [role] = normalizeProperties([{ ...SYSTEM_PROPERTIES.users[0], tab: '' }]);
    expect(role).toMatchObject({ code: 'role', type: PropertyType.ContentLink, linkList: 'roles' });
  });

  // Товар лежит в нескольких категориях: «Кроссовки» и «Распродажа» разом
  it('кладёт товар в категории множественной привязкой к списку категорий', () => {
    const [categories] = normalizeProperties([{ ...SYSTEM_PROPERTIES.products[0], tab: '' }]);
    expect(categories).toMatchObject({
      code: 'categories',
      type: PropertyType.ContentLink,
      multiple: true,
      linkList: 'product-categories',
    });
  });

  // Поле «Телефон» стоит в нескольких формах, а в форме — несколько полей по порядку
  it('подключает к форме поля множественной привязкой к списку полей', () => {
    const [fields] = normalizeProperties([{ ...SYSTEM_PROPERTIES.forms[0], tab: '' }]);
    expect(fields).toMatchObject({
      code: 'fields',
      type: PropertyType.ContentLink,
      multiple: true,
      linkList: 'form-fields',
    });
  });

  // У поля формы своё только стандартное, плейсхолдер — системным свойством
  it('заводит полю формы плейсхолдер строкой', () => {
    const [placeholder] = normalizeProperties([{ ...SYSTEM_PROPERTIES['form-fields'][0], tab: '' }]);
    expect(placeholder).toMatchObject({ code: 'placeholder', type: PropertyType.String });
  });
});

describe('мультидоменные значения', () => {
  const title = property({ code: 'title', type: PropertyType.String, isMultiDomain: true });
  const badge = property({
    code: 'badge',
    type: PropertyType.List,
    multiple: true,
    isMultiDomain: true,
    options: [{ id: 7, code: 'hit', name: 'Хит' }, { id: 8, code: 'new', name: 'Новинка' }],
  });

  it('значение, сохранённое до флага, становится общим', () => {
    expect(normalizeValues([title], { title: ' Фаркопы ' }, true).values.title).toEqual([
      { domainIds: null, value: 'Фаркопы' },
    ]);
  });

  it('группы проверяются как обычные значения, недописанные отбрасываются', () => {
    const { values, errors } = normalizeValues(
      [badge],
      {
        badge: [
          { domainIds: null, value: [7], exceptDomainIds: [3, 3, 5] },
          { domainIds: [2, 4], value: [8, 8] },
          { domainIds: [], value: [7] },
          { domainIds: [6], value: [] },
        ],
      },
      true,
    );
    expect(errors).toEqual([]);
    expect(values.badge).toEqual([
      { domainIds: null, value: [7], exceptDomainIds: [3, 5] },
      { domainIds: [2, 4], value: [8] },
    ]);
  });

  it('домен в двух уникальных группах и чужой вариант — ошибка', () => {
    const twice = normalizeValues(
      [title],
      { title: [{ domainIds: null, value: 'a' }, { domainIds: [2], value: 'b' }, { domainIds: [2], value: 'c' }] },
      true,
    );
    expect(twice.errors).toHaveLength(1);
    const foreign = normalizeValues([badge], { badge: [{ domainIds: [2], value: [99] }] }, true);
    expect(foreign.errors).toHaveLength(1);
  });

  it('домен может быть и в исключениях, и в уникальной группе', () => {
    const { values, errors } = normalizeValues(
      [title],
      { title: [{ domainIds: null, value: 'a', exceptDomainIds: [2] }, { domainIds: [2], value: 'b' }] },
      true,
    );
    expect(errors).toEqual([]);
    expect(values.title).toEqual([
      { domainIds: null, value: 'a', exceptDomainIds: [2] },
      { domainIds: [2], value: 'b' },
    ]);
  });

  it('обязательность — по общему значению; исключения без общего не хранятся', () => {
    const required = { ...title, required: true };
    const onlyOwn = [{ domainIds: null, value: '', exceptDomainIds: [3] }, { domainIds: [2], value: 'b' }];
    expect(normalizeValues([required], { title: onlyOwn }, true).errors).toHaveLength(1);
    expect(normalizeValues([title], { title: onlyOwn }, true).values.title).toEqual([
      { domainIds: null, value: null },
      { domainIds: [2], value: 'b' },
    ]);
  });

  it('ссылки и домены собираются из всех групп', () => {
    const gallery = property({ code: 'gallery', type: PropertyType.File, multiple: true, isMultiDomain: true });
    const values = {
      gallery: [
        { domainIds: null, value: [1], exceptDomainIds: [5] },
        { domainIds: [2, 3], value: [4, 1] },
      ],
    };
    expect(plainValues([gallery], values).gallery).toEqual([1, 4, 1]);
    expect(referencedDomainIds([gallery], values).sort()).toEqual([2, 3, 5]);
  });
});
