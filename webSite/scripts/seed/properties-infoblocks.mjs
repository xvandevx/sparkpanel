/**
 * Свойства списков раздела «Инфоблоки» и их значения у каждой записи.
 *
 * Списки: типы инфоблоков (`infoblock-sections`), инфоблоки каждого типа
 * (`infoblocks.<id типа>`) и записи каждого инфоблока (`infoblock-elements.<id>`).
 * Ключи записей — как в журнале: `section-1`, `block-2`, `element-3`.
 *
 * Заведённое руками не трогаем:
 * - у «Товаров» остаётся свойство `photo`, у «Категорий» — `tset`, `werwer`, `sss`
 *   и дерево; имя, код и `isTree` уже сохранённых настроек не меняются;
 * - свои свойства только дописываются в конец (или правятся на месте, если это
 *   наше же свойство того же типа — смена типа стёрла бы значения);
 * - значения сливаются с сохранёнными: что у записи уже заполнено, остаётся как
 *   есть, родитель в дереве — тоже.
 *
 * Деревья: «Категории» (как и было, «test2» внутри «test») и «Вопросы и ответы»:
 * уточняющие вопросы вложены в основной вопрос своей темы.
 *
 * Идемпотентность: настройки и значения отправляются, только если после слияния
 * что-то отличается от сохранённого, — повторный запуск не пишет ничего (и не
 * засоряет журнал правок пустыми строками). Номера записей, файлов, инфоблоков
 * и страниц ищутся на лету по коду или имени.
 */
import { get, log, put } from './lib.mjs';

const SECTION = 'properties-infoblocks';

// ---------------------------------------------------------------------------
// Описание свойств
// ---------------------------------------------------------------------------

const MULTIPLE_TYPES = new Set(['file', 'image', 'list', 'content-link']);

/** Свойство в том виде, в каком его хранит сервер: у каждого типа только свои настройки. */
function prop(code, name, type, extra = {}) {
  const isFile = type === 'file' || type === 'image';
  const isImage = type === 'image';
  const isTable = type === 'table';
  return {
    code,
    name,
    type,
    required: Boolean(extra.required),
    multiple: MULTIPLE_TYPES.has(type) && Boolean(extra.multiple),
    options: type === 'list' ? extra.options : [],
    formats: isFile ? extra.formats ?? [] : [],
    maxSizeMb: isFile ? extra.maxSizeMb ?? null : null,
    maxWidth: isImage ? extra.maxWidth ?? null : null,
    maxHeight: isImage ? extra.maxHeight ?? null : null,
    rows: isTable ? extra.rows ?? 3 : null,
    columns: isTable ? extra.columns ?? 3 : null,
  };
}

const string = (code, name, extra) => prop(code, name, 'string', extra);
const number = (code, name, extra) => prop(code, name, 'number', extra);
const text = (code, name, extra) => prop(code, name, 'text', extra);
const html = (code, name, extra) => prop(code, name, 'html', extra);
const list = (code, name, options, extra) => prop(code, name, 'list', { ...extra, options });
const file = (code, name, extra) => prop(code, name, 'file', extra);
const image = (code, name, extra) => prop(code, name, 'image', extra);
const link = (code, name, extra) => prop(code, name, 'content-link', extra);
const table = (code, name, rows, columns, extra) => prop(code, name, 'table', { ...extra, rows, columns });
const meta = (code, name, extra) => prop(code, name, 'meta', extra);

const PHOTO_FORMATS = ['jpg', 'png', 'webp'];
const ICON_FORMATS = ['svg', 'png'];

// ---------------------------------------------------------------------------
// Типы инфоблоков: infoblock-sections, запись — section-<id>
// ---------------------------------------------------------------------------

const TYPES_LIST = {
  key: 'infoblock-sections',
  name: 'Типы инфоблоков',
  code: 'infoblock-types',
  properties: [
    image('icon', 'Иконка', { formats: ICON_FORMATS, maxSizeMb: 1, maxWidth: 512, maxHeight: 512 }),
    html('description', 'Описание'),
  ],
  // По коду типа
  records: {
    catalog: (r) => ({
      icon: r.file('icon-towbar.svg'),
      description:
        '<p>Всё, что продаёт магазин: фаркопы, электрика, велобагажники и легковые прицепы.</p>' +
        '<p>Из этих списков строятся каталог, фильтры по автомобилю и карточки товаров.</p>',
    }),
    content: (r) => ({
      icon: r.file('favicon-64.png'),
      description:
        '<p>Статьи блога и новости компании. Статьи приводят посетителей из поиска, ' +
        'новости держат постоянных клиентов в курсе: новые центры, график работы, оплата.</p>',
    }),
    promo: (r) => ({
      icon: r.file('icon-card.svg'),
      description:
        '<p>Акции, сезонные распродажи и специальные условия для корпоративных клиентов.</p>' +
        '<p>У каждой акции есть срок: после даты окончания запись выключают, но не удаляют — ' +
        'её удобно скопировать на следующий сезон.</p>',
    }),
    reference: (r) => ({
      icon: r.file('icon-socket.svg'),
      description:
        '<p>Справочники для подбора фаркопа по машине: марки и модели автомобилей. ' +
        'Модель ссылается на свою марку и на подходящие товары каталога.</p>',
    }),
    company: (r) => ({
      icon: r.file('icon-shield.svg'),
      description:
        '<p>Раздел «О компании»: команда, сертификаты и дилерские документы, открытые вакансии.</p>',
    }),
    media: (r) => ({
      icon: r.file('apple-touch-icon-180.png'),
      description:
        '<p>Видеообзоры и инструкции по установке. Ролики выводятся на страницах услуг ' +
        'и в карточках товаров, о которых в них рассказываем.</p>',
    }),
    service: (r) => ({
      icon: r.file('icon-wrench.svg'),
      description:
        '<p>Всё про установку и поддержку клиентов: адреса установочных центров, ' +
        'ответы на частые вопросы и отзывы.</p>',
    }),
  },
};

// ---------------------------------------------------------------------------
// Инфоблоки типа: infoblocks.<id типа>, запись — block-<id>
// ---------------------------------------------------------------------------

const TEMPLATES = ['Плитка', 'Список', 'Карусель', 'Таблица', 'Аккордеон', 'Карта'];
const SORTS = ['По порядку', 'Сначала новые', 'По названию', 'По цене'];

const BLOCKS_LIST = {
  name: (type) => `Инфоблоки типа «${type.name}»`,
  code: (type) => `infoblocks-${type.code}`,
  properties: [
    string('heading', 'Заголовок на сайте'),
    list('template', 'Шаблон вывода', TEMPLATES),
    number('per_page', 'Элементов на странице'),
    list('sort', 'Сортировка', SORTS),
    link('page', 'Страница вывода'),
  ],
  // По коду инфоблока: код уникален у пользователя целиком
  records: {
    products: (r) => ({
      heading: 'Каталог фаркопов и аксессуаров',
      template: 'Плитка',
      per_page: 24,
      sort: 'По порядку',
      page: r.page('catalog'),
    }),
    sections: (r) => ({
      heading: 'Категории товаров',
      template: 'Плитка',
      per_page: 12,
      sort: 'По порядку',
      page: r.page('catalog'),
    }),
    newss: (r) => ({
      heading: 'Полезные статьи',
      template: 'Список',
      per_page: 10,
      sort: 'Сначала новые',
      page: r.page('blog'),
    }),
    news: (r) => ({
      heading: 'Новости «Фаркоп.ру»',
      template: 'Список',
      per_page: 6,
      sort: 'Сначала новые',
      page: r.page('news'),
    }),
    promotions: (r) => ({
      heading: 'Акции и специальные предложения',
      template: 'Карусель',
      per_page: 5,
      sort: 'Сначала новые',
      page: r.page('promo'),
    }),
    'car-brands': (r) => ({
      heading: 'Выберите марку автомобиля',
      template: 'Плитка',
      per_page: 30,
      sort: 'По названию',
      page: r.page('selection'),
    }),
    'car-models': (r) => ({
      heading: 'Выберите модель и поколение',
      template: 'Таблица',
      per_page: 50,
      sort: 'По названию',
      page: r.page('selection'),
    }),
    employees: (r) => ({
      heading: 'Наша команда',
      template: 'Плитка',
      per_page: 12,
      sort: 'По порядку',
      page: r.page('team'),
    }),
    certificates: (r) => ({
      heading: 'Сертификаты и документы',
      template: 'Плитка',
      per_page: 12,
      sort: 'Сначала новые',
      page: r.page('about'),
    }),
    vacancies: (r) => ({
      heading: 'Открытые вакансии',
      template: 'Список',
      per_page: 10,
      sort: 'Сначала новые',
      page: r.page('vacancies'),
    }),
    video: (r) => ({
      heading: 'Видеообзоры и инструкции',
      template: 'Карусель',
      per_page: 8,
      sort: 'Сначала новые',
      page: r.page('towbar-installation'),
    }),
    'install-points': (r) => ({
      heading: 'Установочные центры',
      template: 'Карта',
      per_page: 20,
      sort: 'По порядку',
      page: r.page('contacts'),
    }),
    faq: (r) => ({
      heading: 'Частые вопросы',
      template: 'Аккордеон',
      per_page: 20,
      sort: 'По порядку',
      page: r.page('services'),
    }),
    reviews: (r) => ({
      heading: 'Отзывы наших клиентов',
      template: 'Карусель',
      per_page: 9,
      sort: 'Сначала новые',
      page: r.page('reviews'),
    }),
  },
};

// ---------------------------------------------------------------------------
// Записи инфоблоков: infoblock-elements.<id>, запись — element-<id>
// ---------------------------------------------------------------------------

const P = 'products';

const ELEMENT_LISTS = {
  // --- Товары: настройки уже есть, свойство photo заведено руками ---------
  products: {
    code: 'elements-products',
    keep: ['photo'],
    properties: [
      number('price', 'Цена, ₽', { required: true }),
      number('old_price', 'Старая цена, ₽'),
      string('sku', 'Артикул'),
      list('badges', 'Бейджи', ['Хит', 'Новинка', 'Скидка'], { multiple: true }),
      image('gallery', 'Галерея', { multiple: true, formats: PHOTO_FORMATS, maxSizeMb: 5, maxWidth: 3000, maxHeight: 3000 }),
      table('specs', 'Характеристики', 6, 2),
      file('manual', 'Инструкция', { formats: ['pdf'], maxSizeMb: 20 }),
      html('description', 'Описание'),
      link('related', 'Похожие товары', { multiple: true }),
      meta('seo', 'SEO'),
    ],
    records: {
      'bosal-4225-a-kia-rio': (r) => ({
        photo: r.file('farkop-bosal-kia-rio.png'),
        price: 8450,
        old_price: 9200,
        sku: 'BOS-4225-A',
        badges: ['Хит', 'Скидка'],
        gallery: r.files('farkop-bosal-kia-rio.png', 'rozetka-13pin.png', 'kronshtein-nomera.png'),
        specs: [
          ['Производитель', 'Bosal (Бельгия)'],
          ['Тип шара', 'A, на двух болтах'],
          ['Масса прицепа', '1200 кг'],
          ['Вертикальная нагрузка', '75 кг'],
          ['Вес фаркопа', '14,5 кг'],
          ['Гарантия', '3 года'],
        ],
        manual: r.file('instrukciya-montazha-farkopa.pdf'),
        description:
          '<p>Bosal 4225-A — проверенный вариант для тех, кто время от времени возит прицеп на дачу ' +
          'или ставит велобагажник. Балка крепится в штатные точки, сверлить кузов не нужно.</p>' +
          '<ul><li>В комплекте: балка, шар, подрозетник и крепёж класса 8.8</li>' +
          '<li>Подходит для Kia Rio IV седан и X-Line, Hyundai Solaris II 2017–2023</li></ul>' +
          '<p>Для машин с CAN-шиной рекомендуем блок согласования Smart Connect.</p>',
        related: r.els(P, 'baltex-lada-vesta', 'smart-connect-7pin-sportage', 'thule-easyfold-xt-2'),
        seo: {
          h1: 'Фаркоп Bosal 4225-A для Kia Rio IV и Hyundai Solaris II',
          title: 'Фаркоп Bosal 4225-A на Kia Rio и Solaris — цена с установкой | Фаркоп.ру',
          description:
            'Фаркоп Bosal 4225-A для Kia Rio IV и Hyundai Solaris II: прицеп до 1200 кг, сертификат ТР ТС. ' +
            'Цена 8 450 ₽, установка за час в Москве и Санкт-Петербурге.',
        },
      }),
      'westfalia-321685600001-tiguan': (r) => ({
        photo: r.file('farkop-westfalia-vw-tiguan.png'),
        price: 49900,
        sku: 'WF-321685600001',
        badges: ['Новинка'],
        gallery: r.files('farkop-westfalia-vw-tiguan.png', 'rozetka-13pin.png'),
        specs: [
          ['Производитель', 'Westfalia (Германия)'],
          ['Тип шара', 'вертикально-съёмный'],
          ['Масса прицепа', '2500 кг'],
          ['Вертикальная нагрузка', '100 кг'],
          ['Вес фаркопа', '21 кг'],
          ['Гарантия', '5 лет'],
        ],
        manual: r.file('instrukciya-montazha-farkopa.pdf'),
        description:
          '<p>Шар снимается без инструмента и хранится в нише запасного колеса, а розетка ' +
          'откидывается под бампер — в обычной езде фаркопа не видно.</p>' +
          '<p>Ставим вместе со штатным блоком электрики: тогда в системе стабилизации ' +
          'включается режим прицепа, а датчики парковки отключаются автоматически.</p>',
        related: r.els(P, 'brink-645900-kodiaq', 'smart-connect-7pin-sportage', 'thule-easyfold-xt-2'),
        seo: {
          h1: 'Вертикально-съёмный фаркоп Westfalia для Volkswagen Tiguan II',
          title: 'Фаркоп Westfalia 321685600001 на VW Tiguan II — официальный дилер | Фаркоп.ру',
          description:
            'Оригинальный вертикально-съёмный фаркоп Westfalia для Tiguan II и Tiguan Allspace: ' +
            'прицеп до 2500 кг, гарантия производителя 5 лет.',
        },
      }),
      'leader-plus-t114-a-rav4': (r) => ({
        photo: r.file('farkop-leader-plus-renault-duster.png'),
        price: 11200,
        old_price: 12500,
        sku: 'LP-T114-A',
        badges: ['Хит'],
        gallery: r.files('farkop-leader-plus-renault-duster.png', 'kronshtein-nomera.png'),
        specs: [
          ['Производитель', 'Лидер Плюс (Россия)'],
          ['Тип шара', 'A, на двух болтах'],
          ['Масса прицепа', '1500 кг'],
          ['Вертикальная нагрузка', '75 кг'],
          ['Вес фаркопа', '16 кг'],
          ['Гарантия', '2 года'],
        ],
        manual: r.file('instrukciya-montazha-farkopa.pdf'),
        description:
          '<p>Недорогой и надёжный фаркоп для Toyota RAV4 пятого поколения, кроме гибридных версий. ' +
          'Рама оцинкована и окрашена порошком — зимние реагенты ей не страшны.</p>' +
          '<p>Бампер не снимается, монтаж занимает около полутора часов.</p>',
        related: r.els(P, 'smart-connect-7pin-sportage', 'bosal-4225-a-kia-rio'),
        seo: {
          h1: 'Фаркоп Лидер Плюс T114-A для Toyota RAV4 (XA50)',
          title: 'Фаркоп на Toyota RAV4 XA50 Лидер Плюс T114-A — 11 200 ₽ | Фаркоп.ру',
          description:
            'Российский фаркоп с оцинковкой для Toyota RAV4 XA50: шар тип A, прицеп до 1500 кг. ' +
            'Установка с электрикой за 1,5 часа.',
        },
      }),
      'brink-645900-kodiaq': (r) => ({
        price: 38700,
        sku: 'BR-645900',
        badges: ['Новинка'],
        gallery: r.files('rozetka-13pin.png'),
        specs: [
          ['Производитель', 'Brink (Нидерланды)'],
          ['Тип шара', 'автоматически съёмный'],
          ['Масса прицепа', '2000 кг'],
          ['Вертикальная нагрузка', '90 кг'],
          ['Вес фаркопа', '19 кг'],
          ['Гарантия', '5 лет'],
        ],
        manual: r.file('instrukciya-montazha-farkopa.pdf'),
        description:
          '<p>Шар фиксируется автоматически, а индикатор на замке показывает, что он встал на место: ' +
          'зелёный — можно ехать, красный — защёлкните ещё раз.</p>' +
          '<p>Skoda Kodiaq имеет штатную подготовку под фаркоп, электрика подключается через ' +
          'блок управления автомобиля с активацией у дилерского диагноста.</p>',
        related: r.els(P, 'westfalia-321685600001-tiguan', 'smart-connect-7pin-sportage'),
        seo: {
          h1: 'Фаркоп Brink 645900 для Skoda Kodiaq',
          title: 'Автоматически съёмный фаркоп Brink на Skoda Kodiaq | Фаркоп.ру',
          description:
            'Фаркоп Brink 645900 для Skoda Kodiaq с индикатором фиксации шара: прицеп до 2000 кг, ' +
            'гарантия 5 лет. Цена 38 700 ₽.',
        },
      }),
      'baltex-lada-vesta': (r) => ({
        photo: r.file('farkop-avtos-lada-vesta.png'),
        price: 6300,
        old_price: 6900,
        sku: 'BTX-LV-01',
        badges: ['Хит', 'Скидка'],
        gallery: r.files('farkop-avtos-lada-vesta.png', 'rozetka-13pin.png'),
        specs: [
          ['Производитель', 'Baltex (Россия)'],
          ['Тип шара', 'A, на двух болтах'],
          ['Масса прицепа', '1000 кг'],
          ['Вертикальная нагрузка', '50 кг'],
          ['Вес фаркопа', '12 кг'],
          ['Гарантия', '2 года'],
        ],
        manual: r.file('instrukciya-montazha-farkopa.pdf'),
        description:
          '<p>Самый продаваемый фаркоп для Lada Vesta: подходит к седану, SW и SW Cross. ' +
          'Крепится в штатные точки лонжеронов, бампер подрезается снизу на пару сантиметров.</p>' +
          '<p>Электрика — простая розетка 7 pin, блок согласования не обязателен.</p>',
        related: r.els(P, 'bosal-4225-a-kia-rio', 'thule-easyfold-xt-2'),
        seo: {
          h1: 'Фаркоп Baltex для Lada Vesta седан и SW Cross',
          title: 'Фаркоп на Lada Vesta Baltex — от 6 300 ₽ с установкой | Фаркоп.ру',
          description:
            'Фаркоп Baltex для Lada Vesta седан, SW и SW Cross: прицеп до 1000 кг, установка за 40 минут. ' +
            'В наличии в Москве и Санкт-Петербурге.',
        },
      }),
      'smart-connect-7pin-sportage': (r) => ({
        photo: r.file('blok-soglasovaniya-smart-connect.png'),
        price: 6900,
        sku: 'SC-7P-KS5',
        badges: ['Хит'],
        gallery: r.files('blok-soglasovaniya-smart-connect.png', 'rozetka-13pin.png'),
        specs: [
          ['Производитель', 'Smart Connect (Россия)'],
          ['Розетка', '7 pin'],
          ['Совместимость', 'Kia Sportage V (NQ5)'],
          ['Ток на канал', 'до 15 А'],
          ['Подключение', 'без врезки в штатную проводку'],
          ['Гарантия', '2 года'],
        ],
        description:
          '<p>Блок согласования развязывает электрику прицепа и бортовую сеть автомобиля: ' +
          'короткое замыкание в фонаре прицепа не уронит CAN-шину и не зажжёт ошибки на панели.</p>' +
          '<p>Подключается к штатным разъёмам за фонарями, провода не режутся — ' +
          'гарантия дилера сохраняется.</p>',
        related: r.els(P, 'bosal-4225-a-kia-rio', 'westfalia-321685600001-tiguan'),
        seo: {
          h1: 'Электрика Smart Connect 7-pin для Kia Sportage V',
          title: 'Блок согласования Smart Connect на Kia Sportage V — 6 900 ₽ | Фаркоп.ру',
          description:
            'Электрика для фаркопа Kia Sportage V с блоком согласования Smart Connect: ' +
            'защита CAN-шины, подключение без врезки в проводку.',
        },
      }),
      'thule-easyfold-xt-2': (r) => ({
        price: 74900,
        old_price: 83200,
        sku: 'TH-934100',
        badges: ['Скидка'],
        specs: [
          ['Производитель', 'Thule (Швеция)'],
          ['Крепление', 'на шар фаркопа'],
          ['Велосипедов', '2'],
          ['Грузоподъёмность', '60 кг, до 30 кг на велосипед'],
          ['Вес багажника', '17,9 кг'],
          ['Гарантия', '5 лет'],
        ],
        description:
          '<p>Платформа складывается до размеров чемодана и хранится в багажнике. ' +
          'Наклоняется вместе с велосипедами — багажник автомобиля открывается без снятия груза.</p>' +
          '<p>Подходит для электровелосипедов и fat-bike с шинами до 4,7 дюйма.</p>',
        related: r.els(P, 'westfalia-321685600001-tiguan', 'bosal-4225-a-kia-rio'),
        seo: {
          h1: 'Велобагажник Thule EasyFold XT 2 на фаркоп',
          title: 'Thule EasyFold XT 2 — велобагажник на фаркоп для 2 велосипедов | Фаркоп.ру',
          description:
            'Складной велобагажник Thule EasyFold XT 2 на фаркоп: 2 велосипеда до 30 кг, наклон ' +
            'для доступа к багажнику. Скидка 10% до конца сезона.',
        },
      }),
      'aragon-e4421ba-x-trail': (r) => ({
        price: 15800,
        sku: 'AR-E4421BA',
        specs: [
          ['Производитель', 'Aragon (Испания)'],
          ['Тип шара', 'быстросъёмный'],
          ['Масса прицепа', '2000 кг'],
          ['Вертикальная нагрузка', '85 кг'],
          ['Вес фаркопа', '17 кг'],
          ['Гарантия', '2 года'],
        ],
        description:
          '<p>Модель снята с производства, на складе остались последние комплекты. ' +
          'Если нужного количества нет, предложим аналог Bosal или Лидер Плюс с той же нагрузкой.</p>',
        related: r.els(P, 'brink-645900-kodiaq', 'leader-plus-t114-a-rav4'),
        seo: {
          h1: 'Фаркоп Aragon E4421BA для Nissan X-Trail T32',
          title: 'Фаркоп Aragon на Nissan X-Trail T32 — остатки со склада | Фаркоп.ру',
        },
      }),
    },
  },

  // --- Категории: настройки и дерево заведены руками ------------------------
  sections: {
    code: 'elements-sections',
    isTree: true,
    keep: ['tset', 'werwer', 'sss'],
    properties: [
      image('icon', 'Иконка', { formats: ICON_FORMATS, maxSizeMb: 1, maxWidth: 512, maxHeight: 512 }),
      text('description', 'Описание'),
      meta('seo', 'SEO'),
    ],
    // Дочерняя → родитель; «test2» уже лежит в «test», это не меняем
    tree: {
      test2: 'test',
      'krepezh-i-zapchasti': 'farkopy',
      'rozetki-i-perehodniki': 'elektrika-dlya-farkopa',
      'aksessuary-dlya-pricepa': 'pricepy',
    },
    records: {
      test: () => ({
        description: 'Тестовая категория — заведена вручную, чтобы проверить древовидный список.',
      }),
      test2: () => ({
        description: 'Тестовая подкатегория внутри «test».',
      }),
      farkopy: (r) => ({
        icon: r.file('icon-towbar.svg'),
        description:
          'Тягово-сцепные устройства для легковых автомобилей и кроссоверов.\n' +
          'Съёмные на двух болтах, фланцевые, вертикально- и автоматически съёмные — ' +
          'с сертификатом ТР ТС 018/2011 на каждую модель.',
        seo: {
          h1: 'Фаркопы для легковых автомобилей',
          title: 'Купить фаркоп с установкой в Москве и СПб — каталог | Фаркоп.ру',
          description:
            'Более 3 000 фаркопов для иномарок и отечественных автомобилей: Bosal, Westfalia, Brink, ' +
            'Лидер Плюс. Подбор по машине и установка за 1–2 часа.',
        },
      }),
      'elektrika-dlya-farkopa': (r) => ({
        icon: r.file('icon-socket.svg'),
        description:
          'Блоки согласования Smart Connect, штатные комплекты электрики и универсальные жгуты.\n' +
          'Для автомобилей с CAN-шиной подбираем вариант без врезки в проводку.',
        seo: {
          h1: 'Электрика для фаркопа',
          title: 'Электрика для фаркопа и блоки согласования Smart Connect | Фаркоп.ру',
          description:
            'Штатная и универсальная электрика для фаркопа, блоки согласования Smart Connect. ' +
            'Подключение без ошибок на панели приборов.',
        },
      }),
      velobagazhniki: () => ({
        description:
          'Платформы на 2–4 велосипеда, которые ставятся на шар фаркопа.\n' +
          'Thule, Menabo и Peruzzo — с наклоном для доступа к багажнику и замком от кражи.',
        seo: {
          h1: 'Велобагажники на фаркоп',
          title: 'Велобагажник на фаркоп — Thule, Menabo, Peruzzo | Фаркоп.ру',
          description:
            'Велобагажники на фаркоп для 2–4 велосипедов, в том числе электровелосипедов. ' +
            'Доставка по России, примерка на автомобиле в наших центрах.',
        },
      }),
      'rozetki-i-perehodniki': (r) => ({
        icon: r.file('icon-socket.svg'),
        description:
          '7- и 13-контактные розетки, переходники 7/13 pin, подрозетники и защитные крышки.',
        seo: {
          h1: 'Розетки и переходники для фаркопа',
          title: 'Розетки 7 и 13 pin, переходники для прицепа | Фаркоп.ру',
          description: 'Розетки фаркопа 7 и 13 pin и переходники между ними — для европейских и российских прицепов.',
        },
      }),
      'krepezh-i-zapchasti': (r) => ({
        icon: r.file('icon-wrench.svg'),
        description: 'Шары тип A и F, болты класса 8.8, кронштейны розеток, заглушки и колпачки на шар.',
        seo: {
          h1: 'Крепёж и запчасти для фаркопа',
          title: 'Шары, болты и запчасти для фаркопа | Фаркоп.ру',
          description: 'Запасные шары, крепёж и мелкие запчасти для фаркопов всех популярных производителей.',
        },
      }),
      pricepy: (r) => ({
        icon: r.file('icon-delivery.svg'),
        description:
          'Бортовые, лодочные и прицепы под квадроцикл полной массой до 750 кг.\n' +
          'Ездить с ними можно с правами категории B.',
        seo: {
          h1: 'Легковые прицепы',
          title: 'Легковые прицепы до 750 кг — купить в Москве | Фаркоп.ру',
          description: 'Легковые прицепы полной массой до 750 кг: бортовые, лодочные, для квадроцикла. Права категории B.',
        },
      }),
      'aksessuary-dlya-pricepa': (r) => ({
        icon: r.file('icon-shield.svg'),
        description: 'Страховочные тросы, тенты, противооткатные упоры и замки на сцепное устройство.',
        seo: {
          h1: 'Аксессуары для прицепа',
          title: 'Аксессуары для легкового прицепа | Фаркоп.ру',
          description: 'Тенты, страховочные тросы, упоры и замки для легковых прицепов — всё для безопасной поездки.',
        },
      }),
    },
  },

  // --- Статьи ----------------------------------------------------------------
  newss: {
    code: 'elements-articles',
    properties: [
      image('cover', 'Обложка', { formats: PHOTO_FORMATS, maxSizeMb: 2, maxWidth: 2400, maxHeight: 1600 }),
      string('author', 'Автор'),
      list(
        'rubric',
        'Рубрика',
        ['Выбор фаркопа', 'Электрика', 'Прицепы', 'Аксессуары', 'Уход и обслуживание', 'Документы и ГИБДД', 'Гарантия'],
        { multiple: true },
      ),
      number('reading_time', 'Время чтения, мин'),
      html('text', 'Текст'),
      link('related', 'Связанное', { multiple: true }),
      meta('seo', 'SEO'),
    ],
    records: {
      'kak-vybrat-farkop': (r) => ({
        cover: r.file('banner-catalog-1200x400.png'),
        author: 'Дмитрий Кузнецов, мастер-установщик',
        rubric: ['Выбор фаркопа'],
        reading_time: 7,
        text:
          '<h2>Коротко</h2><ul>' +
          '<li><strong>На двух болтах</strong> — самый доступный вариант для дачи и редких поездок с прицепом.</li>' +
          '<li><strong>Фланцевый</strong> — шар на плите, подходит для велобагажников и частой буксировки.</li>' +
          '<li><strong>Вертикально-съёмный</strong> — дорогой, но невидимый: шар снимается за секунды.</li></ul>' +
          '<p>Не уверены? Мастер подберёт фаркоп по VIN-номеру за пять минут.</p>',
        related: [
          ...r.els(P, 'bosal-4225-a-kia-rio', 'westfalia-321685600001-tiguan', 'brink-645900-kodiaq'),
          r.el('video', 'obzor-westfalia-vertikalnyy'),
        ],
        seo: {
          h1: 'Как выбрать фаркоп: съёмный, фланцевый или вертикальный',
          title: 'Какой фаркоп выбрать — сравнение типов конструкции | Фаркоп.ру',
          description:
            'Сравниваем фаркопы на двух болтах, фланцевые и вертикально-съёмные: цена, удобство, ' +
            'нагрузка. Советы мастера-установщика.',
        },
      }),
      'nuzhno-li-registrirovat-farkop': (r) => ({
        cover: r.file('banner-installation-1600x900.png'),
        author: 'Марина Белова',
        rubric: ['Документы и ГИБДД'],
        reading_time: 5,
        text:
          '<p>Если производитель автомобиля предусмотрел установку фаркопа, регистрировать его не нужно: ' +
          'достаточно возить с собой сертификат соответствия на конкретную модель.</p>' +
          '<p>Сертификат мы выдаём вместе с заказ-нарядом на установку.</p>',
        related: [
          r.el('faq', 'nuzhno-li-vnosit-farkop-v-dokumenty'),
          r.el('certificates', 'tr-ts-018-bosal'),
        ],
        seo: {
          h1: 'Нужно ли регистрировать фаркоп в ГИБДД в 2026 году',
          title: 'Регистрация фаркопа в ГИБДД в 2026 году — когда она нужна | Фаркоп.ру',
          description: 'Когда фаркоп не нужно регистрировать, какие документы возить с собой и что будет при проверке.',
        },
      }),
      'smart-connect-ili-shtatnaya-elektrika': (r) => ({
        cover: r.file('news-smart-connect.png'),
        author: 'Илья Морозов, инженер по электрике',
        rubric: ['Электрика'],
        reading_time: 6,
        text:
          '<p>Штатная электрика стоит дороже и требует активации у диагноста, зато автомобиль «знает» ' +
          'о прицепе: отключает парктроники и включает режим прицепа в системе стабилизации.</p>' +
          '<p>Smart Connect дешевле и ставится за полчаса — для велобагажника и дачного прицепа его хватает.</p>',
        related: [
          r.el(P, 'smart-connect-7pin-sportage'),
          r.el('video', 'kak-podklyuchaetsya-smart-connect'),
          r.el('faq', 'chto-takoe-smart-connect'),
        ],
        seo: {
          h1: 'Smart Connect или штатная электрика',
          title: 'Smart Connect или штатная электрика для фаркопа — что выбрать | Фаркоп.ру',
          description: 'Сравниваем блок согласования Smart Connect и штатную электрику по цене, функциям и гарантии.',
        },
      }),
      'uhod-za-farkopom-zimoy': (r) => ({
        cover: r.file('news-autumn-sale.png'),
        author: 'Сергей Волков, мастер-установщик',
        rubric: ['Уход и обслуживание'],
        reading_time: 4,
        text:
          '<ol><li>Снимайте шар на зиму, если не пользуетесь прицепом.</li>' +
          '<li>Раз в месяц промывайте узел крепления от реагентов.</li>' +
          '<li>Смазывайте шар и замок силиконовой смазкой.</li>' +
          '<li>Закрывайте розетку крышкой — контакты окисляются за один сезон.</li>' +
          '<li>Перед весной проверьте момент затяжки болтов.</li></ol>',
        related: [r.el('promotions', 'zimnyaya-zashchita'), r.page('winter-towbar-care')],
        seo: {
          h1: 'Уход за фаркопом зимой',
          title: 'Как ухаживать за фаркопом зимой — 5 советов мастера | Фаркоп.ру',
          description: 'Реагенты, коррозия и смазка шара: пять привычек, которые продлят жизнь фаркопу и розетке.',
        },
      }),
      'kakoy-pricep-mozhno-buksirovat-na-kategorii-b': (r) => ({
        cover: r.file('news-trailer-tips.png'),
        author: 'Андрей Соколов',
        rubric: ['Прицепы', 'Документы и ГИБДД'],
        reading_time: 6,
        text:
          '<p>С категорией B можно буксировать прицеп полной массой до 750 кг — без ограничений. ' +
          'Тяжелее — только если масса автопоезда не превышает 3 500 кг.</p>' +
          '<p>Для прицепа тяжелее 750 кг и автопоезда больше 3,5 т понадобится категория BE.</p>',
        related: [
          r.el('video', 'test-pricep-lada-vesta'),
          r.el('sections', 'pricepy'),
          r.page('trailer-license'),
        ],
        seo: {
          h1: 'Какой прицеп можно буксировать с правами категории B',
          title: 'Прицеп на категории B: до скольких килограммов можно | Фаркоп.ру',
          description: 'Ограничения по массе прицепа и автопоезда для водителей с категорией B и когда нужна категория BE.',
        },
      }),
      'velobagazhnik-na-farkop-plyusy-i-minusy': (r) => ({
        cover: r.file('banner-kia-sportage-980x300.png'),
        author: 'Марина Белова',
        rubric: ['Аксессуары'],
        reading_time: 5,
        text:
          '<p><strong>Плюсы:</strong> велосипеды не нужно поднимать на крышу, расход топлива почти не растёт, ' +
          'в гараж с высотой 2 метра заезжать можно.</p>' +
          '<p><strong>Минусы:</strong> закрываются номер и фонари — нужна платформа со своими фонарями и рамкой номера.</p>',
        related: [
          r.el(P, 'thule-easyfold-xt-2'),
          r.el('video', 'thule-easyfold-sborka'),
          r.el('promotions', 'skidka-na-velobagazhniki'),
        ],
        seo: {
          h1: 'Велобагажник на фаркоп: плюсы и минусы',
          title: 'Велобагажник на фаркоп или на крышу — что лучше | Фаркоп.ру',
          description: 'Почему платформа на фаркопе удобнее крышевого багажника и что проверить перед покупкой.',
        },
      }),
      'farkop-i-garantiya-dilera': (r) => ({
        author: 'Андрей Соколов',
        rubric: ['Гарантия'],
        reading_time: 3,
        text: '<p>Черновик. Ждём письменные ответы дилеров Kia, Toyota, Volkswagen и Haval.</p>',
        related: [r.el('faq', 'sohranitsya-li-garantiya')],
        seo: { title: 'Сохранится ли гарантия дилера после установки фаркопа | Фаркоп.ру' },
      }),
    },
  },

  // --- Новости компании --------------------------------------------------------
  news: {
    code: 'elements-company-news',
    properties: [
      image('cover', 'Обложка', { formats: PHOTO_FORMATS, maxSizeMb: 2 }),
      list('importance', 'Важность', ['Обычная', 'Важная', 'Срочная']),
      text('summary', 'Коротко для рассылки'),
      file('attachments', 'Вложения', { multiple: true, formats: ['pdf', 'txt', 'docx'], maxSizeMb: 10 }),
      link('more', 'Подробнее'),
      meta('seo', 'SEO'),
    ],
    records: {
      'otkrytie-centra-v-himkah': (r) => ({
        cover: r.file('banner-installation-1600x900.png'),
        importance: 'Важная',
        summary: 'Новый установочный центр в Химках у МКАД: 4 подъёмника и запись в день обращения.',
        more: r.el('install-points', 'himki-leningradskoe-shosse'),
        seo: {
          title: 'Открыли установочный центр в Химках | Фаркоп.ру',
          description: 'Новый центр установки фаркопов в Химках на Ленинградском шоссе: 4 подъёмника, работаем ежедневно.',
        },
      }),
      'novyy-sklad-v-parnase': (r) => ({
        cover: r.file('news-new-warehouse.png'),
        importance: 'Обычная',
        summary: 'Склад в Парнасе на 2 000 м²: заказы по Петербургу и области — на следующий день.',
        more: r.page('delivery'),
        seo: { title: 'Новый склад в Санкт-Петербурге — доставка за один день | Фаркоп.ру' },
      }),
      'oficialnyy-diler-westfalia': (r) => ({
        cover: r.file('banner-catalog-1200x400.png'),
        importance: 'Важная',
        summary: 'Стали официальным дилером Westfalia: прямые поставки и гарантия производителя 5 лет.',
        attachments: r.files('sertifikat-tr-ts-westfalia.pdf'),
        more: r.el('certificates', 'diler-westfalia-2026'),
        seo: { title: '«Фаркоп.ру» — официальный дилер Westfalia в России' },
      }),
      'grafik-raboty-v-noyabrskie-prazdniki': (r) => ({
        importance: 'Срочная',
        summary: '4 ноября центры работают с 10:00 до 18:00, интернет-магазин принимает заказы круглосуточно.',
        attachments: r.files('grafik-prazdniki.txt'),
        more: r.page('november-holidays-schedule'),
      }),
      'oplata-po-sbp-i-rassrochka': (r) => ({
        cover: r.file('banner-free-delivery-1920x500.png'),
        importance: 'Обычная',
        summary: 'Оплата по QR-коду через СБП и рассрочка на 6 месяцев без переплаты на фаркоп с установкой.',
        more: r.page('delivery'),
        seo: { title: 'Оплата по СБП и рассрочка на 6 месяцев | Фаркоп.ру' },
      }),
      '10-let-farkop-ru': (r) => ({
        cover: r.file('banner-autumn-sale-2400x600.png'),
        importance: 'Важная',
        summary: 'Нам 10 лет! За это время установили больше 60 000 фаркопов. Спасибо, что вы с нами.',
        more: r.page('history'),
        seo: {
          h1: '«Фаркоп.ру» — 10 лет',
          title: '10 лет «Фаркоп.ру»: 60 000 установленных фаркопов',
          description: 'Как маленький гаражный сервис стал сетью установочных центров в пяти городах.',
        },
      }),
    },
  },

  // --- Акции и скидки --------------------------------------------------------
  promotions: {
    code: 'elements-promotions',
    properties: [
      number('discount', 'Скидка, %'),
      string('ends', 'Действует до'),
      string('promo_code', 'Промокод'),
      image('banner', 'Баннер', { formats: PHOTO_FORMATS, maxSizeMb: 3 }),
      html('terms', 'Условия'),
      link('products', 'Товары по акции', { multiple: true }),
    ],
    records: {
      'ustanovka-v-podarok': (r) => ({
        ends: '30 ноября 2026',
        promo_code: 'USTANOVKA0',
        banner: r.file('banner-installation-1600x900.png'),
        terms:
          '<p>Установка бесплатна при покупке фаркопа вместе с блоком согласования Smart Connect ' +
          'или штатной электрикой в одном заказе.</p>' +
          '<ul><li>Акция действует во всех собственных центрах</li><li>Не суммируется с другими скидками</li></ul>',
        products: r.els(P, 'bosal-4225-a-kia-rio', 'leader-plus-t114-a-rav4', 'baltex-lada-vesta', 'smart-connect-7pin-sportage'),
      }),
      'skidka-na-velobagazhniki': (r) => ({
        discount: 10,
        ends: '31 октября 2026',
        promo_code: 'VELO10',
        banner: r.file('banner-mobile-750x1000.png'),
        terms: '<p>Скидка 10% на все велобагажники Thule и Menabo при заказе на сайте или в центре — пока есть на складе.</p>',
        products: r.els(P, 'thule-easyfold-xt-2'),
      }),
      'zimnyaya-zashchita': (r) => ({
        ends: '31 декабря 2026',
        banner: r.file('banner-autumn-sale-2400x600.png'),
        terms:
          '<p>Бесплатно обработаем шар, замок и розетку фаркопа антикоррозийным составом. ' +
          'Занимает 15 минут, запись не нужна — приезжайте в любой центр.</p>',
      }),
      'privedi-druga': (r) => ({
        ends: 'бессрочно',
        promo_code: 'DRUG1000',
        terms:
          '<p>Дайте другу свой промокод из личного кабинета. Друг получит скидку 1 000 ₽ на первую установку, ' +
          'а вы — 1 000 ₽ на следующую покупку после того, как он оплатит заказ.</p>',
      }),
      'skidka-dlya-avtoparkov': (r) => ({
        discount: 15,
        ends: 'бессрочно',
        terms:
          '<p>Скидка 15% на фаркопы и установку для таксопарков, служб доставки и компаний ' +
          'с автопарком от 5 машин. Работаем по договору, с НДС и закрывающими документами.</p>',
        products: r.els(P, 'leader-plus-t114-a-rav4', 'baltex-lada-vesta'),
      }),
      'chernaya-pyatnica-2025': (r) => ({
        discount: 25,
        ends: '1 декабря 2025',
        promo_code: 'BLACK25',
        banner: r.file('banner-kia-sportage-980x300.png'),
        terms: '<p>Акция завершена. Скидка до 25% действовала на фаркопы Westfalia и Brink с 28 ноября по 1 декабря 2025 года.</p>',
        products: r.els(P, 'westfalia-321685600001-tiguan', 'brink-645900-kodiaq'),
      }),
    },
  },

  // --- Бренды автомобилей ----------------------------------------------------
  'car-brands': {
    code: 'elements-car-brands',
    properties: [
      list('country', 'Страна', ['Россия', 'Южная Корея', 'Япония', 'Германия', 'Чехия', 'Китай']),
      number('models_count', 'Моделей в каталоге'),
      text('about', 'О марке'),
      link('popular', 'Популярные товары', { multiple: true }),
      meta('seo', 'SEO'),
    ],
    records: {
      lada: (r) => ({
        country: 'Россия',
        models_count: 12,
        about: 'Фаркопы для Vesta, Granta, Largus и Niva — самые доступные и всегда в наличии.',
        popular: r.els(P, 'baltex-lada-vesta'),
        seo: { h1: 'Фаркопы для Lada', title: 'Фаркоп на Lada — Vesta, Granta, Niva, Largus | Фаркоп.ру' },
      }),
      kia: (r) => ({
        country: 'Южная Корея',
        models_count: 18,
        about: 'Rio, Ceed, Sportage, Sorento. Для моделей после 2018 года нужна электрика с блоком согласования.',
        popular: r.els(P, 'bosal-4225-a-kia-rio', 'smart-connect-7pin-sportage'),
        seo: { h1: 'Фаркопы для Kia', title: 'Фаркоп на Kia с установкой | Фаркоп.ру' },
      }),
      hyundai: (r) => ({
        country: 'Южная Корея',
        models_count: 16,
        about: 'Solaris, Creta, Tucson и Santa Fe — фаркопы Bosal, Лидер Плюс и Westfalia.',
        popular: r.els(P, 'bosal-4225-a-kia-rio'),
        seo: { h1: 'Фаркопы для Hyundai', title: 'Фаркоп на Hyundai Solaris, Creta, Tucson | Фаркоп.ру' },
      }),
      toyota: (r) => ({
        country: 'Япония',
        models_count: 21,
        about: 'RAV4, Camry, Land Cruiser и Hilux. Для гибридов подбираем фаркопы с отдельным допуском.',
        popular: r.els(P, 'leader-plus-t114-a-rav4'),
        seo: { h1: 'Фаркопы для Toyota', title: 'Фаркоп на Toyota RAV4, Land Cruiser, Camry | Фаркоп.ру' },
      }),
      volkswagen: (r) => ({
        country: 'Германия',
        models_count: 15,
        about: 'Polo, Tiguan, Touareg, Amarok. Официальный дилер Westfalia — оригинальные фаркопы с гарантией.',
        popular: r.els(P, 'westfalia-321685600001-tiguan'),
        seo: { h1: 'Фаркопы для Volkswagen', title: 'Фаркоп на Volkswagen Tiguan, Polo, Touareg | Фаркоп.ру' },
      }),
      skoda: (r) => ({
        country: 'Чехия',
        models_count: 9,
        about: 'Octavia, Kodiaq, Karoq. Многие модели имеют штатную подготовку под фаркоп.',
        popular: r.els(P, 'brink-645900-kodiaq'),
        seo: { h1: 'Фаркопы для Skoda', title: 'Фаркоп на Skoda Kodiaq, Octavia, Karoq | Фаркоп.ру' },
      }),
      haval: () => ({
        country: 'Китай',
        models_count: 6,
        about: 'Jolion, F7, Dargo, H9. Фаркопы без сверления кузова, монтаж за час.',
        seo: { h1: 'Фаркопы для Haval', title: 'Фаркоп на Haval Jolion, F7, Dargo | Фаркоп.ру' },
      }),
      chery: () => ({
        country: 'Китай',
        models_count: 8,
        about: 'Tiggo 4, Tiggo 7 Pro Max, Tiggo 8. Электрика под CAN-шину обязательна.',
        seo: { h1: 'Фаркопы для Chery', title: 'Фаркоп на Chery Tiggo — подбор и установка | Фаркоп.ру' },
      }),
      datsun: () => ({
        country: 'Япония',
        models_count: 2,
        about: 'Марка ушла с рынка. Фаркопы на on-DO и mi-DO — из остатков, по запросу.',
      }),
    },
  },

  // --- Модели авто -------------------------------------------------------------
  'car-models': {
    code: 'elements-car-models',
    properties: [
      link('brand', 'Марка', { required: true }),
      string('years', 'Годы выпуска'),
      list('body', 'Кузов', ['Седан', 'Хэтчбек', 'Универсал', 'Лифтбек', 'Кроссовер', 'Внедорожник'], { multiple: true }),
      number('max_trailer', 'Масса прицепа с тормозами, кг'),
      list('control_unit', 'Блок согласования', ['Не нужен', 'Рекомендуется', 'Обязателен']),
      link('towbars', 'Подходящие товары', { multiple: true }),
    ],
    records: {
      'lada-vesta': (r) => ({
        brand: r.el('car-brands', 'lada'),
        years: '2015 — н. в.',
        body: ['Седан', 'Универсал'],
        max_trailer: 900,
        control_unit: 'Не нужен',
        towbars: r.els(P, 'baltex-lada-vesta'),
      }),
      'lada-niva-travel': (r) => ({
        brand: r.el('car-brands', 'lada'),
        years: '2020 — н. в.',
        body: ['Внедорожник'],
        max_trailer: 1500,
        control_unit: 'Не нужен',
      }),
      'kia-sportage-5': (r) => ({
        brand: r.el('car-brands', 'kia'),
        years: '2021 — н. в.',
        body: ['Кроссовер'],
        max_trailer: 1650,
        control_unit: 'Обязателен',
        towbars: r.els(P, 'smart-connect-7pin-sportage'),
      }),
      'hyundai-creta-2': (r) => ({
        brand: r.el('car-brands', 'hyundai'),
        years: '2021 — н. в.',
        body: ['Кроссовер'],
        max_trailer: 1200,
        control_unit: 'Рекомендуется',
        towbars: r.els(P, 'thule-easyfold-xt-2'),
      }),
      'toyota-rav4-xa50': (r) => ({
        brand: r.el('car-brands', 'toyota'),
        years: '2019 — н. в.',
        body: ['Кроссовер'],
        max_trailer: 1500,
        control_unit: 'Обязателен',
        towbars: r.els(P, 'leader-plus-t114-a-rav4'),
      }),
      'volkswagen-tiguan-2': (r) => ({
        brand: r.el('car-brands', 'volkswagen'),
        years: '2016 — 2024',
        body: ['Кроссовер'],
        max_trailer: 2500,
        control_unit: 'Обязателен',
        towbars: r.els(P, 'westfalia-321685600001-tiguan', 'thule-easyfold-xt-2'),
      }),
      'skoda-kodiaq': (r) => ({
        brand: r.el('car-brands', 'skoda'),
        years: '2017 — н. в.',
        body: ['Кроссовер'],
        max_trailer: 2000,
        control_unit: 'Обязателен',
        towbars: r.els(P, 'brink-645900-kodiaq'),
      }),
      'haval-jolion': (r) => ({
        brand: r.el('car-brands', 'haval'),
        years: '2021 — н. в.',
        body: ['Кроссовер'],
        max_trailer: 1200,
        control_unit: 'Рекомендуется',
      }),
      'chery-tiggo-7-pro-max': (r) => ({
        brand: r.el('car-brands', 'chery'),
        years: '2022 — н. в.',
        body: ['Кроссовер'],
        max_trailer: 1500,
        control_unit: 'Обязателен',
      }),
    },
  },

  // --- Сотрудники --------------------------------------------------------------
  employees: {
    code: 'elements-employees',
    properties: [
      string('position', 'Должность', { required: true }),
      number('experience', 'Стаж, лет'),
      string('phone', 'Рабочий телефон'),
      link('workplace', 'Где работает'),
      list(
        'skills',
        'Компетенции',
        ['Установка фаркопов', 'Автоэлектрика', 'CAN-шина и Smart Connect', 'Подбор и консультации', 'Оптовые продажи', 'Обучение мастеров'],
        { multiple: true },
      ),
      text('about', 'О себе'),
    ],
    records: {
      'andrey-sokolov': (r) => ({
        position: 'Руководитель установочного центра',
        experience: 14,
        phone: '+7 (495) 120-45-67, доб. 101',
        workplace: r.el('install-points', 'moskva-varshavskoe-shosse'),
        skills: ['Установка фаркопов', 'Обучение мастеров'],
        about: 'Пришёл в компанию мастером в 2016 году. Сам обучает новых установщиков и проверяет каждую сложную установку.',
      }),
      'marina-belova': () => ({
        position: 'Старший менеджер по продажам',
        experience: 8,
        phone: '+7 (495) 120-45-67, доб. 112',
        skills: ['Подбор и консультации'],
        about: 'Знает наизусть совместимость фаркопов с сотней моделей и подберёт вариант даже для редкой машины.',
      }),
      'dmitriy-kuznecov': (r) => ({
        position: 'Мастер-установщик, автоэлектрик',
        experience: 12,
        phone: '+7 (495) 120-45-67, доб. 121',
        workplace: r.el('install-points', 'moskva-varshavskoe-shosse'),
        skills: ['Установка фаркопов', 'Автоэлектрика', 'CAN-шина и Smart Connect'],
        about: 'Берётся за самые сложные случаи: штатная электрика с активацией, гибриды, автомобили с адаптивным круизом.',
      }),
      'sergey-volkov': (r) => ({
        position: 'Мастер-установщик',
        experience: 6,
        phone: '+7 (495) 120-45-68, доб. 201',
        workplace: r.el('install-points', 'himki-leningradskoe-shosse'),
        skills: ['Установка фаркопов'],
        about: 'Ставит фаркоп на Весту за 40 минут и никогда не торопится, когда дело касается электрики.',
      }),
      'olga-nikitina': () => ({
        position: 'Руководитель отдела оптовых продаж',
        experience: 10,
        phone: '+7 (495) 120-45-67, доб. 130',
        skills: ['Оптовые продажи', 'Подбор и консультации'],
        about: 'Работает с СТО, дилерскими центрами и автопарками: договоры, отсрочка платежа, выездные установки.',
      }),
      'ilya-morozov': (r) => ({
        position: 'Инженер по электрике',
        experience: 7,
        phone: '+7 (495) 120-45-69, доб. 140',
        workplace: r.el('install-points', 'moskva-ryazanskiy-prospekt'),
        skills: ['Автоэлектрика', 'CAN-шина и Smart Connect', 'Обучение мастеров'],
        about: 'Тестирует блоки согласования на новых моделях и пишет для мастеров схемы подключения.',
      }),
      'pavel-gromov': (r) => ({
        position: 'Мастер-установщик',
        experience: 4,
        workplace: r.el('install-points', 'ekaterinburg-montyorskaya'),
        skills: ['Установка фаркопов'],
        about: 'Работал в центре в Екатеринбурге до августа 2025 года.',
      }),
    },
  },

  // --- Сертификаты -------------------------------------------------------------
  certificates: {
    code: 'elements-certificates',
    properties: [
      file('scan', 'Скан документа', { formats: ['pdf', 'png', 'jpg'], maxSizeMb: 10 }),
      list('doc_type', 'Вид документа', [
        'Сертификат соответствия',
        'Декларация о соответствии',
        'Дилерский сертификат',
        'Сертификат СМК',
        'Свидетельство об обучении',
      ]),
      string('number', 'Номер документа'),
      string('issuer', 'Кем выдан'),
      string('valid_until', 'Действует до'),
    ],
    records: {
      'tr-ts-018-bosal': (r) => ({
        scan: r.file('sertifikat-tr-ts-bosal.pdf'),
        doc_type: 'Сертификат соответствия',
        number: 'ЕАЭС RU С-BE.АД41.В.04518/25',
        issuer: 'Орган по сертификации продукции машиностроения',
        valid_until: '14.12.2030',
      }),
      'diler-westfalia-2026': () => ({
        doc_type: 'Дилерский сертификат',
        number: 'WF-RU-2026-0457',
        issuer: 'Westfalia-Automotive GmbH',
        valid_until: '31.12.2026',
      }),
      'partner-lider-plus': () => ({
        doc_type: 'Дилерский сертификат',
        number: 'ЛП-П-2026/118',
        issuer: 'Завод «Лидер Плюс»',
        valid_until: '31.12.2026',
      }),
      'avtorizovannyy-centr-smart-connect': (r) => ({
        scan: r.file('sertifikat-ustanovochnogo-centra.png'),
        doc_type: 'Свидетельство об обучении',
        number: 'SC-АЦ-0219',
        issuer: 'Учебный центр Smart Connect',
        valid_until: '01.03.2027',
      }),
      'iso-9001-2015': (r) => ({
        scan: r.file('sertifikat-iso-9001.pdf'),
        doc_type: 'Сертификат СМК',
        number: 'РОСС RU.ИС12.К00873',
        issuer: 'Орган по сертификации систем менеджмента',
        valid_until: '19.09.2028',
      }),
      'diler-brink-2024': () => ({
        doc_type: 'Дилерский сертификат',
        number: 'BR-RU-2024-0331',
        issuer: 'Brink Towing Systems',
        valid_until: '31.12.2024',
      }),
    },
  },

  // --- Вакансии ----------------------------------------------------------------
  vacancies: {
    code: 'elements-vacancies',
    properties: [
      number('salary_from', 'Зарплата от, ₽'),
      number('salary_to', 'Зарплата до, ₽'),
      list('schedule', 'График', ['Полный день, 5/2', 'Сменный, 2/2', 'Удалённо', 'Гибкий график']),
      list('experience', 'Опыт', ['Без опыта', 'От 1 года', 'От 3 лет']),
      html('duties', 'Обязанности и требования'),
      link('apply_form', 'Форма отклика'),
      string('contact', 'Контактное лицо'),
    ],
    records: {
      'master-ustanovshchik-moskva': (r) => ({
        salary_from: 90000,
        salary_to: 140000,
        schedule: 'Сменный, 2/2',
        experience: 'От 1 года',
        duties:
          '<p><strong>Чем заниматься:</strong> установка фаркопов и электрики, подключение блоков согласования, ' +
          'выдача автомобиля клиенту.</p>' +
          '<p><strong>Что ждём:</strong> опыт кузовного или слесарного ремонта, аккуратность, права категории B.</p>',
        apply_form: r.form('callback'),
        contact: 'Андрей Соколов',
      }),
      'avtoelektrik-himki': (r) => ({
        salary_from: 110000,
        salary_to: 160000,
        schedule: 'Полный день, 5/2',
        experience: 'От 3 лет',
        duties:
          '<p>Подключение штатной электрики с активацией, диагностика CAN-шины, работа с дилерским ПО.</p>' +
          '<p>Нужен опыт с автомобилями VAG, Kia и Hyundai после 2018 года.</p>',
        apply_form: r.form('callback'),
        contact: 'Илья Морозов',
      }),
      'menedzher-po-prodazham': (r) => ({
        salary_from: 60000,
        salary_to: 120000,
        schedule: 'Удалённо',
        experience: 'От 1 года',
        duties:
          '<p>Консультации по телефону и в чате, подбор фаркопа по автомобилю, оформление заказов и записей на установку.</p>',
        apply_form: r.form('feedback'),
        contact: 'Марина Белова',
      }),
      'kladovshchik-spb': (r) => ({
        salary_from: 65000,
        salary_to: 75000,
        schedule: 'Полный день, 5/2',
        experience: 'Без опыта',
        duties: '<p>Приёмка и комплектация заказов, работа с ТСД, подготовка отправок в транспортные компании.</p>',
        apply_form: r.form('callback'),
        contact: 'Отдел кадров',
      }),
      'voditel-kurer': (r) => ({
        salary_from: 70000,
        salary_to: 100000,
        schedule: 'Гибкий график',
        experience: 'От 1 года',
        duties:
          '<p>Доставка заказов по Москве и области на своём автомобиле. Компенсируем топливо и амортизацию, ' +
          'маршруты строим с вечера.</p>',
        apply_form: r.form('callback'),
        contact: 'Отдел кадров',
      }),
      'internet-marketolog': (r) => ({
        salary_from: 120000,
        salary_to: 180000,
        schedule: 'Удалённо',
        experience: 'От 3 лет',
        duties: '<p>Вакансия закрыта. Контекстная реклама, SEO-задачи для подрядчика, аналитика продаж по каналам.</p>',
        apply_form: r.form('feedback'),
        contact: 'Отдел кадров',
      }),
    },
  },

  // --- Видео ---------------------------------------------------------------------
  video: {
    code: 'elements-video',
    properties: [
      string('video_url', 'Ссылка на ролик', { required: true }),
      number('duration', 'Длительность, мин'),
      image('poster', 'Превью', { formats: PHOTO_FORMATS, maxSizeMb: 2 }),
      table('timecodes', 'Таймкоды', 5, 2),
      link('related', 'Связанные материалы', { multiple: true }),
    ],
    records: {
      'ustanovka-farkopa-kia-rio': (r) => ({
        video_url: 'https://farkop.ru/media/video/ustanovka-farkopa-kia-rio.mp4',
        duration: 12,
        poster: r.file('farkop-bosal-kia-rio.png'),
        timecodes: [
          ['00:00', 'Что входит в комплект'],
          ['01:40', 'Снимаем заглушки и подрезаем бампер'],
          ['04:15', 'Крепим балку в штатные точки'],
          ['07:30', 'Подключаем электрику'],
          ['10:50', 'Проверяем свет на прицепе'],
        ],
        related: r.els(P, 'bosal-4225-a-kia-rio'),
      }),
      'kak-podklyuchaetsya-smart-connect': (r) => ({
        video_url: 'https://farkop.ru/media/video/kak-podklyuchaetsya-smart-connect.mp4',
        duration: 9,
        poster: r.file('news-smart-connect.png'),
        timecodes: [
          ['00:00', 'Зачем нужен блок согласования'],
          ['02:10', 'Где стоят штатные разъёмы'],
          ['04:30', 'Подключение без врезки'],
          ['06:45', 'Проверка ошибок сканером'],
          ['08:20', 'Ответы на вопросы'],
        ],
        related: [r.el(P, 'smart-connect-7pin-sportage'), r.el('newss', 'smart-connect-ili-shtatnaya-elektrika')],
      }),
      'obzor-westfalia-vertikalnyy': (r) => ({
        video_url: 'https://farkop.ru/media/video/obzor-westfalia-vertikalnyy.mp4',
        duration: 8,
        poster: r.file('farkop-westfalia-vw-tiguan.png'),
        timecodes: [
          ['00:00', 'Внешний вид без шара'],
          ['01:20', 'Как снять и поставить шар'],
          ['03:05', 'Откидная розетка'],
          ['05:00', 'Ниша для хранения'],
          ['06:40', 'Цена и гарантия'],
        ],
        related: r.els(P, 'westfalia-321685600001-tiguan'),
      }),
      'thule-easyfold-sborka': (r) => ({
        video_url: 'https://farkop.ru/media/video/thule-easyfold-sborka.mp4',
        duration: 10,
        timecodes: [
          ['00:00', 'Распаковка'],
          ['01:30', 'Раскладываем платформу'],
          ['03:10', 'Ставим на шар фаркопа'],
          ['05:40', 'Крепим два электровелосипеда'],
          ['08:30', 'Наклон и доступ к багажнику'],
        ],
        related: [r.el(P, 'thule-easyfold-xt-2'), r.el('newss', 'velobagazhnik-na-farkop-plyusy-i-minusy')],
      }),
      'test-pricep-lada-vesta': (r) => ({
        video_url: 'https://farkop.ru/media/video/test-pricep-lada-vesta.mp4',
        duration: 15,
        poster: r.file('farkop-avtos-lada-vesta.png'),
        timecodes: [
          ['00:00', 'Загружаем прицеп до 750 кг'],
          ['03:20', 'Разгон до 90 км/ч'],
          ['06:50', 'Торможение с прицепом'],
          ['10:15', 'Расход топлива на трассе'],
          ['13:30', 'Выводы'],
        ],
        related: [r.el(P, 'baltex-lada-vesta'), r.el('newss', 'kakoy-pricep-mozhno-buksirovat-na-kategorii-b')],
      }),
      'ekskursiya-po-centru-varshavskoe': (r) => ({
        video_url: 'https://farkop.ru/media/video/ekskursiya-po-centru-varshavskoe.mp4',
        duration: 6,
        poster: r.file('banner-installation-1600x900.png'),
        timecodes: [
          ['00:00', 'Ресепшен и зона ожидания'],
          ['01:15', 'Подъёмники'],
          ['02:40', 'Склад фаркопов'],
          ['04:00', 'Как проходит выдача'],
        ],
        related: [r.el('install-points', 'moskva-varshavskoe-shosse'), r.el('employees', 'andrey-sokolov')],
      }),
    },
  },

  // --- Пункты установки --------------------------------------------------------
  'install-points': {
    code: 'elements-install-points',
    properties: [
      list('kind', 'Тип', ['Собственный центр', 'Партнёрский центр']),
      string('phone', 'Телефон'),
      string('coords', 'Координаты'),
      number('lifts', 'Подъёмников'),
      list(
        'services',
        'Услуги',
        ['Установка фаркопа', 'Подключение электрики', 'Установка Smart Connect', 'Антикоррозийная обработка', 'Самовывоз заказов'],
        { multiple: true },
      ),
      table('hours', 'Режим работы', 3, 2),
      link('manager', 'Руководитель'),
    ],
    records: {
      'moskva-varshavskoe-shosse': (r) => ({
        kind: 'Собственный центр',
        phone: '+7 (495) 120-45-67',
        coords: '55.6125, 37.6091',
        lifts: 6,
        services: ['Установка фаркопа', 'Подключение электрики', 'Установка Smart Connect', 'Антикоррозийная обработка', 'Самовывоз заказов'],
        hours: [['Пн–Пт', '9:00–21:00'], ['Сб', '9:00–21:00'], ['Вс', '9:00–21:00']],
        manager: r.el('employees', 'andrey-sokolov'),
      }),
      'himki-leningradskoe-shosse': () => ({
        kind: 'Собственный центр',
        phone: '+7 (495) 120-45-68',
        coords: '55.8971, 37.4297',
        lifts: 4,
        services: ['Установка фаркопа', 'Подключение электрики', 'Установка Smart Connect', 'Самовывоз заказов'],
        hours: [['Пн–Пт', '9:00–21:00'], ['Сб', '9:00–21:00'], ['Вс', '9:00–21:00']],
      }),
      'moskva-ryazanskiy-prospekt': (r) => ({
        kind: 'Собственный центр',
        phone: '+7 (495) 120-45-69',
        coords: '55.7268, 37.7517',
        lifts: 3,
        services: ['Установка фаркопа', 'Подключение электрики', 'Установка Smart Connect'],
        hours: [['Пн–Пт', '10:00–20:00'], ['Сб', '10:00–20:00'], ['Вс', 'выходной']],
        manager: r.el('employees', 'ilya-morozov'),
      }),
      'spb-sofiyskaya': () => ({
        kind: 'Собственный центр',
        phone: '+7 (812) 407-18-30',
        coords: '59.8662, 30.4108',
        lifts: 4,
        services: ['Установка фаркопа', 'Подключение электрики', 'Самовывоз заказов'],
        hours: [['Пн–Пт', '9:00–20:00'], ['Сб', '9:00–20:00'], ['Вс', '9:00–20:00']],
      }),
      'ekaterinburg-montyorskaya': () => ({
        kind: 'Собственный центр',
        phone: '+7 (343) 288-61-05',
        coords: '56.8829, 60.6163',
        lifts: 2,
        services: ['Установка фаркопа', 'Подключение электрики', 'Самовывоз заказов'],
        hours: [['Пн–Пт', '9:00–19:00'], ['Сб', '10:00–16:00'], ['Вс', 'выходной']],
      }),
      'kazan-tehnicheskaya': () => ({
        kind: 'Партнёрский центр',
        phone: '+7 (843) 207-33-41',
        coords: '55.8312, 49.1287',
        lifts: 3,
        services: ['Установка фаркопа', 'Подключение электрики'],
        hours: [['Пн–Пт', '9:00–19:00'], ['Сб', '10:00–17:00'], ['Вс', 'выходной']],
      }),
      'nizhniy-novgorod-moskovskoe': () => ({
        kind: 'Собственный центр',
        phone: '+7 (831) 413-90-27',
        coords: '56.3249, 43.9395',
        lifts: 3,
        hours: [['Пн–Пт', 'закрыт на реконструкцию'], ['Сб', 'закрыт'], ['Вс', 'закрыт']],
      }),
    },
  },

  // --- Вопросы и ответы: дерево «основной вопрос → уточняющие» ------------------
  faq: {
    code: 'elements-faq',
    isTree: true,
    properties: [
      list('topic', 'Тема', ['Установка', 'Документы и ГИБДД', 'Гарантия', 'Электрика', 'Доставка и оплата']),
      html('answer', 'Развёрнутый ответ'),
      list('in_product', 'Показывать в карточке товара', ['Да', 'Нет']),
      link('more', 'Подробнее', { multiple: true }),
    ],
    tree: {
      'mozhno-li-ustanovit-samomu': 'skolko-vremeni-zanimaet-ustanovka',
      'kakaya-garantiya-na-ustanovku': 'sohranitsya-li-garantiya',
      'oplata-pri-poluchenii': 'dostavka-v-regiony',
    },
    records: {
      'skolko-vremeni-zanimaet-ustanovka': (r) => ({
        topic: 'Установка',
        answer:
          '<p>Фаркоп с универсальной электрикой ставим за 1–1,5 часа. С блоком согласования или штатной ' +
          'электрикой и активацией через диагностику — до 2,5 часов.</p>' +
          '<p>Пока мастер работает, можно подождать в клиентской зоне: есть кофе и Wi-Fi.</p>',
        in_product: 'Да',
        more: [r.el('video', 'ustanovka-farkopa-kia-rio'), r.page('towbar-installation')],
      }),
      'nuzhno-li-vnosit-farkop-v-dokumenty': (r) => ({
        topic: 'Документы и ГИБДД',
        answer:
          '<p>Если установка фаркопа предусмотрена заводом-изготовителем, вносить изменения в документы не нужно. ' +
          'Возите с собой сертификат соответствия — мы выдаём его вместе с заказ-нарядом.</p>',
        in_product: 'Да',
        more: [r.el('newss', 'nuzhno-li-registrirovat-farkop')],
      }),
      'sohranitsya-li-garantiya': (r) => ({
        topic: 'Гарантия',
        answer:
          '<p>Да. Сертифицированный фаркоп, установленный в штатные точки без врезки в проводку, ' +
          'не даёт дилеру оснований снять автомобиль с гарантии.</p>',
        in_product: 'Да',
        more: [r.el('newss', 'farkop-i-garantiya-dilera'), r.page('warranty')],
      }),
      'chto-takoe-smart-connect': (r) => ({
        topic: 'Электрика',
        answer:
          '<p>Smart Connect — блок согласования между электрикой прицепа и бортовой сетью. ' +
          'Он защищает CAN-шину: замыкание в фонаре прицепа не вызовет ошибок на панели.</p>',
        in_product: 'Да',
        more: [r.el(P, 'smart-connect-7pin-sportage'), r.el('video', 'kak-podklyuchaetsya-smart-connect')],
      }),
      'mozhno-li-ustanovit-samomu': (r) => ({
        topic: 'Установка',
        answer:
          '<p>Можно: в комплекте есть инструкция и весь крепёж. Но гарантию на установку и сертификат ' +
          'об установке выдаём только после работы наших мастеров.</p>',
        in_product: 'Нет',
        more: [r.page('towbar-installation')],
      }),
      'kakaya-garantiya-na-ustanovku': (r) => ({
        topic: 'Гарантия',
        answer:
          '<p>На фаркоп — от 2 до 5 лет в зависимости от производителя, на нашу установку и электрику — 2 года. ' +
          'Гарантийный талон мастер заполняет при выдаче автомобиля.</p>',
        in_product: 'Да',
        more: [r.page('warranty')],
      }),
      'dostavka-v-regiony': (r) => ({
        topic: 'Доставка и оплата',
        answer:
          '<p>Доставляем по всей России транспортными компаниями и курьерской службой. ' +
          'Срок — от 1 до 7 дней в зависимости от города.</p>',
        in_product: 'Да',
        more: [r.page('delivery')],
      }),
      'oplata-pri-poluchenii': (r) => ({
        topic: 'Доставка и оплата',
        answer: '<p>Да, наличными или картой курьеру и в пунктах выдачи. Для юрлиц — по счёту.</p>',
        in_product: 'Нет',
        more: [r.page('delivery')],
      }),
    },
  },

  // --- Отзывы клиентов ---------------------------------------------------------
  reviews: {
    code: 'elements-reviews',
    properties: [
      number('rating', 'Оценка', { required: true }),
      string('car', 'Автомобиль'),
      link('product', 'Установленный товар'),
      link('place', 'Где устанавливали'),
      list('source', 'Источник', ['Сайт', 'Яндекс Карты', '2ГИС', 'Опрос после установки']),
      text('reply', 'Ответ магазина'),
    ],
    records: {
      'otzyv-aleksey-tiguan': (r) => ({
        rating: 5,
        car: 'Volkswagen Tiguan II, 2021',
        product: r.el(P, 'westfalia-321685600001-tiguan'),
        place: r.el('install-points', 'moskva-varshavskoe-shosse'),
        source: 'Сайт',
        reply: 'Алексей, спасибо! Передали благодарность Дмитрию — это его установка.',
      }),
      'otzyv-natalya-creta': (r) => ({
        rating: 5,
        car: 'Hyundai Creta II, 2022',
        product: r.el(P, 'thule-easyfold-xt-2'),
        place: r.el('install-points', 'himki-leningradskoe-shosse'),
        source: 'Яндекс Карты',
        reply: 'Наталья, хороших велопрогулок! Не забывайте раз в сезон проверять затяжку крепления.',
      }),
      'otzyv-igor-vesta': (r) => ({
        rating: 5,
        car: 'Lada Vesta SW Cross, 2020',
        product: r.el(P, 'baltex-lada-vesta'),
        place: r.el('install-points', 'moskva-ryazanskiy-prospekt'),
        source: '2ГИС',
      }),
      'otzyv-evgeniy-kodiaq': (r) => ({
        rating: 4,
        car: 'Skoda Kodiaq, 2019',
        product: r.el(P, 'brink-645900-kodiaq'),
        place: r.el('install-points', 'ekaterinburg-montyorskaya'),
        source: 'Сайт',
        reply: 'Евгений, спасибо за отзыв. Минус балл понимаем — доставку в Екатеринбург ускорили до двух дней.',
      }),
      'otzyv-svetlana-rav4': (r) => ({
        rating: 5,
        car: 'Toyota RAV4 Hybrid, 2020',
        place: r.el('install-points', 'spb-sofiyskaya'),
        source: 'Опрос после установки',
        reply: 'Светлана, рады, что смогли помочь! С гибридами действительно много нюансов.',
      }),
      'otzyv-ruslan-jolion': (r) => ({
        rating: 5,
        car: 'Haval Jolion, 2023',
        place: r.el('install-points', 'himki-leningradskoe-shosse'),
        source: 'Яндекс Карты',
      }),
      'otzyv-maksim-sportage': (r) => ({
        rating: 4,
        car: 'Kia Sportage V, 2024',
        product: r.el(P, 'smart-connect-7pin-sportage'),
        place: r.el('install-points', 'moskva-varshavskoe-shosse'),
        source: 'Сайт',
      }),
    },
  },
};

// ---------------------------------------------------------------------------
// Поиск ссылок на лету
// ---------------------------------------------------------------------------

const problems = [];

function problem(message) {
  if (!problems.includes(message)) problems.push(message);
  log(SECTION, `! ${message}`);
}

/** Всё, на что ссылаются значения: файлы и записи для привязок. */
async function loadContext() {
  const structure = await get('/infoblocks');
  const elementsByBlock = new Map();
  for (const type of structure) {
    for (const block of type.blocks) {
      elementsByBlock.set(block.id, await get(`/infoblocks/blocks/${block.id}/elements`));
    }
  }
  const [files, targets] = await Promise.all([get('/files'), get('/infoblocks/settings/link-targets')]);
  return { structure, elementsByBlock, files, targets };
}

function resolver(ctx) {
  const blockByCode = new Map(ctx.structure.flatMap((type) => type.blocks).map((block) => [block.code, block]));

  const file = (name) => {
    const found = ctx.files.find((item) => item.name === name);
    if (!found) problem(`Файл «${name}» не найден в медиатеке`);
    return found?.id;
  };
  const el = (blockCode, elementCode) => {
    const infoblock = blockByCode.get(blockCode);
    const element = infoblock && ctx.elementsByBlock.get(infoblock.id).find((item) => item.code === elementCode);
    if (!element) {
      problem(`Запись «${elementCode}» инфоблока «${blockCode}» не найдена`);
      return undefined;
    }
    return { listKey: `infoblock-elements.${infoblock.id}`, recordId: `element-${element.id}` };
  };
  // У страниц код не уникален (разные ветки), берём первую по порядку
  const page = (code) => {
    const found = ctx.targets.find((item) => item.listKey === 'pages' && item.code === code);
    if (!found) problem(`Страница с кодом «${code}» не найдена`);
    return found ? { listKey: 'pages', recordId: found.recordId } : undefined;
  };
  const form = (code) => {
    const found = ctx.targets.find((item) => item.listKey === 'forms' && item.code === code);
    if (!found) problem(`Веб-форма «${code}» не найдена`);
    return found ? { listKey: 'forms', recordId: found.recordId } : undefined;
  };

  return {
    file,
    files: (...names) => names.map(file),
    el,
    els: (blockCode, ...codes) => codes.map((code) => el(blockCode, code)),
    page,
    form,
  };
}

// ---------------------------------------------------------------------------
// Сравнение и слияние
// ---------------------------------------------------------------------------

/** JSON с отсортированными ключами: порядок полей в ответе сервера не важен. */
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

const same = (a, b) => stable(a) === stable(b);

/** Пустое значение не отправляем: ненайденные ссылки выпадают из массивов. */
function clean(values) {
  const result = {};
  for (const [code, value] of Object.entries(values)) {
    const next = Array.isArray(value) && !Array.isArray(value[0]) ? value.filter((item) => item !== undefined) : value;
    if (next === undefined || next === null || next === '') continue;
    if (Array.isArray(next) && next.length === 0) continue;
    result[code] = next;
  }
  return result;
}

/**
 * Свойства после слияния: сохранённые остаются на своих местах и как есть,
 * наши — дописываются в конец. Своё свойство того же типа правится на месте
 * (без смены типа: она стёрла бы значения), заведённое руками (`keep`) — никогда.
 */
function mergeProperties(existing, desired, keep) {
  const result = existing.map((property) => ({ ...property }));
  for (const property of desired) {
    const index = result.findIndex((item) => item.code === property.code);
    if (index === -1) result.push(property);
    else if (!keep.has(property.code) && result[index].type === property.type) result[index] = property;
  }
  return result;
}

const stats = { settings: 0, values: 0 };

/** Сохранить настройки списка, если после слияния они отличаются от сохранённых. */
async function ensureSettings(key, spec) {
  const current = await get(`/infoblocks/settings/${key}`);
  const keep = new Set(spec.keep ?? []);
  const next = {
    name: current.name ?? spec.name,
    code: current.code ?? spec.code,
    isTree: current.isTree || Boolean(spec.isTree),
    properties: mergeProperties(current.properties, spec.properties, keep),
  };
  const before = { name: current.name, code: current.code, isTree: current.isTree, properties: current.properties };
  if (same(before, next)) return current;

  let saved;
  try {
    saved = await put(`/infoblocks/settings/${key}`, next);
  } catch (error) {
    // Код занят другим списком — берём код по ключу, как предлагает окно настроек
    if (error.status !== 409 || current.code) throw error;
    const fallback = key.replace('.', '-');
    problem(`Код списка «${next.code}» занят, для ${key} взят «${fallback}»`);
    saved = await put(`/infoblocks/settings/${key}`, { ...next, code: fallback });
  }
  stats.settings += 1;
  const added = next.properties.length - current.properties.length;
  log(SECTION, `${key}: настройки «${saved.name}» сохранены (свойств ${saved.properties.length}, новых ${added}${saved.isTree ? ', дерево' : ''})`);
  return saved;
}

/**
 * Значения записей списка: к сохранённому дописывается только незаполненное,
 * родитель у дерева — сохранённый, а если его нет — из плана. Запрос уходит,
 * только если что-то поменялось.
 */
async function ensureValues(key, settings, records) {
  const codes = new Set(settings.properties.map((property) => property.code));
  const rows = await get(`/infoblocks/settings/${key}/values`);
  const byRecord = new Map(rows.map((row) => [row.recordId, row]));
  let written = 0;

  for (const { recordId, label, values, parentId } of records) {
    const row = byRecord.get(recordId);
    const stored = row?.values ?? {};
    // Незнакомые коды сервер всё равно отбросит — без них сравнение честное
    const seed = Object.fromEntries(Object.entries(clean(values)).filter(([code]) => codes.has(code)));
    const merged = { ...seed, ...stored };
    const storedParent = row?.parentId ?? null;
    const parent = settings.isTree ? storedParent ?? parentId ?? null : null;

    if (same(merged, stored) && parent === storedParent) continue;

    const body = settings.isTree ? { values: merged, parentId: parent } : { values: merged };
    try {
      await put(`/infoblocks/settings/${key}/values/${recordId}`, body);
      written += 1;
    } catch (error) {
      problem(`${key} / ${recordId} («${label}»): ${error.message}`);
    }
  }

  stats.values += written;
  log(SECTION, `${key}: значения — записей ${records.length}, обновлено ${written}`);
}

// ---------------------------------------------------------------------------
// Сид
// ---------------------------------------------------------------------------

export default async function seed() {
  problems.length = 0;
  stats.settings = 0;
  stats.values = 0;

  const ctx = await loadContext();
  const r = resolver(ctx);

  // Типы инфоблоков
  {
    const settings = await ensureSettings(TYPES_LIST.key, TYPES_LIST);
    const records = ctx.structure.map((type) => {
      const values = TYPES_LIST.records[type.code];
      if (!values) problem(`Нет демо-значений для типа «${type.name}» (${type.code})`);
      return { recordId: `section-${type.id}`, label: type.name, values: values ? values(r) : {} };
    });
    await ensureValues(TYPES_LIST.key, settings, records);
  }

  // Инфоблоки каждого типа
  for (const type of ctx.structure) {
    const key = `infoblocks.${type.id}`;
    const settings = await ensureSettings(key, {
      name: BLOCKS_LIST.name(type),
      code: BLOCKS_LIST.code(type),
      properties: BLOCKS_LIST.properties,
    });
    const records = type.blocks.map((block) => {
      const values = BLOCKS_LIST.records[block.code];
      if (!values) problem(`Нет демо-значений для инфоблока «${block.name}» (${block.code})`);
      return { recordId: `block-${block.id}`, label: block.name, values: values ? values(r) : {} };
    });
    if (records.length) await ensureValues(key, settings, records);
  }

  // Записи каждого инфоблока
  for (const type of ctx.structure) {
    for (const block of type.blocks) {
      const spec = ELEMENT_LISTS[block.code];
      if (!spec) {
        problem(`Нет демо-свойств для инфоблока «${block.name}» (${block.code})`);
        continue;
      }
      const key = `infoblock-elements.${block.id}`;
      const settings = await ensureSettings(key, { ...spec, name: block.name });

      const elements = ctx.elementsByBlock.get(block.id);
      const idByCode = new Map(elements.map((element) => [element.code, `element-${element.id}`]));
      const records = elements.map((element) => {
        const values = spec.records[element.code];
        if (!values) problem(`Нет демо-значений для записи «${element.name}» инфоблока «${block.name}»`);
        const parentCode = spec.tree?.[element.code];
        const parentId = parentCode ? idByCode.get(parentCode) : undefined;
        if (parentCode && !parentId) problem(`Родитель «${parentCode}» в инфоблоке «${block.name}» не найден`);
        return { recordId: `element-${element.id}`, label: element.name, values: values ? values(r) : {}, parentId };
      });
      await ensureValues(key, settings, records);
    }
  }

  log(SECTION, `итого: настроек сохранено ${stats.settings}, записей со значениями обновлено ${stats.values}`);
  if (problems.length) log(SECTION, `проблемы:\n  - ${problems.join('\n  - ')}`);
  return { ...stats, problems: [...problems] };
}
