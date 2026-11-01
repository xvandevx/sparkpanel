/**
 * Свойства записей списка «Страницы» и их значения у всех страниц сайта.
 *
 * Настройки списка дописываются, а не перезаписываются: имя, код, дерево и
 * уже заведённые свойства (у пользователя есть своё «test») остаются как были,
 * в конец добавляются только недостающие по коду. Значения сливаются с тем, что
 * уже лежит у страницы: сохранённое раньше (в том числе руками) важнее сида,
 * поэтому повторный запуск ничего не меняет и не пишет лишних строк в журнал.
 *
 * Номера файлов и записей не зашиты: страницы ищутся по пути из кодов
 * (`services/electrics`), файлы — по имени, формы — по коду, записи
 * инфоблоков — по коду инфоблока и коду записи.
 */
import { get, put, log } from './lib.mjs';

const SECTION = 'properties-pages';
const LIST = 'pages';
const ORIGIN = new URL(process.env.SEED_API ?? 'http://localhost:3400/api').origin;

const MENU_OPTIONS = ['Шапка', 'Подвал', 'Боковое меню'];

/** Дописываемые свойства в порядке показа в шторке. */
const PROPERTIES = [
  { code: 'subtitle', name: 'Подзаголовок', type: 'string' },
  { code: 'menu_order', name: 'Порядок в меню', type: 'number' },
  { code: 'show_in', name: 'Показывать в', type: 'list', multiple: true, options: MENU_OPTIONS },
  {
    code: 'cover',
    name: 'Обложка',
    type: 'image',
    formats: ['jpg', 'png', 'webp'],
    maxSizeMb: 2,
    maxWidth: 1920,
    maxHeight: 1080,
  },
  { code: 'document', name: 'Документ', type: 'file', formats: ['pdf'], maxSizeMb: 10 },
  { code: 'related', name: 'Связанные материалы', type: 'content-link', multiple: true },
  { code: 'sidebar', name: 'Боковая колонка', type: 'html' },
  { code: 'specs', name: 'Таблица характеристик', type: 'table', rows: 4, columns: 2 },
];

/** Свойство в полном виде, как его ждёт `PUT /infoblocks/settings/:listKey`. */
const fullProperty = (property) => ({
  required: false,
  multiple: false,
  options: [],
  formats: [],
  maxSizeMb: null,
  maxWidth: null,
  maxHeight: null,
  rows: null,
  columns: null,
  ...property,
});

const side = (...parts) => parts.join('\n');

/**
 * Значения по страницам. Ключ — путь из кодов от корня без главной, главная — `/`.
 * Ссылки в `related`: `page:<путь>`, `el:<код инфоблока>/<код записи>`,
 * `form:<код формы>`. Файлы — по имени в медиатеке.
 */
const PAGES = {
  '/': {
    subtitle: 'Фаркопы с установкой за 2 часа — 7 сервисов в Москве и регионах',
    menu_order: 0,
    show_in: ['Шапка'],
    cover: 'banner-free-delivery-1920x500.png',
    document: 'prajs-list-ustanovka.pdf',
    related: ['page:catalog', 'page:services/towbar-installation', 'el:promotions/ustanovka-v-podarok', 'form:callback'],
    sidebar: side(
      '<h3>Подберём фаркоп за 5 минут</h3>',
      '<p>Укажите марку, модель и год выпуска — менеджер пришлёт подходящие варианты с ценой установки.</p>',
    ),
    specs: [
      ['Фаркопов в наличии', 'более 4 000'],
      ['Установочных центров', '7'],
      ['Установок с 2009 года', '40 000+'],
      ['Гарантия на монтаж', '2 года'],
    ],
  },

  news: {
    subtitle: 'Открытия сервисов, новые бренды и изменения в графике работы',
    menu_order: 70,
    show_in: ['Подвал'],
    cover: 'news-new-warehouse.png',
    related: ['page:blog', 'el:news/10-let-farkop-ru', 'el:news/oficialnyy-diler-westfalia'],
    sidebar: side(
      '<h3>Подписка на новости</h3>',
      '<p>Раз в месяц присылаем письмо с акциями и новинками — без спама, отписаться можно в один клик.</p>',
    ),
    specs: [
      ['Новостей за 2026 год', '14'],
      ['Периодичность', '2–3 в месяц'],
      ['Рассылка', 'раз в месяц'],
      ['Подписчиков', '6 300'],
    ],
  },
  'news/new-center-balashikha': {
    subtitle: 'Седьмой центр сети — с отдельным постом для коммерческого транспорта',
    menu_order: 10,
    show_in: ['Боковое меню'],
    cover: 'banner-installation-1600x900.png',
    related: ['page:contacts', 'page:catalog/commercial', 'el:install-points/moskva-varshavskoe-shosse', 'form:install-request'],
    sidebar: side(
      '<h3>Адрес нового центра</h3>',
      '<p>Балашиха, шоссе Энтузиастов, 7А. Ежедневно с 9:00 до 21:00, въезд для машин высотой до 3,2 м.</p>',
    ),
    specs: [
      ['Дата открытия', '15 сентября 2026'],
      ['Подъёмников', '4'],
      ['Пост для Газели и фургонов', 'есть'],
      ['Скидка в первый месяц', '20% на установку'],
    ],
  },
  'news/summer-sale-2026': {
    subtitle: 'Скидки до 20% на фаркопы Bosal и «Лидер Плюс» до конца августа',
    menu_order: 20,
    show_in: ['Боковое меню'],
    cover: 'banner-catalog-1200x400.png',
    related: ['page:catalog/towbars-cars', 'page:catalog/towbars-suv', 'el:promotions/skidka-na-velobagazhniki'],
    sidebar: side(
      '<h3>Акция завершена</h3>',
      '<p>Летняя распродажа закончилась 31 августа. Действующие предложения — в разделе «Акции».</p>',
    ),
    specs: [
      ['Срок акции', '1 июня — 31 августа 2026'],
      ['Скидка на фаркопы', 'до 20%'],
      ['Скидка на установку', '10%'],
      ['Продано по акции', '1 860 комплектов'],
    ],
  },
  'news/november-holidays-schedule': {
    subtitle: 'Как работают магазины и установочные центры с 1 по 4 ноября',
    menu_order: 30,
    show_in: ['Боковое меню'],
    related: ['page:contacts', 'el:news/grafik-raboty-v-noyabrskie-prazdniki', 'form:callback'],
    sidebar: side(
      '<h3>Заказы в праздники</h3>',
      '<p>Интернет-магазин принимает заказы круглосуточно, доставка возобновится 5 ноября.</p>',
    ),
    specs: [
      ['1–2 ноября', '10:00–18:00'],
      ['3 ноября', '10:00–16:00'],
      ['4 ноября', 'выходной'],
      ['С 5 ноября', 'обычный график'],
    ],
  },

  catalog: {
    subtitle: 'Фаркопы, электрика и аксессуары для 1 200 моделей автомобилей',
    menu_order: 10,
    show_in: ['Шапка', 'Подвал'],
    cover: 'banner-catalog-1200x400.png',
    related: ['el:sections/farkopy', 'el:sections/elektrika-dlya-farkopa', 'page:services/selection', 'form:towbar-selection'],
    sidebar: side(
      '<h3>Не нашли свою модель?</h3>',
      '<p>Подберём фаркоп по VIN-номеру — оставьте заявку, ответим в течение 15 минут.</p>',
    ),
    specs: [
      ['Позиций в каталоге', '6 400'],
      ['Брендов', '18'],
      ['Цена фаркопа', 'от 4 900 ₽'],
      ['Доставка по России', 'от 2 дней'],
    ],
  },
  'catalog/towbars-cars': {
    subtitle: 'Для седанов, хэтчбеков и универсалов — от 4 900 ₽',
    menu_order: 10,
    show_in: ['Шапка', 'Боковое меню'],
    cover: 'farkop-bosal-kia-rio.png',
    document: 'instrukciya-montazha-farkopa.pdf',
    related: ['el:products/bosal-4225-a-kia-rio', 'el:products/baltex-lada-vesta', 'el:newss/kak-vybrat-farkop', 'page:catalog/towbars-cars/removable'],
    sidebar: side(
      '<h3>Самые продаваемые</h3>',
      '<ul><li>Bosal 4225-A для Kia Rio и Solaris</li><li>Baltex для Lada Vesta</li><li>Лидер Плюс для Renault Logan</li></ul>',
    ),
    specs: [
      ['Моделей авто', '640'],
      ['Нагрузка на шар', '50–75 кг'],
      ['Масса прицепа', 'до 1 500 кг'],
      ['Цена', 'от 4 900 ₽'],
    ],
  },
  'catalog/towbars-cars/removable': {
    subtitle: 'Шар снимается за 10 секунд и не портит вид автомобиля',
    menu_order: 10,
    show_in: ['Боковое меню'],
    cover: 'farkop-westfalia-vw-tiguan.png',
    document: 'sertifikat-tr-ts-bosal.pdf',
    related: ['el:products/westfalia-321685600001-tiguan', 'el:video/obzor-westfalia-vertikalnyy', 'page:catalog/towbars-cars/flanged'],
    sidebar: side(
      '<h3>Чем съёмный лучше</h3>',
      '<p>Без шара номер читается камерами, а парктроник не срабатывает на крюк. Шар хранится в багажнике в чехле.</p>',
    ),
    specs: [
      ['Тип крепления', 'быстросъёмный, ключ'],
      ['Время снятия', '10 секунд'],
      ['Масса прицепа', 'до 2 000 кг'],
      ['Цена', 'от 9 800 ₽'],
    ],
  },
  'catalog/towbars-cars/flanged': {
    subtitle: 'Сменные шары под прицеп, велобагажник и тягово-сцепное устройство',
    menu_order: 20,
    show_in: ['Боковое меню'],
    cover: 'farkop-baltex-flanec-outlander.png',
    document: 'sertifikat-tr-ts-westfalia.pdf',
    related: ['el:products/aragon-e4421ba-x-trail', 'el:sections/krepezh-i-zapchasti', 'page:catalog/towbars-cars/removable'],
    sidebar: side(
      '<h3>Для тех, кто часто возит прицеп</h3>',
      '<p>Фланец выдерживает большую вертикальную нагрузку и позволяет поставить шар со смещением по высоте.</p>',
    ),
    specs: [
      ['Тип крепления', 'фланец, 2 болта'],
      ['Вертикальная нагрузка', 'до 100 кг'],
      ['Масса прицепа', 'до 2 500 кг'],
      ['Цена', 'от 7 400 ₽'],
    ],
  },
  'catalog/towbars-suv': {
    subtitle: 'Усиленные фаркопы для рамных внедорожников и кроссоверов',
    menu_order: 20,
    show_in: ['Шапка', 'Боковое меню'],
    cover: 'farkop-leader-plus-renault-duster.png',
    document: 'deklaraciya-sootvetstviya-avtos.pdf',
    related: ['el:products/leader-plus-t114-a-rav4', 'el:products/brink-645900-kodiaq', 'el:car-models/toyota-rav4-xa50', 'page:services/towbar-installation'],
    sidebar: side(
      '<h3>Тянем лодку и дом на колёсах</h3>',
      '<p>Для прицепов тяжелее 2 тонн советуем фланцевый фаркоп и 13-контактную розетку с постоянным плюсом.</p>',
    ),
    specs: [
      ['Моделей авто', '410'],
      ['Масса прицепа', 'до 3 500 кг'],
      ['Класс сцепки', 'A50-X, F'],
      ['Цена', 'от 8 900 ₽'],
    ],
  },
  'catalog/accessories': {
    subtitle: 'Велобагажники, кронштейны номера, чехлы и замки для шара',
    menu_order: 30,
    show_in: ['Шапка', 'Боковое меню'],
    cover: 'kronshtein-nomera.png',
    related: ['el:products/thule-easyfold-xt-2', 'el:sections/velobagazhniki', 'el:newss/velobagazhnik-na-farkop-plyusy-i-minusy'],
    sidebar: side(
      '<h3>Велобагажник с выгодой</h3>',
      '<p>До конца сезона — минус 10% на крепления для велосипедов на фаркоп.</p>',
    ),
    specs: [
      ['Позиций', '920'],
      ['Брендов', 'Thule, Menabo, Westfalia'],
      ['Цена', 'от 390 ₽'],
      ['Самовывоз', 'в день заказа'],
    ],
  },
  'catalog/electrics': {
    subtitle: 'Универсальные и штатные комплекты, блоки Smart Connect',
    menu_order: 40,
    show_in: ['Боковое меню'],
    cover: 'blok-soglasovaniya-smart-connect.png',
    document: 'otkaznoe-pismo-elektrika.pdf',
    related: ['el:products/smart-connect-7pin-sportage', 'el:sections/rozetki-i-perehodniki', 'el:newss/smart-connect-ili-shtatnaya-elektrika', 'page:services/electrics'],
    sidebar: side(
      '<h3>Какую электрику выбрать</h3>',
      '<p>На машины с CAN-шиной ставим только блок согласования — штатная проводка остаётся нетронутой.</p>',
    ),
    specs: [
      ['Комплектов', '380'],
      ['Розетки', '7 и 13 контактов'],
      ['Блоки согласования', 'Smart Connect, Bosal'],
      ['Цена', 'от 1 200 ₽'],
    ],
  },
  'catalog/commercial': {
    subtitle: 'Фаркопы для Газели, Ford Transit и Volkswagen Crafter',
    menu_order: 50,
    show_in: ['Боковое меню'],
    cover: 'rozetka-13pin.png',
    related: ['page:news/new-center-balashikha', 'el:promotions/skidka-dlya-avtoparkov', 'form:wholesale'],
    sidebar: side(
      '<h3>Раздел готовится</h3>',
      '<p>Каталог для коммерческого транспорта откроется вместе с постом в Балашихе. Пока заказы принимаем по телефону.</p>',
    ),
    specs: [
      ['Моделей', '35'],
      ['Масса прицепа', 'до 3 500 кг'],
      ['Скидка автопаркам', '15%'],
      ['Запуск раздела', 'ноябрь 2026'],
    ],
  },

  about: {
    subtitle: 'С 2009 года ставим фаркопы и знаем про них всё',
    menu_order: 50,
    show_in: ['Шапка', 'Подвал'],
    cover: 'news-kazan-service.png',
    document: 'sertifikat-iso-9001.pdf',
    related: ['page:about/history', 'page:about/team', 'el:certificates/iso-9001-2015', 'el:video/ekskursiya-po-centru-varshavskoe'],
    sidebar: side(
      '<h3>Фаркоп.ру в цифрах</h3>',
      '<p>17 лет работы, 7 установочных центров, 48 сотрудников и более 40 000 довольных клиентов.</p>',
    ),
    specs: [
      ['Год основания', '2009'],
      ['Сотрудников', '48'],
      ['Городов', '5'],
      ['Средняя оценка', '4,9 из 5'],
    ],
  },
  'about/history': {
    subtitle: 'От одного бокса на Варшавском шоссе до сети сервисов',
    menu_order: 10,
    show_in: ['Боковое меню'],
    cover: 'Сертификат дилера Thule.png',
    related: ['el:news/10-let-farkop-ru', 'el:news/oficialnyy-diler-westfalia', 'page:about/team'],
    sidebar: side(
      '<h3>Главные даты</h3>',
      '<ul><li>2009 — первый бокс</li><li>2013 — интернет-магазин</li><li>2021 — сертификат Westfalia</li><li>2026 — центр в Балашихе</li></ul>',
    ),
    specs: [
      ['2009', 'первый бокс, два мастера'],
      ['2013', 'запуск интернет-магазина'],
      ['2017', 'центр в Мытищах'],
      ['2024', '40 000-я установка'],
    ],
  },
  'about/team': {
    subtitle: 'Мастера, электрики и менеджеры, которые отвечают за результат',
    menu_order: 20,
    show_in: ['Боковое меню'],
    cover: 'banner-installation-1600x900.png',
    related: ['el:employees/andrey-sokolov', 'el:employees/marina-belova', 'el:employees/dmitriy-kuznecov', 'page:about/vacancies'],
    sidebar: side(
      '<h3>Хотите к нам?</h3>',
      '<p>Ищем мастеров-установщиков и автоэлектриков в Москву и Химки. Обучение за счёт компании.</p>',
    ),
    specs: [
      ['Мастеров-установщиков', '21'],
      ['Автоэлектриков', '9'],
      ['Средний стаж', '7 лет'],
      ['Сертифицированы Westfalia', '12 человек'],
    ],
  },
  'about/vacancies': {
    subtitle: 'Официальное оформление, обучение и зарплата выше рынка',
    menu_order: 30,
    show_in: ['Подвал', 'Боковое меню'],
    cover: 'news-kazan-service.png',
    related: ['el:vacancies/master-ustanovshchik-moskva', 'el:vacancies/avtoelektrik-himki', 'el:vacancies/menedzher-po-prodazham', 'form:feedback'],
    sidebar: side(
      '<h3>Отдел кадров</h3>',
      '<p>Резюме присылайте на hr@farkop.ru или звоните Ольге Никитиной: пн–пт с 10:00 до 18:00.</p>',
    ),
    specs: [
      ['Открытых вакансий', '6'],
      ['Зарплата мастера', 'от 110 000 ₽'],
      ['График', '2/2 или 5/2'],
      ['Испытательный срок', '1 месяц'],
    ],
  },
  'about/vacancies/installer': {
    subtitle: 'Центр в Мытищах · от 110 000 ₽ · график 2/2',
    menu_order: 10,
    show_in: ['Боковое меню'],
    cover: 'banner-installation-1600x900.png',
    related: ['el:vacancies/master-ustanovshchik-moskva', 'page:about/team', 'form:feedback'],
    sidebar: side(
      '<h3>Как откликнуться</h3>',
      '<p>Приезжайте на собеседование с 10:00 до 17:00 или пришлите резюме — перезвоним в течение дня.</p>',
    ),
    specs: [
      ['Зарплата', 'от 110 000 ₽'],
      ['Опыт', 'от 1 года'],
      ['График', '2/2, 9:00–21:00'],
      ['Где', 'Мытищи, Олимпийский пр-т, 29'],
    ],
  },
  'about/vacancies/sales-manager': {
    subtitle: 'Консультации покупателей в магазине и по телефону',
    menu_order: 20,
    show_in: ['Боковое меню'],
    cover: 'banner-kia-sportage-980x300.png',
    related: ['el:vacancies/menedzher-po-prodazham', 'page:about/vacancies', 'form:feedback'],
    sidebar: side(
      '<h3>Что мы ценим</h3>',
      '<p>Умение объяснить разницу между фланцевым и съёмным фаркопом так, чтобы клиент понял с первого раза.</p>',
    ),
    specs: [
      ['Зарплата', '70 000–120 000 ₽'],
      ['Опыт', 'продажи автотоваров'],
      ['График', '5/2, 10:00–19:00'],
      ['Где', 'Москва, Варшавское ш., 118'],
    ],
  },
  'about/requisites': {
    subtitle: 'ООО «Фаркоп.ру» — реквизиты для договоров и счетов',
    menu_order: 40,
    show_in: ['Подвал'],
    document: 'dogovor-oferta.pdf',
    related: ['page:privacy', 'page:delivery', 'form:wholesale'],
    sidebar: side(
      '<h3>Бухгалтерия</h3>',
      '<p>Закрывающие документы отправляем через ЭДО «Диадок» в течение 3 рабочих дней после оплаты.</p>',
    ),
    specs: [
      ['ИНН', '7726543210'],
      ['КПП', '772601001'],
      ['ОГРН', '1097746123456'],
      ['Банк', 'АО «Т-Банк», БИК 044525974'],
    ],
  },

  services: {
    subtitle: 'Установка, подключение электрики и подбор фаркопа в одном месте',
    menu_order: 20,
    show_in: ['Шапка', 'Подвал'],
    cover: 'banner-installation-1600x900.png',
    document: 'prajs-list-ustanovka.pdf',
    related: ['page:services/towbar-installation', 'page:services/electrics', 'el:faq/skolko-vremeni-zanimaet-ustanovka', 'form:install-request'],
    sidebar: side(
      '<h3>Запись на сегодня</h3>',
      '<p>Свободные окна есть на Варшавском шоссе и в Химках. Приезжайте к назначенному времени — ждать не придётся.</p>',
    ),
    specs: [
      ['Установка фаркопа', 'от 3 500 ₽'],
      ['Подключение электрики', 'от 2 500 ₽'],
      ['Время работы', '1,5–3 часа'],
      ['Гарантия', '2 года'],
    ],
  },
  'services/towbar-installation': {
    subtitle: 'Без сверления кузова, с антикоррозийной обработкой креплений',
    menu_order: 10,
    show_in: ['Шапка', 'Боковое меню'],
    cover: 'farkop-bosal-kia-rio.png',
    document: 'instrukciya-montazha-farkopa.pdf',
    related: ['el:video/ustanovka-farkopa-kia-rio', 'el:faq/mozhno-li-ustanovit-samomu', 'el:newss/farkop-i-garantiya-dilera', 'form:install-request'],
    sidebar: side(
      '<h3>Сохраним гарантию дилера</h3>',
      '<p>Ставим фаркоп в штатные точки крепления и выдаём заказ-наряд с печатью — дилер не откажет в гарантии.</p>',
    ),
    specs: [
      ['Седан, хэтчбек, универсал', 'от 3 500 ₽'],
      ['Кроссовер', 'от 4 500 ₽'],
      ['Рамный внедорожник', 'от 5 500 ₽'],
      ['Время работы', 'от 1,5 часа'],
    ],
  },
  'services/electrics': {
    subtitle: 'Розетка 7 или 13 контактов, блок согласования, проверка ламп',
    menu_order: 20,
    show_in: ['Боковое меню'],
    cover: 'blok-soglasovaniya-smart-connect.png',
    document: 'otkaznoe-pismo-elektrika.pdf',
    related: ['page:catalog/electrics', 'el:video/kak-podklyuchaetsya-smart-connect', 'el:faq/chto-takoe-smart-connect'],
    sidebar: side(
      '<h3>Почему блок согласования</h3>',
      '<p>Современные машины следят за нагрузкой на проводку. Блок развязывает цепи прицепа и бортовой сети — ошибок на панели не будет.</p>',
    ),
    specs: [
      ['Универсальная электрика', 'от 2 500 ₽'],
      ['Штатная электрика', 'от 4 900 ₽'],
      ['Активация в блоке', 'от 1 500 ₽'],
      ['Гарантия', '2 года'],
    ],
  },
  'services/selection': {
    subtitle: 'Подберём фаркоп по VIN-номеру за 15 минут — бесплатно',
    menu_order: 30,
    show_in: ['Боковое меню'],
    cover: 'banner-kia-sportage-980x300.png',
    related: ['form:towbar-selection', 'el:newss/kak-vybrat-farkop', 'page:catalog'],
    sidebar: side(
      '<h3>Что понадобится</h3>',
      '<p>Марка, модель, год выпуска и тип кузова. Если сомневаетесь — пришлите фото задней части машины.</p>',
    ),
    specs: [
      ['Стоимость подбора', 'бесплатно'],
      ['Срок ответа', 'до 15 минут'],
      ['Каналы', 'телефон, WhatsApp, сайт'],
      ['Моделей в базе', '1 200'],
    ],
  },
  'services/warranty': {
    subtitle: '5 лет на фаркоп и 2 года на установку и электрику',
    menu_order: 40,
    show_in: ['Подвал', 'Боковое меню'],
    cover: 'Сертификат дилера Thule.png',
    document: 'garantijnyj-talon.pdf',
    related: ['form:warranty', 'el:faq/kakaya-garantiya-na-ustanovku', 'el:certificates/diler-westfalia-2026'],
    sidebar: side(
      '<h3>Гарантийный случай</h3>',
      '<p>Сохраните заказ-наряд и гарантийный талон. Приезжайте в любой наш центр — проверим и устраним бесплатно.</p>',
    ),
    specs: [
      ['На фаркоп', '5 лет'],
      ['На установку', '2 года'],
      ['На электрику', '2 года'],
      ['Срок рассмотрения', 'до 10 дней'],
    ],
  },

  delivery: {
    subtitle: 'Курьером по Москве, СДЭК и «Деловыми линиями» по всей России',
    menu_order: 30,
    show_in: ['Шапка', 'Подвал'],
    cover: 'banner-free-delivery-1920x500.png',
    document: 'dogovor-oferta.pdf',
    related: ['el:faq/dostavka-v-regiony', 'el:faq/oplata-pri-poluchenii', 'el:news/oplata-po-sbp-i-rassrochka'],
    sidebar: side(
      '<h3>Бесплатная доставка</h3>',
      '<p>По Москве в пределах МКАД — при заказе от 15 000 ₽, до пунктов СДЭК — от 25 000 ₽.</p>',
    ),
    specs: [
      ['Курьер по Москве', '390 ₽, 1–2 дня'],
      ['СДЭК до пункта выдачи', 'от 450 ₽, 2–7 дней'],
      ['Деловые линии', 'по тарифу, 3–10 дней'],
      ['Самовывоз', 'бесплатно, в день заказа'],
    ],
  },
  contacts: {
    subtitle: 'Звоните, пишите или приезжайте в ближайший центр',
    menu_order: 60,
    show_in: ['Шапка', 'Подвал'],
    cover: 'news-new-warehouse.png',
    related: ['el:install-points/moskva-varshavskoe-shosse', 'el:install-points/himki-leningradskoe-shosse', 'el:install-points/spb-sofiyskaya', 'form:callback'],
    sidebar: side(
      '<h3>Перезвоним за 5 минут</h3>',
      '<p>Оставьте номер — менеджер ответит на вопросы о подборе, сроках и стоимости установки.</p>',
    ),
    specs: [
      ['Телефон', '8 800 555-34-12'],
      ['E-mail', 'info@farkop.ru'],
      ['Офис', 'Москва, Варшавское ш., 118, корп. 1'],
      ['Режим работы', 'ежедневно 9:00–21:00'],
    ],
  },
  reviews: {
    subtitle: '1 284 отзыва на Яндекс Картах — средняя оценка 4,9',
    menu_order: 40,
    show_in: ['Подвал'],
    cover: 'farkop-westfalia-vw-tiguan.png',
    related: ['el:reviews/otzyv-aleksey-tiguan', 'el:reviews/otzyv-natalya-creta', 'el:reviews/otzyv-svetlana-rav4', 'form:review'],
    sidebar: side(
      '<h3>Оставьте отзыв</h3>',
      '<p>Расскажите, как прошла установка, — за отзыв с фото дарим скидку 500 ₽ на следующую покупку.</p>',
    ),
    specs: [
      ['Яндекс Карты', '4,9 · 1 284 отзыва'],
      ['2ГИС', '4,8 · 612 отзывов'],
      ['Отзывов на сайте', '347'],
      ['Ответ на отзыв', 'в течение дня'],
    ],
  },
  blog: {
    subtitle: 'Разбираемся в фаркопах, прицепах и правилах буксировки',
    menu_order: 80,
    show_in: ['Подвал', 'Боковое меню'],
    cover: 'news-trailer-tips.png',
    related: ['el:newss/kak-vybrat-farkop', 'el:newss/nuzhno-li-registrirovat-farkop', 'page:blog/trailer-license'],
    sidebar: side(
      '<h3>Популярное</h3>',
      '<ul><li>Нужно ли регистрировать фаркоп в ГИБДД</li><li>Какой прицеп можно с правами B</li><li>Уход за фаркопом зимой</li></ul>',
    ),
    specs: [
      ['Статей', '42'],
      ['Новые статьи', 'каждый вторник'],
      ['Авторы', 'мастера и юрист компании'],
      ['Видеообзоров', '18'],
    ],
  },
  'blog/trailer-license': {
    subtitle: 'Категории B, BE и C1E: что можно буксировать и какие штрафы грозят',
    menu_order: 10,
    show_in: ['Боковое меню'],
    cover: 'news-trailer-tips.png',
    related: ['el:newss/kakoy-pricep-mozhno-buksirovat-na-kategorii-b', 'el:video/test-pricep-lada-vesta', 'el:sections/pricepy'],
    sidebar: side(
      '<h3>Коротко</h3>',
      '<p>С категорией B можно везти прицеп до 750 кг, а если масса автопоезда не больше 3,5 т — и тяжелее.</p>',
    ),
    specs: [
      ['B', 'прицеп до 750 кг'],
      ['B (автопоезд до 3,5 т)', 'прицеп тяжелее 750 кг'],
      ['BE', 'прицеп до 3,5 т'],
      ['Штраф без категории', '5 000–15 000 ₽'],
    ],
  },
  'blog/winter-towbar-care': {
    subtitle: 'Как уберечь шар и розетку от реагентов и коррозии',
    menu_order: 20,
    show_in: ['Боковое меню'],
    cover: 'farkop-avtos-lada-vesta.png',
    related: ['el:newss/uhod-za-farkopom-zimoy', 'el:promotions/zimnyaya-zashchita', 'page:catalog/accessories'],
    sidebar: side(
      '<h3>Бесплатная обработка</h3>',
      '<p>До 31 декабря обрабатываем шар и контакты розетки антикоррозийным составом бесплатно — при любой покупке.</p>',
    ),
    specs: [
      ['Мыть шар', 'раз в 2 недели'],
      ['Смазка шара', 'литиевая, раз в месяц'],
      ['Контакты розетки', 'силиконовый спрей'],
      ['Чехол на шар', 'от 290 ₽'],
    ],
  },
  privacy: {
    subtitle: 'Как мы собираем, храним и защищаем персональные данные',
    menu_order: 90,
    show_in: ['Подвал'],
    document: 'dogovor-oferta.pdf',
    related: ['page:about/requisites', 'form:feedback'],
    sidebar: side(
      '<h3>Вопросы о данных</h3>',
      '<p>Запросы на удаление или выгрузку персональных данных принимаем по адресу privacy@farkop.ru.</p>',
    ),
    specs: [
      ['Оператор', 'ООО «Фаркоп.ру»'],
      ['Редакция', 'от 1 марта 2026'],
      ['Срок хранения', '3 года'],
      ['Ответ на запрос', 'до 10 рабочих дней'],
    ],
  },
  promo: {
    subtitle: 'Скидки на фаркопы, установку и аксессуары — обновляем каждый месяц',
    menu_order: 15,
    show_in: ['Шапка'],
    cover: 'news-autumn-sale.png',
    related: ['el:promotions/ustanovka-v-podarok', 'el:promotions/privedi-druga', 'el:promotions/skidka-dlya-avtoparkov'],
    sidebar: side(
      '<h3>Скидки не суммируются</h3>',
      '<p>В заказе действует одна акция — та, что выгоднее для вас. Менеджер пересчитает при оформлении.</p>',
    ),
    specs: [
      ['Действующих акций', '5'],
      ['Максимальная скидка', '25%'],
      ['Установка в подарок', 'при покупке с электрикой'],
      ['Скидка автопаркам', '15%'],
    ],
  },
};

/** Значения для страницы, которой нет в `PAGES`: появилась позже — без пустой вкладки. */
function fallbackFor(page, path) {
  const parentPath = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : null;
  return {
    subtitle: `${page.name} — Фаркоп.ру`,
    menu_order: Math.round((page.position ?? 0) / 10),
    show_in: ['Боковое меню'],
    related: [parentPath ? `page:${parentPath}` : 'page:/', 'form:callback'],
    sidebar: side(
      `<h3>${page.name}</h3>`,
      '<p>Есть вопросы? Позвоните нам — подскажем и запишем на установку.</p>',
    ),
  };
}

export default async function seed() {
  let created = 0;
  const problems = [];

  // --- 1. Настройки списка: дописать недостающие свойства, не трогая имеющиеся
  const settings = await get(`/infoblocks/settings/${LIST}`);
  const known = new Set(settings.properties.map((property) => property.code));
  const missing = PROPERTIES.filter((property) => !known.has(property.code));

  let properties = settings.properties;
  if (missing.length) {
    const saved = await put(`/infoblocks/settings/${LIST}`, {
      name: settings.name ?? 'Страницы сайта',
      code: settings.code ?? 'pages',
      isTree: settings.isTree,
      properties: [...settings.properties, ...missing.map(fullProperty)],
    });
    properties = saved.properties;
    created += missing.length;
    log(SECTION, `свойства: добавлено ${missing.length} (${missing.map((p) => p.code).join(', ')})`);
  } else {
    log(SECTION, `свойства: все ${PROPERTIES.length} уже есть`);
  }
  const propertyByCode = new Map(properties.map((property) => [property.code, property]));

  // --- 2. Справочники: страницы, файлы, цели привязки
  const [pages, files, targets, sections, current] = await Promise.all([
    get('/pages'),
    get('/files'),
    get('/infoblocks/settings/link-targets'),
    get('/infoblocks'),
    get(`/infoblocks/settings/${LIST}/values`),
  ]);

  const paths = pagePaths(pages);
  const pageByPath = new Map(pages.map((page) => [paths.get(page.id), page]));
  const fileByName = new Map(files.map((file) => [file.name, file]));
  const blockListKey = new Map(
    sections.flatMap((section) => section.blocks.map((block) => [block.code, `infoblock-elements.${block.id}`])),
  );
  const targetByKey = new Map(targets.map((target) => [`${target.listKey}|${target.code}`, target]));
  const valuesByRecord = new Map(current.map((row) => [row.recordId, row]));

  const dimensions = new Map();
  const fileFits = async (property, file) => {
    if (!file || fileRuleError(property, file)) return false;
    if (property.type !== 'image' || (!property.maxWidth && !property.maxHeight)) return true;
    if (!dimensions.has(file.id)) dimensions.set(file.id, await imageSize(file));
    const size = dimensions.get(file.id);
    if (!size) return false;
    return (!property.maxWidth || size.width <= property.maxWidth) && (!property.maxHeight || size.height <= property.maxHeight);
  };

  const resolveLink = (ref) => {
    const [kind, rest] = [ref.slice(0, ref.indexOf(':')), ref.slice(ref.indexOf(':') + 1)];
    if (kind === 'page') {
      const page = pageByPath.get(rest === '/' ? '' : rest);
      return page ? { listKey: 'pages', recordId: String(page.id) } : null;
    }
    const listKey = kind === 'form' ? 'forms' : kind === 'el' ? blockListKey.get(rest.split('/')[0]) : null;
    const code = kind === 'el' ? rest.split('/')[1] : rest;
    const target = listKey ? targetByKey.get(`${listKey}|${code}`) : null;
    return target ? { listKey: target.listKey, recordId: target.recordId } : null;
  };

  /** Значения страницы под фактические настройки свойств; неразрешённое пропускается. */
  async function buildValues(spec, pageLabel) {
    const values = {};
    const miss = (what) => problems.push(`${pageLabel}: не найдено ${what}`);

    for (const [code, raw] of Object.entries(spec)) {
      const property = propertyByCode.get(code);
      if (!property || raw === undefined || raw === null) continue;

      let value;
      switch (property.type) {
        case 'image':
        case 'file': {
          const ids = [];
          for (const name of [raw].flat()) {
            const file = fileByName.get(name);
            if (await fileFits(property, file)) ids.push(file.id);
            else miss(`подходящий файл «${name}» для «${property.name}»`);
          }
          value = ids;
          break;
        }
        case 'content-link':
          value = [raw].flat().map((ref) => resolveLink(ref) ?? (miss(`запись для привязки ${ref}`), null)).filter(Boolean);
          break;
        case 'list':
          value = [raw].flat().filter((option) => property.options.includes(option));
          break;
        case 'table':
          value = Array.from({ length: property.rows }, (_, row) =>
            Array.from({ length: property.columns }, (_, column) => String(raw[row]?.[column] ?? '').trim()),
          );
          break;
        case 'string':
          value = String(raw).trim();
          break;
        default:
          value = raw;
      }

      // Множественность — по настройкам: одиночному свойству одно значение
      if (Array.isArray(value) && property.type !== 'table') {
        if (value.length === 0) continue;
        value = property.multiple ? value : value[0];
      }
      if (value === '') continue;
      values[code] = value;
    }
    return values;
  }

  // --- 3. Значения у каждой страницы: сид дополняет, сохранённое не перетирает
  let filled = 0;
  let untouched = 0;
  for (const page of pages) {
    const path = paths.get(page.id);
    const key = path === '' ? '/' : path;
    const spec = PAGES[key] ?? fallbackFor(page, path);
    const recordId = String(page.id);
    const existing = valuesByRecord.get(recordId);
    const before = existing?.values ?? {};

    const seedValues = await buildValues(spec, `страница «${page.name}» (${key})`);
    const next = { ...seedValues, ...before };
    if (stableJson(next) === stableJson(before)) {
      untouched += 1;
      continue;
    }

    await put(`/infoblocks/settings/${LIST}/values/${recordId}`, {
      values: next,
      parentId: existing?.parentId ?? null,
    });
    created += 1;
    filled += 1;
    const added = Object.keys(next).filter((code) => !(code in before));
    log(SECTION, `«${page.name}» (${key}): добавлено ${added.length} значений`);
  }

  log(SECTION, `значения: заполнено страниц ${filled}, без изменений ${untouched}, всего ${pages.length}`);
  for (const problem of problems) log(SECTION, `! ${problem}`);
  log(SECTION, `создано за запуск: ${created}`);
  return { created, problems };
}

/** Путь страницы из кодов от корня; главная (и всё, что выше неё) в путь не входит. */
function pagePaths(pages) {
  const byId = new Map(pages.map((page) => [page.id, page]));
  const paths = new Map();
  const pathOf = (page, depth = 0) => {
    if (paths.has(page.id)) return paths.get(page.id);
    if (page.isHome || depth > 50) return '';
    const parent = page.parentId ? byId.get(page.parentId) : null;
    const prefix = parent ? pathOf(parent, depth + 1) : '';
    const path = prefix ? `${prefix}/${page.code}` : page.code;
    paths.set(page.id, path);
    return path;
  };
  for (const page of pages) paths.set(page.id, pathOf(page));
  return paths;
}

/** Та же проверка файла, что делает сервер: изображение ли, формат, вес. */
function fileRuleError(property, file) {
  if (property.type === 'image' && !file.mimeType.startsWith('image/')) return 'не изображение';
  const alias = { jpeg: 'jpg', tif: 'tiff' };
  const canon = (format) => alias[format] ?? format;
  const ext = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase() : '';
  if (property.formats?.length && !property.formats.map(canon).includes(canon(ext))) return 'формат';
  if (property.maxSizeMb != null && file.size > property.maxSizeMb * 1024 * 1024) return 'вес';
  return null;
}

/**
 * Разрешение картинки из заголовка файла: сервер его не проверяет, а шторка —
 * да, поэтому слишком большие картинки в свойство не ставим.
 */
async function imageSize(file) {
  try {
    const response = await fetch(`${ORIGIN}${encodeURI(file.url)}`);
    if (!response.ok) return null;
    const b = Buffer.from(await response.arrayBuffer());
    // PNG
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) {
      return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
    }
    // GIF
    if (b.length > 10 && b.toString('ascii', 0, 3) === 'GIF') {
      return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
    }
    // WebP
    if (b.length > 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = b.toString('ascii', 12, 16);
      if (chunk === 'VP8X') return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
      if (chunk === 'VP8L') {
        const bits = b.readUInt32LE(21);
        return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
      }
      if (chunk === 'VP8 ') return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    }
    // JPEG: ищем маркер SOF
    if (b.length > 4 && b[0] === 0xff && b[1] === 0xd8) {
      let offset = 2;
      while (offset + 9 < b.length) {
        if (b[offset] !== 0xff) return null;
        const marker = b[offset + 1];
        const length = b.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
          return { width: b.readUInt16BE(offset + 7), height: b.readUInt16BE(offset + 5) };
        }
        offset += 2 + length;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/** JSON с отсортированными ключами — чтобы сравнивать значения без учёта порядка полей. */
function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
