/**
 * Свойства записей у трёх списков панели: веб-формы (`forms`, свойства только
 * у форм — не у их полей), пользователи (`users`) и домены (`domains`). Для
 * каждого списка — настройки (имя, код, 5–6 свойств разных типов) и значения
 * у каждой записи.
 *
 * Идемпотентность:
 *  - настройки: уже заведённые свойства не трогаются, недостающие дописываются
 *    в конец; имя, код и «дерево» остаются, как были, если их уже задали;
 *  - значения: сливаются с теми, что уже есть (существующие побеждают), и
 *    запрос уходит, только если что-то действительно добавилось — иначе каждый
 *    повторный запуск писал бы пустую строку в журнал записи;
 *  - аватары сотрудников (SVG с инициалами) кладутся в раздел медиатеки
 *    «Сотрудники» и ищутся там по имени файла.
 *
 * Номера записей не зашиты: формы ищутся по коду, пользователи — по email,
 * домены — по имени хоста, страницы — по цепочке кодов, файлы — по имени.
 */
import { get, log, post, put, upload } from './lib.mjs';

const SECTION = 'properties-panel';

/* ------------------------------------------------------------ помощники -- */

/** Свойство в том виде, в каком его ждёт `PUT /infoblocks/settings/:listKey`. */
function property(code, name, type, extra = {}) {
  return {
    code,
    name,
    type,
    required: false,
    multiple: false,
    options: [],
    formats: [],
    maxSizeMb: null,
    maxWidth: null,
    maxHeight: null,
    rows: null,
    columns: null,
    ...extra,
  };
}

/** Сравнение значений без учёта порядка ключей объекта. */
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stable(value[key])]),
    );
  }
  return value;
}
const same = (a, b) => JSON.stringify(stable(a)) === JSON.stringify(stable(b));

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/** Убирает пустые значения: сервер их всё равно не хранит, а сравнение было бы ложным. */
const compact = (values) =>
  Object.fromEntries(Object.entries(values).filter(([, value]) => !isEmptyValue(value)));

/**
 * Настройки списка: существующие свойства — как есть, недостающие — в конец.
 * Имя и код — уже заданные, иначе наши. `isTree` не передаётся: сервер оставит,
 * как было. Возвращает итоговые настройки и признак, что что-то записали.
 */
async function ensureSettings(listKey, { name, code, properties }, problems) {
  const current = await get(`/infoblocks/settings/${listKey}`);
  const existing = current.properties ?? [];
  const known = new Set(existing.map((item) => item.code));
  const missing = properties.filter((item) => !known.has(item.code));
  const needsHeader = !current.name || !current.code;

  if (missing.length === 0 && !needsHeader) {
    log(SECTION, `${listKey}: настройки уже есть («${current.name}», ${existing.length} свойств)`);
    return { settings: current, changed: 0 };
  }

  const body = {
    name: current.name || name,
    code: current.code || code,
    properties: [...existing, ...missing],
  };

  // Код списка уникален у пользователя: если наш занят другим списком — пробуем с суффиксом
  const candidates = current.code ? [body.code] : [code, `${code}-list`, `${code}-panel`];
  for (const candidate of candidates) {
    try {
      const saved = await put(`/infoblocks/settings/${listKey}`, { ...body, code: candidate });
      if (candidate !== code && !current.code) {
        problems.push(`${listKey}: код «${code}» занят, список сохранён с кодом «${candidate}»`);
      }
      log(
        SECTION,
        `${listKey}: настройки сохранены («${saved.name}», код ${saved.code}), добавлено свойств: ${missing.length}`,
      );
      return { settings: saved, changed: 1 };
    } catch (error) {
      if (error.status !== 409) throw error;
    }
  }
  throw new Error(`${listKey}: не удалось подобрать свободный код списка`);
}

/**
 * Значения записей списка: наше дописывается к тому, что уже есть, существующее
 * не перетирается. Родитель записи остаётся прежним.
 */
async function fillValues(listKey, records, problems) {
  const rows = await get(`/infoblocks/settings/${listKey}/values`);
  const byRecord = new Map(rows.map((row) => [row.recordId, row]));
  let written = 0;

  for (const { recordId, label, values } of records) {
    const row = byRecord.get(recordId);
    const before = row?.values ?? {};
    const merged = { ...compact(values), ...before };

    if (same(merged, before)) continue;

    const body = { values: merged };
    if (row?.parentId) body.parentId = row.parentId;

    try {
      await put(`/infoblocks/settings/${listKey}/values/${recordId}`, body);
      written += 1;
      log(SECTION, `${listKey}/${recordId}: значения записаны (${label})`);
    } catch (error) {
      problems.push(`${listKey}/${recordId} (${label}): ${error.message}`);
    }
  }

  log(SECTION, `${listKey}: записей ${records.length}, значения записаны у ${written}`);
  return written;
}

/* ----------------------------------------------------------- справочники -- */

/** Страница по цепочке кодов от главной: [] — главная, ['services', 'warranty'] — вложенная. */
function pageResolver(pages) {
  const home = pages.find((page) => page.parentId === null || page.parentId === undefined);
  return (path) => {
    let node = home;
    for (const code of path) {
      node = pages.find((page) => page.parentId === node?.id && page.code === code);
      if (!node) return null;
    }
    return node ?? null;
  };
}

/** Привязка к странице, если такая страница есть среди того, что можно привязать. */
function pageLinker(resolvePage, targets, problems) {
  const known = new Set(targets.map((target) => `${target.listKey}/${target.recordId}`));
  return (path, context) => {
    const page = resolvePage(path);
    const link = page ? { listKey: 'pages', recordId: String(page.id) } : null;
    if (!link || !known.has(`${link.listKey}/${link.recordId}`)) {
      problems.push(`${context}: страница /${path.join('/')} не найдена — привязка пропущена`);
      return undefined;
    }
    return link;
  };
}

/* ----------------------------------------------------------- веб-формы -- */

const FORM_ROUTES = [
  'Отдел продаж',
  'Установочный центр',
  'Сервисная служба',
  'Оптовый отдел',
  'Маркетинг',
];

const FORMS_SETTINGS = {
  name: 'Веб-формы',
  code: 'web-forms',
  properties: [
    property('documents', 'Документы к форме (PDF)', 'file', {
      multiple: true,
      formats: ['pdf'],
      maxSizeMb: 5,
    }),
    property('related_page', 'Связанная страница', 'content-link'),
    property('seo', 'SEO', 'meta'),
    property('response_hours', 'Срок ответа, ч', 'number'),
    property('route', 'Кто обрабатывает', 'list', { options: FORM_ROUTES }),
    property('crm_tag', 'Метка в CRM', 'string'),
  ],
};

/** Значения по коду формы; `documents` — имена PDF в медиатеке, `page` — цепочка кодов страницы. */
const FORM_VALUES = {
  feedback: {
    documents: ['dogovor-oferta.pdf'],
    page: ['contacts'],
    seo: {
      h1: 'Напишите нам',
      title: 'Обратная связь — интернет-магазин Фаркоп.ру',
      description:
        'Задайте вопрос о заказе, наличии или доставке фаркопа — менеджер ответит в течение рабочего дня.',
    },
    response_hours: 24,
    route: 'Отдел продаж',
    crm_tag: 'site-feedback',
  },
  'install-request': {
    documents: ['prajs-list-ustanovka.pdf', 'dogovor-oferta.pdf'],
    page: ['services', 'towbar-installation'],
    seo: {
      h1: 'Запись на установку фаркопа',
      title: 'Записаться на установку фаркопа за 2 часа — Фаркоп.ру',
      description:
        'Выберите центр и удобное время: установим фаркоп и подключим электрику с гарантией 2 года на монтаж.',
    },
    response_hours: 2,
    route: 'Установочный центр',
    crm_tag: 'install-lead',
  },
  callback: {
    documents: ['dogovor-oferta.pdf'],
    page: ['contacts'],
    seo: {
      h1: 'Перезвоним за 15 минут',
      title: 'Обратный звонок — Фаркоп.ру',
      description: 'Оставьте номер телефона — менеджер перезвонит в рабочее время и поможет с выбором.',
    },
    response_hours: 0.25,
    route: 'Отдел продаж',
    crm_tag: 'callback',
  },
  'towbar-selection': {
    documents: ['instrukciya-montazha-farkopa.pdf', 'dogovor-oferta.pdf'],
    page: ['services', 'selection'],
    seo: {
      h1: 'Подберём фаркоп под ваш автомобиль',
      title: 'Подбор фаркопа по марке и модели авто — Фаркоп.ру',
      description:
        'Укажите марку, модель и год выпуска — пришлём подходящие фаркопы с ценой установки и сроками.',
    },
    response_hours: 4,
    route: 'Отдел продаж',
    crm_tag: 'towbar-selection',
  },
  review: {
    documents: ['dogovor-oferta.pdf'],
    page: ['reviews'],
    seo: {
      h1: 'Оставить отзыв',
      title: 'Отзывы покупателей о Фаркоп.ру',
      description: 'Расскажите, как прошли покупка и установка фаркопа: отзыв появится на сайте после проверки.',
    },
    response_hours: 48,
    route: 'Маркетинг',
    crm_tag: 'review',
  },
  warranty: {
    documents: ['garantijnyj-talon.pdf', 'sertifikat-iso-9001.pdf'],
    page: ['services', 'warranty'],
    seo: {
      h1: 'Гарантийное обращение',
      title: 'Вопрос по гарантии на фаркоп и установку — Фаркоп.ру',
      description:
        'Опишите проблему и приложите номер гарантийного талона — сервисная служба свяжется с вами.',
    },
    response_hours: 24,
    route: 'Сервисная служба',
    crm_tag: 'warranty-case',
  },
  wholesale: {
    documents: ['prajs-list-ustanovka.pdf', 'dogovor-oferta.pdf', 'sertifikat-tr-ts-bosal.pdf'],
    page: ['catalog', 'commercial'],
    seo: {
      h1: 'Оптовым клиентам и СТО',
      title: 'Фаркопы оптом для СТО и дилеров — Фаркоп.ру',
      description:
        'Оптовые цены, отсрочка платежа и отгрузка со складов в Подольске, Санкт-Петербурге и Екатеринбурге.',
    },
    response_hours: 8,
    route: 'Оптовый отдел',
    crm_tag: 'b2b-lead',
  },
  'trade-in-old-towbar': {
    documents: ['dogovor-oferta.pdf', 'instrukciya-montazha-farkopa.pdf'],
    page: ['promo'],
    seo: {
      h1: 'Сдайте старый фаркоп в зачёт',
      title: 'Трейд-ин фаркопа: скидка до 3000 ₽ — Фаркоп.ру',
      description:
        'Привезите старый фаркоп в установочный центр — зачтём до 3000 ₽ в стоимость нового с установкой.',
    },
    response_hours: 12,
    route: 'Отдел продаж',
    crm_tag: 'trade-in',
  },
};

async function seedForms(problems) {
  const changed = (await ensureSettings('forms', FORMS_SETTINGS, problems)).changed;

  const [forms, files, pages, targets] = await Promise.all([
    get('/forms'),
    get('/files'),
    get('/pages'),
    get('/infoblocks/settings/link-targets'),
  ]);
  const linkPage = pageLinker(pageResolver(pages), targets, problems);
  const docRule = FORMS_SETTINGS.properties.find((item) => item.code === 'documents');

  const pdfId = (name, context) => {
    const file = files.find((item) => item.name === name);
    const fits =
      file &&
      name.toLowerCase().endsWith('.pdf') &&
      file.size <= docRule.maxSizeMb * 1024 * 1024;
    if (!fits) {
      problems.push(`${context}: документ ${name} не найден в медиатеке — пропущен`);
      return undefined;
    }
    return file.id;
  };

  const records = forms.map((form) => {
    const context = `forms/form-${form.id} (${form.code})`;
    const preset = FORM_VALUES[form.code];
    if (!preset) {
      return {
        recordId: `form-${form.id}`,
        label: form.code,
        values: {
          response_hours: 24,
          route: 'Отдел продаж',
          crm_tag: form.code,
          seo: { h1: form.name, title: `${form.name} — Фаркоп.ру` },
        },
      };
    }
    return {
      recordId: `form-${form.id}`,
      label: form.code,
      values: {
        documents: preset.documents.map((name) => pdfId(name, context)).filter(Boolean),
        related_page: linkPage(preset.page, context),
        seo: preset.seo,
        response_hours: preset.response_hours,
        route: preset.route,
        crm_tag: preset.crm_tag,
      },
    };
  });

  return changed + (await fillValues('forms', records, problems));
}

/* -------------------------------------------------------- пользователи -- */

const DEPARTMENTS = [
  'Руководство',
  'Продажи',
  'Контент и SEO',
  'Установочный центр',
  'Бухгалтерия',
  'Склад и логистика',
];
const DUTIES = [
  'Каталог',
  'Страницы',
  'Инфоблоки',
  'Веб-формы',
  'Медиатека',
  'Пользователи',
  'Настройки',
];

const USERS_SETTINGS = {
  name: 'Пользователи панели',
  code: 'panel-users',
  properties: [
    property('position', 'Должность', 'string'),
    property('department', 'Отдел', 'list', { options: DEPARTMENTS }),
    property('phone', 'Телефон', 'string'),
    property('extension', 'Внутренний номер', 'number'),
    property('avatar', 'Аватар', 'image', {
      formats: ['png', 'jpg', 'webp', 'svg'],
      maxSizeMb: 1,
      maxWidth: 512,
      maxHeight: 512,
    }),
    property('duties', 'Разделы в работе', 'list', { multiple: true, options: DUTIES }),
  ],
};

/** Значения по email; аватар собирается из имени. */
const USER_VALUES = {
  'xvandev@gmail.com': {
    position: 'Руководитель проекта, администратор панели',
    department: 'Руководство',
    phone: '+7 (495) 120-45-00, доб. 100',
    extension: 100,
    duties: DUTIES,
    color: ['#f26b1d', '#c2410c'],
  },
  'manager@farkop.ru': {
    position: 'Старший менеджер по продажам',
    department: 'Продажи',
    phone: '+7 (916) 482-17-30',
    extension: 201,
    duties: ['Каталог', 'Веб-формы'],
    color: ['#2563eb', '#1e3a8a'],
  },
  'editor@farkop.ru': {
    position: 'Контент-редактор',
    department: 'Контент и SEO',
    phone: '+7 (925) 310-62-48',
    extension: 305,
    duties: ['Страницы', 'Инфоблоки', 'Медиатека'],
    color: ['#7c3aed', '#4c1d95'],
  },
  'seo@farkop.ru': {
    position: 'SEO-специалист',
    department: 'Контент и SEO',
    phone: '+7 (903) 774-09-15',
    extension: 306,
    duties: ['Страницы', 'Инфоблоки', 'Настройки'],
    color: ['#db2777', '#831843'],
  },
  'montazh@farkop.ru': {
    position: 'Руководитель установочного центра на Варшавском шоссе',
    department: 'Установочный центр',
    phone: '+7 (926) 555-31-82',
    extension: 410,
    duties: ['Веб-формы'],
    color: ['#0d9488', '#134e4a'],
  },
  'buh@farkop.ru': {
    position: 'Главный бухгалтер',
    department: 'Бухгалтерия',
    phone: '+7 (495) 120-45-00, доб. 120',
    extension: 120,
    duties: ['Медиатека'],
    color: ['#ca8a04', '#713f12'],
  },
  'sklad@farkop.ru': {
    position: 'Заведующий складом в Подольске',
    department: 'Склад и логистика',
    phone: '+7 (977) 218-44-06',
    extension: 520,
    duties: ['Каталог', 'Инфоблоки'],
    color: ['#475569', '#1e293b'],
  },
  'e.smirnova@farkop.ru': {
    position: 'Менеджер по продажам (уволилась 15.08.2026, доступ закрыт)',
    department: 'Продажи',
    phone: '+7 (915) 640-28-71',
    extension: 204,
    duties: ['Веб-формы'],
    color: ['#94a3b8', '#475569'],
  },
  'v.orlov@farkop.ru': {
    position: 'Мастер-установщик (перешёл в партнёрскую СТО, доступ закрыт)',
    department: 'Установочный центр',
    phone: '+7 (964) 112-93-57',
    extension: 415,
    duties: ['Веб-формы'],
    color: ['#94a3b8', '#334155'],
  },
};

const AVATAR_SECTION = { code: 'staff', name: 'Сотрудники' };

/** Инициалы: имя и фамилия («Ольга Сергеевна Кравченко» → «ОК»), одно слово — одна буква. */
function initials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

const escapeXml = (text) =>
  String(text).replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Аватар 256×256: круг с градиентом и инициалами — укладывается в ограничение 512×512. */
function avatarSvg(name, [from, to]) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
  <title>${escapeXml(name)}</title>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <circle cx="128" cy="128" r="128" fill="url(#bg)"/>
  <circle cx="128" cy="128" r="112" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="4"/>
  <text x="128" y="128" dy="0.35em" text-anchor="middle" font-family="Inter, 'Segoe UI', Arial, sans-serif" font-size="96" font-weight="600" fill="#ffffff">${escapeXml(initials(name))}</text>
</svg>
`;
}

const avatarFileName = (email) =>
  `avatar-${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-')}.svg`;

/** Раздел «Сотрудники» и аватар каждого пользователя в нём; возвращает email → номер файла. */
async function ensureAvatars(users, problems) {
  let created = 0;
  const sections = await get('/file-sections');
  let section = sections.find((item) => item.code === AVATAR_SECTION.code);
  if (!section) {
    section = await post('/file-sections', AVATAR_SECTION);
    created += 1;
    log(SECTION, `медиатека: раздел «${section.name}» создан`);
  }

  const existing = await get(`/files?sectionId=${section.id}`);
  const ids = new Map();
  for (const user of users) {
    const name = avatarFileName(user.email);
    let file = existing.find((item) => item.name === name);
    if (!file) {
      const preset = USER_VALUES[user.email];
      try {
        file = await upload(
          section.id,
          {
            name,
            type: 'image/svg+xml',
            data: avatarSvg(user.name || user.email, preset?.color ?? ['#64748b', '#334155']),
          },
          `Аватар сотрудника: ${user.name || user.email}`,
        );
        created += 1;
        log(SECTION, `медиатека: аватар ${name} загружен`);
      } catch (error) {
        problems.push(`аватар ${name}: ${error.message}`);
        continue;
      }
    }
    ids.set(user.email, file.id);
  }
  return { ids, created };
}

async function seedUsers(problems) {
  const changed = (await ensureSettings('users', USERS_SETTINGS, problems)).changed;

  const users = await get('/users');
  const avatars = await ensureAvatars(users, problems);

  const records = users.map((user) => {
    const preset = USER_VALUES[user.email];
    const values = preset
      ? {
          position: preset.position,
          department: preset.department,
          phone: preset.phone,
          extension: preset.extension,
          duties: preset.duties,
        }
      : { position: 'Сотрудник', duties: ['Страницы'] };
    return {
      recordId: String(user.id),
      label: user.email,
      values: { ...values, avatar: avatars.ids.get(user.email) },
    };
  });

  return changed + avatars.created + (await fillValues('users', records, problems));
}

/* --------------------------------------------------------------- домены -- */

const REGIONS = [
  'Вся Россия',
  'Москва и Московская область',
  'Санкт-Петербург и Ленинградская область',
  'Урал',
  'Зарубежье',
  'Технический домен',
];

const BRANCH_HEADER = ['Точка', 'Адрес', 'Часы работы'];

const DOMAINS_SETTINGS = {
  name: 'Домены сайта',
  code: 'site-domains',
  properties: [
    property('region', 'Регион', 'list', { options: REGIONS }),
    property('counter', 'Счётчик', 'string'),
    property('landing', 'Стартовая страница', 'content-link'),
    property('branch_scheme', 'Схема филиала', 'table', { rows: 4, columns: 3 }),
    property('robots', 'robots.txt', 'text'),
  ],
};

const robots = (host, extra = []) =>
  [
    'User-agent: *',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /search?',
    ...extra,
    'Allow: /uploads/',
    '',
    `Sitemap: https://${host}/sitemap.xml`,
  ].join('\n');

const CLOSED_ROBOTS = (comment) => ['User-agent: *', 'Disallow: /', '', `# ${comment}`].join('\n');

/** Значения по имени хоста; `landing` — цепочка кодов страницы. */
const DOMAIN_VALUES = {
  'farkop.ru': {
    region: 'Вся Россия',
    counter: 'Яндекс Метрика 94817352',
    landing: [],
    branches: [
      ['Офис и склад', 'Подольск, ул. Индустриальная, 11', 'Пн–Пт 9:00–19:00'],
      ['Установочный центр', 'Москва, Варшавское шоссе, 170Г', 'Ежедневно 9:00–21:00'],
      ['Пункт выдачи', 'Химки, Ленинградское шоссе, 1В', 'Ежедневно 10:00–20:00'],
    ],
    robots: robots('farkop.ru', ['Disallow: /cart', 'Clean-param: utm_source&utm_medium&utm_campaign']),
  },
  'www.farkop.ru': {
    region: 'Технический домен',
    counter: 'Общий с farkop.ru (94817352)',
    landing: [],
    robots: CLOSED_ROBOTS('Зеркало: все запросы уходят 301-редиректом на farkop.ru'),
  },
  'msk.farkop.ru': {
    region: 'Москва и Московская область',
    counter: 'Яндекс Метрика 94817361',
    landing: ['services', 'towbar-installation'],
    branches: [
      ['Установочный центр', 'Москва, Варшавское шоссе, 170Г', 'Ежедневно 9:00–21:00'],
      ['Установочный центр', 'Химки, Ленинградское шоссе, 1В', 'Ежедневно 10:00–20:00'],
      ['Установочный центр', 'Балашиха, шоссе Энтузиастов, 36', 'Пн–Сб 9:00–20:00'],
    ],
    robots: robots('msk.farkop.ru', ['Disallow: /cart']),
  },
  'spb.farkop.ru': {
    region: 'Санкт-Петербург и Ленинградская область',
    counter: 'Яндекс Метрика 94817374',
    landing: ['delivery'],
    branches: [
      ['Склад', 'Санкт-Петербург, Парнас, 4-й Верхний пер., 1к2', 'Пн–Пт 9:00–18:00'],
      ['Установочный центр', 'Санкт-Петербург, Софийская ул., 60', 'Ежедневно 9:00–20:00'],
      ['Пункт выдачи', 'Санкт-Петербург, Пулковское шоссе, 25к1', 'Ежедневно 10:00–21:00'],
    ],
    robots: robots('spb.farkop.ru', ['Disallow: /cart']),
  },
  'ekb.farkop.ru': {
    region: 'Урал',
    counter: 'Яндекс Метрика 94817389',
    landing: ['contacts'],
    branches: [
      ['Склад и самовывоз', 'Екатеринбург, ул. Монтёрская, 3', 'Пн–Сб 9:00–19:00'],
      ['Пункт выдачи', 'Челябинск, Свердловский тракт, 5', 'Пн–Пт 10:00–19:00'],
      ['Пункт выдачи', 'Тюмень, ул. Федюнинского, 30', 'Пн–Пт 10:00–19:00'],
    ],
    robots: robots('ekb.farkop.ru', ['Disallow: /cart']),
  },
  'shop.farkop.ru': {
    region: 'Вся Россия',
    counter: 'Яндекс Метрика 94817352 (цели «Оформление заказа», «Оплата»)',
    landing: ['catalog'],
    branches: [
      ['Склад отгрузки', 'Подольск, ул. Индустриальная, 11', 'Отгрузка Пн–Сб до 16:00'],
      ['Самовывоз в Москве', 'Москва, Варшавское шоссе, 170Г', 'Ежедневно 9:00–21:00'],
      ['Самовывоз в Санкт-Петербурге', 'Санкт-Петербург, Софийская ул., 60', 'Ежедневно 9:00–20:00'],
    ],
    robots: CLOSED_ROBOTS('Корзина и оформление заказа: в поиске не нужны, каталог — на farkop.ru'),
  },
  'opt.farkop.ru': {
    region: 'Вся Россия',
    counter: 'Яндекс Метрика 94817395',
    landing: ['catalog', 'commercial'],
    branches: [
      ['Оптовый склад', 'Подольск, ул. Индустриальная, 11, ворота 4', 'Пн–Пт 8:00–17:00'],
      ['Склад в Санкт-Петербурге', 'Парнас, 4-й Верхний пер., 1к2', 'Пн–Пт 9:00–18:00'],
      ['Склад в Екатеринбурге', 'Екатеринбург, ул. Монтёрская, 3', 'Пн–Пт 9:00–18:00'],
    ],
    robots: CLOSED_ROBOTS('Оптовый портал работает по логину, индексировать нечего'),
  },
  'm.farkop.ru': {
    region: 'Технический домен',
    counter: 'Снят 01.09.2026 вместе с мобильной версией',
    landing: [],
    robots: CLOSED_ROBOTS('Старая мобильная версия отключена, домен держим до конца оплаты'),
  },
  'towbar-shop.ru': {
    region: 'Зарубежье',
    counter: 'Google Analytics G-7QK2M4XR9D',
    landing: ['catalog'],
    branches: [
      ['Экспортный склад', 'Подольск, ул. Индустриальная, 11', 'Пн–Пт 9:00–18:00 (МСК)'],
      ['Склад маркетплейса', 'Коледино, Подольский г. о.', 'По графику поставок'],
      ['Склад маркетплейса', 'Хоругвино, Солнечногорский г. о.', 'По графику поставок'],
    ],
    robots: robots('towbar-shop.ru'),
  },
};

async function seedDomains(problems) {
  const changed = (await ensureSettings('domains', DOMAINS_SETTINGS, problems)).changed;

  const [domains, pages, targets] = await Promise.all([
    get('/domains'),
    get('/pages'),
    get('/infoblocks/settings/link-targets'),
  ]);
  const linkPage = pageLinker(pageResolver(pages), targets, problems);

  const records = domains.map((domain) => {
    const context = `domains/${domain.id} (${domain.host})`;
    const preset = DOMAIN_VALUES[domain.host];
    if (!preset) {
      return {
        recordId: String(domain.id),
        label: domain.host,
        values: {
          region: 'Вся Россия',
          landing: linkPage([], context),
          robots: robots(domain.host),
        },
      };
    }
    return {
      recordId: String(domain.id),
      label: domain.host,
      values: {
        region: preset.region,
        counter: preset.counter,
        landing: linkPage(preset.landing, context),
        branch_scheme: preset.branches ? [BRANCH_HEADER, ...preset.branches] : undefined,
        robots: preset.robots,
      },
    };
  });

  return changed + (await fillValues('domains', records, problems));
}

/* ---------------------------------------------------------------- запуск -- */

export default async function seed() {
  const problems = [];
  let created = 0;

  for (const [name, step] of [
    ['forms', seedForms],
    ['users', seedUsers],
    ['domains', seedDomains],
  ]) {
    try {
      created += await step(problems);
    } catch (error) {
      problems.push(`${name}: ${error.message}`);
    }
  }

  log(SECTION, `итого изменений: ${created}`);
  for (const problem of problems) log(SECTION, `проблема: ${problem}`);
  return { created, problems };
}
