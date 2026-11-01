import { PropertyType } from '../../src/api/client';

export { PropertyType };

/** Вариант выбора: значение, подпись и пояснение под ней. */
export interface PropertyTypeOption {
  value: string;
  label: string;
  description?: string;
}

/** Подписи типов свойств — в окне настроек и в подсказках. */
export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.String]: 'Строка',
  [PropertyType.Number]: 'Число',
  [PropertyType.Text]: 'Текст',
  [PropertyType.Html]: 'HTML',
  [PropertyType.List]: 'Список',
  [PropertyType.File]: 'Файл',
  [PropertyType.Image]: 'Изображение',
  [PropertyType.ContentLink]: 'Привязка к записям контента',
  [PropertyType.ContentTypeLink]: 'Привязка к типу контента',
  [PropertyType.ListOptionLink]: 'Привязка к значениям списка',
  [PropertyType.Table]: 'Таблица',
};

/** Пояснение к типу: что окажется в шторке записи. */
const PROPERTY_TYPE_HINTS: Record<PropertyType, string> = {
  [PropertyType.String]: 'Одна строка текста',
  [PropertyType.Number]: 'Число, в том числе дробное',
  [PropertyType.Text]: 'Многострочный текст',
  [PropertyType.Html]: 'Визуальный редактор',
  [PropertyType.List]: 'Выбор из заданных вариантов',
  [PropertyType.File]: 'Файл из медиатеки или с диска; формат и вес задаются',
  [PropertyType.Image]: 'Картинка; формат, вес и разрешение задаются',
  [PropertyType.ContentLink]: 'Страница, элемент типа контента, роль, категория товаров, форма или её поле',
  [PropertyType.ContentTypeLink]: 'Тип из раздела «Контент»: «Новости», «Статьи»',
  [PropertyType.ListOptionLink]: 'Вариант «Списка» другого свойства — например, «Тип страницы»',
  [PropertyType.Table]: 'Таблица заданного размера',
};

/** Порядок в выборе типа — от простого к составному. */
export const PROPERTY_TYPE_OPTIONS: PropertyTypeOption[] = (
  Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]
).map((type) => ({
  value: type,
  label: PROPERTY_TYPE_LABELS[type],
  description: PROPERTY_TYPE_HINTS[type],
}));

/** Форматы изображений, из которых выбирают в настройках свойства. */
export const IMAGE_FORMAT_OPTIONS: PropertyTypeOption[] = ['jpg', 'png', 'webp', 'gif', 'svg', 'avif'].map(
  (format) => ({ value: format, label: format.toUpperCase() }),
);

/** Таблица: столько же разрешает бэкенд. Строки в записи добавляются свободно. */
export const TABLE_MAX_ROWS = 50;
export const TABLE_MAX_COLUMNS = 20;
export const DEFAULT_TABLE_COLUMNS = 3;

/**
 * Несколько значений можно включить любому типу, кроме таблицы: у неё строки
 * и так добавляются сколько угодно, а вторая таблица в том же свойстве от них
 * неотличима.
 */
export const supportsMultiple = (type: PropertyType): boolean =>
  type !== PropertyType.Table;

/** Строка, текст и HTML: значение у них — один и тот же текст, между ними переходят без потерь. */
export const isTextType = (type: PropertyType): boolean =>
  type === PropertyType.String || type === PropertyType.Text || type === PropertyType.Html;

/**
 * Можно ли сменить тип заведённого свойства — то же правило, что у сервера.
 * Пока свойство нигде не заполнено — на любой. Заполненному — только между
 * строкой, текстом и HTML: остальные типы хранят значение по-своему.
 */
export const canChangeType = (from: PropertyType, to: PropertyType, isFilled: boolean): boolean =>
  from === to || !isFilled || (isTextType(from) && isTextType(to));

/** Варианты задаются только у списка. */
export const hasOptions = (type: PropertyType): boolean => type === PropertyType.List;

/** Формат и вес ограничиваются у файла и изображения. */
export const hasFileRules = (type: PropertyType): boolean =>
  type === PropertyType.File || type === PropertyType.Image;

/** Разрешение ограничивается только у изображения. */
export const hasResolution = (type: PropertyType): boolean => type === PropertyType.Image;

/** Столбцы и их заголовки задаются только у таблицы. */
export const hasTableConfig = (type: PropertyType): boolean =>
  type === PropertyType.Table;

/** Типы-привязки: значение у обоих — запись `{ listKey, recordId }`. */
export const isLinkType = (type: PropertyType): boolean =>
  type === PropertyType.ContentLink || type === PropertyType.ContentTypeLink;

/**
 * Список-источник задаётся только у привязки к записям: у привязки к типу
 * контента он всегда один — типы.
 */
export const hasLinkSource = (type: PropertyType): boolean =>
  type === PropertyType.ContentLink;

/**
 * Есть ли у типа что настраивать: варианты списка, правила файла, столбцы
 * таблицы, источник привязки. У остальных типов окно параметров открывать незачем.
 */
export const hasConfig = (type: PropertyType): boolean =>
  hasOptions(type) || hasFileRules(type) || hasTableConfig(type) || hasLinkSource(type);
