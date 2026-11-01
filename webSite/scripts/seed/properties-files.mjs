/**
 * Свойства медиатеки: настройки списка «file-sections» (разделы, древовидный
 * список) плюс значения у каждого раздела. Ключ записи — номер раздела строкой,
 * как в админке. У самих файлов свойств нет — сервер их не заводит.
 *
 * Идемпотентно: существующие свойства не трогаем, недостающие дописываем в
 * конец; значения сливаем с уже сохранёнными (сохранённое не перетираем),
 * родителя в дереве ставим только записи, у которой ещё нет строки значений.
 * Журнала у медиатеки нет — правки свойств никуда не пишутся, это ожидаемо.
 */
import { get, put, log } from './lib.mjs';

const SECTION = 'properties-files';

const prop = (code, name, type, extra = {}) => ({
  code,
  name,
  type,
  required: false,
  multiple: false,
  options: [],
  ...extra,
});

// ---------------------------------------------------------------- разделы

const PURPOSES = [
  'Каталог товаров',
  'Баннеры и акции',
  'Документы для покупателей',
  'Графика интерфейса',
  'Сертификаты и разрешения',
  'Новости и статьи',
];

const SECTION_PROPS = [
  prop('purpose', 'Назначение', 'list', { options: PURPOSES, multiple: true }),
  prop('owner', 'Ответственный', 'string'),
  prop('section_description', 'Описание раздела', 'html'),
  prop('cover', 'Обложка раздела', 'image', {
    formats: ['png', 'jpg', 'webp', 'svg'],
    maxSizeMb: 2,
  }),
  prop('max_file_mb', 'Рекомендуемый вес файла, МБ', 'number'),
];

const SECTIONS_SETTINGS = { name: 'Разделы медиатеки', code: 'media-sections', isTree: true };

/** Значения разделов по коду раздела; `parent` — код раздела-родителя. */
const SECTION_VALUES = {
  products: {
    purpose: ['Каталог товаров'],
    owner: 'Марина Белова, старший менеджер по продажам',
    section_description:
      '<p>Фотографии товаров для карточек каталога: фаркопы, электрика, розетки и крепёж.</p>' +
      '<ul><li>квадрат, не меньше 1000×1000 px, белый или светло-серый фон;</li>' +
      '<li>имя файла — латиницей: <em>farkop-бренд-модель.png</em>;</li>' +
      '<li>первое фото — вид спереди с шаром, остальные — детали крепления.</li></ul>',
    cover: { file: 'farkop-westfalia-vw-tiguan.png' },
    max_file_mb: 1,
  },
  banners: {
    purpose: ['Баннеры и акции', 'Графика интерфейса'],
    owner: 'Кирилл Лаптев, дизайнер',
    section_description:
      '<p>Баннеры акций и спецпредложений для главной, каталога и раздела услуг.</p>' +
      '<p>Каждый баннер готовим в двух версиях — широкой для компьютера и вертикальной ' +
      'для телефона. Снятые с сайта акции не удаляем: они пригодятся к следующему сезону.</p>' +
      '<p>Вложенный раздел «Иконки» — значки интерфейса сайта.</p>',
    cover: { file: 'banner-autumn-sale-2400x600.png' },
    max_file_mb: 0.5,
  },
  docs: {
    purpose: ['Документы для покупателей'],
    owner: 'Ольга Никитина, руководитель отдела оптовых продаж',
    section_description:
      '<p>Документы, которые покупатель скачивает с сайта: оферта, гарантийный талон, ' +
      'инструкции по монтажу и прайс-листы.</p>' +
      '<p><strong>Перед заменой файла</strong> согласуйте новую редакцию с юристом и ' +
      'обновите дату в названии документа. Сертификаты лежат во вложенном разделе.</p>',
    cover: { section: 'certificates', file: 'sertifikat-ustanovochnogo-centra.png' },
    max_file_mb: 5,
  },
  icons: {
    parent: 'banners',
    purpose: ['Графика интерфейса'],
    owner: 'Кирилл Лаптев, дизайнер',
    section_description:
      '<p>Значки интерфейса: меню каталога, блок преимуществ, контакты, оформление заказа, ' +
      'а также фавиконки сайта.</p>' +
      '<p>Иконки — в SVG, линия 1,5 px, цвет задаётся стилями сайта. Растровые PNG — ' +
      'только для фавиконок и ярлыков на телефоне.</p>',
    cover: { file: 'icon-towbar.svg' },
    max_file_mb: 0.1,
  },
  certificates: {
    parent: 'docs',
    purpose: ['Сертификаты и разрешения', 'Документы для покупателей'],
    owner: 'Андрей Соколов, руководитель установочного центра',
    section_description:
      '<p>Сертификаты соответствия ТР ТС 018/2011, декларации, дилерские сертификаты и ' +
      'свидетельства об аккредитации установочных центров.</p>' +
      '<p>Покупатели просят их для регистрации фаркопа в ГИБДД — держим актуальные ' +
      'версии и следим за сроком действия.</p>',
    cover: { file: 'sertifikat-ustanovochnogo-centra.png' },
    max_file_mb: 3,
  },
  news: {
    purpose: ['Новости и статьи'],
    owner: 'Елена Сафонова, контент-менеджер',
    section_description:
      '<p>Обложки и вложения к новостям компании и статьям блога.</p>' +
      '<ul><li>обложка новости — 1200×630 px, под превью в соцсетях;</li>' +
      '<li>пресс-релизы — PDF, тексты для согласования — TXT.</li></ul>',
    cover: { file: 'news-kazan-service.png' },
    max_file_mb: 1,
  },
};

/** Раздел без описания — значения из его названия. */
function fallbackSectionValues(section) {
  return {
    owner: 'Елена Сафонова, контент-менеджер',
    section_description: `<p>Файлы раздела «${section.name}».</p>`,
  };
}

// ------------------------------------------------------------- помощники

const problems = [];
const problem = (message) => {
  problems.push(message);
  log(SECTION, `ВНИМАНИЕ: ${message}`);
};

const isEmptyValue = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

/**
 * Настройки списка: если их нет — создаём; если есть — оставляем имя, код,
 * дерево и все свойства как есть и дописываем в конец только недостающие.
 */
async function ensureSettings(listKey, { name, code, isTree, properties }) {
  const current = await get(`/infoblocks/settings/${listKey}`);
  const have = new Set(current.properties.map((property) => property.code));
  const missing = properties.filter((property) => !have.has(property.code));
  const enableTree = isTree === true && !current.isTree;

  if (current.name && missing.length === 0 && !enableTree) {
    return { settings: current, changed: false };
  }

  const body = {
    name: current.name ?? name,
    code: current.code ?? code,
    isTree: current.isTree || isTree === true,
    properties: [...current.properties, ...missing].slice(0, 50),
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const settings = await put(`/infoblocks/settings/${listKey}`, body);
      log(
        SECTION,
        `${listKey}: настройки «${settings.name}» (${settings.code}) — добавлено свойств ${missing.length}` +
          (enableTree ? ', включено дерево' : ''),
      );
      return { settings, changed: true };
    } catch (error) {
      // Код списка занят другим списком — подбираем свободный (только для новых настроек)
      if (error.status === 409 && !current.code) {
        body.code = `${code}-${attempt + 2}`;
        continue;
      }
      throw error;
    }
  }
  throw new Error(`${listKey}: не удалось подобрать свободный код списка`);
}

/**
 * Значения записей: к сохранённым дописываем только отсутствующие коды.
 * Пропускаем свойства, которые в настройках уже другого типа (их завели
 * руками), и варианты списка, которых в настройках нет.
 */
async function fillValues(listKey, settings, definitions, records) {
  const rows = await get(`/infoblocks/settings/${listKey}/values`);
  const byId = new Map(rows.map((row) => [row.recordId, row]));
  const effective = new Map(settings.properties.map((property) => [property.code, property]));
  let written = 0;

  for (const record of records) {
    const row = byId.get(record.recordId);
    const current = row?.values ?? {};
    const additions = {};

    for (const [code, raw] of Object.entries(record.values)) {
      if (isEmptyValue(raw) || current[code] !== undefined) continue;
      const property = effective.get(code);
      const expected = definitions.get(code);
      if (!property || !expected || property.type !== expected.type) continue;

      let value = raw;
      if (property.type === 'list') {
        const allowed = (Array.isArray(raw) ? raw : [raw]).filter((option) =>
          property.options.includes(option),
        );
        if (allowed.length === 0) continue;
        value = property.multiple ? allowed : allowed[0];
      }
      additions[code] = value;
    }

    // Родитель: сохранённый не трогаем; новой записи ставим заданный
    let parentId = row?.parentId ?? null;
    let parentChanged = false;
    if (settings.isTree && !row && record.parentId && parentId === null) {
      parentId = record.parentId;
      parentChanged = true;
    }

    if (Object.keys(additions).length === 0 && !parentChanged) continue;

    try {
      await put(`/infoblocks/settings/${listKey}/values/${record.recordId}`, {
        values: { ...current, ...additions },
        ...(settings.isTree ? { parentId } : {}),
      });
      written += 1;
    } catch (error) {
      problem(`${listKey}/${record.recordId} (${record.label}): ${error.message}`);
    }
  }

  log(SECTION, `${listKey}: значения записаны у ${written} из ${records.length} записей`);
  return written;
}

// ------------------------------------------------------------------- сид

export default async function seed() {
  problems.length = 0;
  const [sections, files] = await Promise.all([get('/file-sections'), get('/files')]);
  const sectionByCode = new Map(sections.map((section) => [section.code, section]));
  const fileId = (sectionCode, name) => {
    const section = sectionByCode.get(sectionCode);
    const file = section && files.find((item) => item.sectionId === section.id && item.name === name);
    return file ? file.id : null;
  };

  let created = 0;

  // --- Разделы медиатеки: настройки (дерево) и значения
  const sectionDefs = new Map(SECTION_PROPS.map((property) => [property.code, property]));
  const sectionSettings = await ensureSettings('file-sections', {
    ...SECTIONS_SETTINGS,
    properties: SECTION_PROPS,
  });
  if (sectionSettings.changed) created += 1;

  const sectionRecords = sections.map((section) => {
    const spec = SECTION_VALUES[section.code];
    const values = spec ? { ...spec } : fallbackSectionValues(section);
    delete values.parent;
    if (spec?.cover) {
      const id = fileId(spec.cover.section ?? section.code, spec.cover.file);
      if (id) values.cover = id;
      else problem(`обложка раздела «${section.code}»: файл ${spec.cover.file} не найден`);
    }
    const parent = spec?.parent ? sectionByCode.get(spec.parent) : null;
    return {
      recordId: String(section.id),
      label: section.code,
      values,
      parentId: parent ? String(parent.id) : null,
    };
  });
  created += await fillValues('file-sections', sectionSettings.settings, sectionDefs, sectionRecords);

  log(SECTION, `итого записей настроек и значений: ${created}`);
  return { created, problems: [...problems] };
}
