import type {
  ListOptionDto,
  ListPropertyDto,
  ListSettingsDto,
  ListTabDto,
  UpdateListSettingsDto,
} from '../../src/api/client';
import { uniqueSlug } from '../slug';
import {
  EditorFieldType,
  type EditorFieldDef,
  type EditorFieldGroup,
  type EditorSelectOption,
  type EditorValues,
} from '../editorForm';
import {
  DEFAULT_TABLE_COLUMNS,
  ListPropertyType,
  TABLE_MAX_COLUMNS,
  hasFileRules,
  hasLinkSource,
  hasOptions,
  hasResolution,
  hasTableConfig,
  supportsMultiple,
} from './propertyTypes';

/**
 * Окно настроек списка: имя, код и древовидность — обычные поля формы, свойства —
 * список черновиков. Чистые функции — без React и сети.
 */

/** Код списка — как у остальных кодов панели: строчные латинские буквы, цифры, дефис. */
export const LIST_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Код свойства — ключ значения и переменная в шаблоне сайта. */
export const PROPERTY_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Код вкладки — как у кода списка: строчные латинские буквы, цифры, дефис. */
export const TAB_CODE_PATTERN = LIST_CODE_PATTERN;

export const validateListCode = (value: unknown): string | null => {
  const code = String(value ?? '').trim();
  if (!code) return null; // пустоту ловит required
  return LIST_CODE_PATTERN.test(code)
    ? null
    : 'Код списка: строчные латинские буквы, цифры и дефис между ними';
};

/**
 * Символьный код записей: три флага настроек — одним выбором. По отдельности
 * они бессмысленны (уникальность без обязательности нечего проверять), а тремя
 * галочками занимали пол-окна.
 */
export const CodeMode = {
  None: 'none',
  Optional: 'optional',
  Required: 'required',
  Unique: 'unique',
} as const;

export type CodeModeValue = (typeof CodeMode)[keyof typeof CodeMode];

const CODE_MODE_OPTIONS: EditorSelectOption[] = [
  { value: CodeMode.None, label: 'Нет', description: 'У записей нет поля «Код»' },
  {
    value: CodeMode.Optional,
    label: 'Необязательный',
    description: 'Поле есть, но запись сохранится и без кода',
  },
  { value: CodeMode.Required, label: 'Обязательный', description: 'Без кода запись не сохранить' },
  {
    value: CodeMode.Unique,
    label: 'Обязательный и уникальный',
    description: 'Код сверяется с кодами остальных записей списка',
  },
];

/** Три флага настроек → один пункт списка. */
export const codeModeOf = (settings: ListSettingsDto | null): CodeModeValue => {
  if (settings?.useCode === false) return CodeMode.None;
  if (settings?.codeRequired !== true) return CodeMode.Optional;
  return settings.codeUnique === true ? CodeMode.Unique : CodeMode.Required;
};

/**
 * Поля окна настроек. `ownNesting` — у раздела своя вложенность (страницы — дерево,
 * у форм внутри поля): древовидность ему не включают и не выключают.
 */
export const settingsFields = (ownNesting: boolean): EditorFieldDef[] => [
  {
    key: 'name',
    label: 'Имя',
    type: EditorFieldType.Text,
    required: true,
    note: 'Заголовок над таблицей списка',
  },
  {
    key: 'code',
    label: 'Код',
    type: EditorFieldType.Text,
    required: true,
    placeholder: 'news',
    note: 'По коду список находит сайт; у каждого списка свой',
    validate: validateListCode,
  },
  {
    key: 'codeMode',
    label: 'Символьный код',
    type: EditorFieldType.Select,
    options: CODE_MODE_OPTIONS,
    note: 'Поле «Код» в карточке записи: по нему запись находит сайт. Код подставляется из названия',
  },
  {
    key: 'useRecordMeta',
    label: 'Мета записи',
    type: EditorFieldType.Switch,
    note: 'В карточке каждой записи появится вкладка «Мета»: H1, Title и Description',
  },
  {
    key: 'isTree',
    label: 'Древовидная структура',
    type: EditorFieldType.Switch,
    disabled: () => ownNesting,
    note: ownNesting
      ? 'У этого раздела своя вложенность — она задаётся самим разделом'
      : 'Записи можно вкладывать друг в друга, как страницы: в строках появится «добавить внутрь», в карточке — «Родитель»',
  },
];

export const SETTINGS_GROUPS: EditorFieldGroup[] = [
  {
    key: 'main',
    fields: ['name', 'code', 'isTree', 'codeMode', 'useRecordMeta'],
  },
];

/**
 * Код по умолчанию — из ключа списка: `infoblock-elements.3` → `infoblock-elements-3`.
 * Уникален сразу, а поменять его на осмысленный («news») можно тут же.
 */
export const defaultListCode = (listKey: string): string => listKey.replace(/\./g, '-');

/** Имя, код и дерево в форме: сохранённые, а пока их нет — из заголовка экрана и ключа списка. */
export const settingsFormValues = (
  settings: ListSettingsDto | null,
  listKey: string,
  fallbackName: string,
  ownNesting: boolean,
): EditorValues => ({
  name: settings?.name ?? fallbackName,
  code: settings?.code ?? defaultListCode(listKey),
  // `false` у Switch значит «выключено», всё остальное — «включено»
  isTree: ownNesting || settings?.isTree === true,
  // Код у записей есть, пока его не выключили: настройки без этой строки
  // сохранялись ещё до её появления, а код у записей был
  codeMode: codeModeOf(settings),
  useRecordMeta: settings?.useRecordMeta === true,
});

/** Вкладка в окне настроек. `uid` — ключ строки в интерфейсе, на сервер не уходит. */
export interface TabDraft extends ListTabDto {
  uid: string;
  /** Вкладка уже сохранена: код больше не меняется — на него ссылаются свойства */
  saved: boolean;
}

let tabCounter = 0;
const nextTabUid = (): string => `tab-${(tabCounter += 1)}`;

export const toTabDrafts = (tabs: ListTabDto[]): TabDraft[] =>
  tabs.map((tab) => ({ ...tab, uid: nextTabUid(), saved: true }));

export const newTabDraft = (name = '', code = ''): TabDraft => ({
  uid: nextTabUid(),
  saved: false,
  code: code.trim(),
  name: name.trim(),
});

/**
 * Код вкладки по её названию: «Доставка» → `dostavka`. Занятый код получает номер.
 *
 * Пользователю код не показывается и не нужен: вкладка существует только в карточке
 * записи, сайт о ней ничего не знает и читает значения по кодам **свойств**. Код здесь —
 * внутренний ключ, по которому свойство привязано к вкладке и переживает переименование.
 */
export const tabCodeFromName = (name: string, taken: string[]): string =>
  uniqueSlug(name, taken, 'tab');

/** Ошибка в названии новой вкладки или null. Код пользователь не вводит — он генерируется. */
export const newTabNameError = (name: string): string | null =>
  name.trim() ? null : 'Введите название вкладки';

/** Переставить вкладку на шаг вверх или вниз; за край списка не уходит. */
export const moveTabDraft = (tabs: TabDraft[], index: number, step: -1 | 1): TabDraft[] => {
  const target = index + step;
  if (target < 0 || target >= tabs.length) return tabs;
  const next = [...tabs];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
};

/** Ошибка во вкладках (первая) или null. */
export function validateTabs(tabs: TabDraft[], drafts: PropertyDraft[]): string | null {
  const codes = new Set<string>();

  for (let index = 0; index < tabs.length; index += 1) {
    const tab = tabs[index];
    const title = tab.name.trim() || `№${index + 1}`;
    const code = tab.code.trim();

    if (!tab.name.trim()) return `У вкладки ${title} нет названия`;
    if (!code) return `У вкладки «${title}» нет кода`;
    if (!TAB_CODE_PATTERN.test(code)) {
      return `Код вкладки «${title}»: строчные латинские буквы, цифры и дефис между ними`;
    }
    if (codes.has(code)) return `Код вкладки «${code}» уже занят`;
    codes.add(code);
  }

  const uids = new Set(tabs.map((tab) => tab.uid));
  const orphan = drafts.find((draft) => draft.tab && !uids.has(draft.tab));
  if (orphan) {
    return `Свойство «${orphan.name.trim() || orphan.code}» стоит на удалённой вкладке`;
  }

  return null;
}

/** Варианты выбора вкладки у свойства: «—» это общая вкладка «Свойства». */
export const tabChoices = (tabs: TabDraft[]): { value: string; label: string }[] => [
  { value: DEFAULT_TAB_KEY, label: 'Свойства' },
  ...tabs.map((tab, index) => ({
    value: tab.uid,
    label: tab.name.trim() || tab.code.trim() || `Вкладка №${index + 1}`,
  })),
];

const toTabPayload = ({ uid: _uid, saved: _saved, ...tab }: TabDraft): ListTabDto => ({
  code: tab.code.trim(),
  name: tab.name.trim(),
});

/** Вкладки в окне отличаются от сохранённых. */
export const tabsChanged = (saved: ListTabDto[], tabs: TabDraft[]): boolean =>
  JSON.stringify(saved.map((tab) => ({ code: tab.code, name: tab.name }))) !==
  JSON.stringify(tabs.map(toTabPayload));

/** Свойство в окне настроек. `uid` — ключ строки в интерфейсе, на сервер не уходит. */
export interface PropertyDraft extends ListPropertyDto {
  uid: string;
  /** Свойство уже сохранено: код больше не меняется — по нему хранятся значения */
  saved: boolean;
  /**
   * Порядок свойства в карточке. На сервер не уходит: там порядок — это порядок
   * массива, и свойства сортируются по этому числу перед отправкой.
   */
  sort: number;
}

let draftCounter = 0;
const nextUid = (): string => `property-${(draftCounter += 1)}`;

/**
 * Свойства в черновики. Внутри окна вкладка адресуется `uid`, а не кодом:
 * код незасохранённой вкладки ещё правят, и свойства от неё бы оторвались.
 * Обратно в код это переводится при сохранении.
 */
export const toDrafts = (properties: ListPropertyDto[], tabs: TabDraft[]): PropertyDraft[] =>
  properties.map((property, index) => ({
    ...property,
    tab: tabs.find((tab) => tab.code === property.tab)?.uid ?? DEFAULT_TAB_KEY,
    uid: nextUid(),
    saved: true,
    // Шаг в десять: между соседями всегда есть куда вписать новое свойство
    sort: (index + 1) * SORT_STEP,
  }));

/** Шаг сортировки: порядок задают числами, и между соседями должно оставаться место. */
export const SORT_STEP = 10;

/** Следующий номер сортировки — после самого дальнего свойства вкладки. */
export const nextSort = (drafts: PropertyDraft[], tab: string): number =>
  drafts
    .filter((draft) => draft.tab === tab)
    .reduce((max, draft) => Math.max(max, draft.sort), 0) + SORT_STEP;

/** Свойства в порядке показа: по номеру сортировки, при равных — как лежат. */
export const sortedDrafts = (drafts: PropertyDraft[]): PropertyDraft[] =>
  drafts
    .map((draft, index) => ({ draft, index }))
    .sort((a, b) => a.draft.sort - b.draft.sort || a.index - b.index)
    .map((item) => item.draft);

export const newDraft = (): PropertyDraft => ({
  uid: nextUid(),
  saved: false,
  sort: SORT_STEP,
  code: '',
  name: '',
  type: ListPropertyType.String,
  tab: '',
  required: false,
  multiple: false,
  options: [],
  formats: [],
  maxSizeMb: null,
  maxWidth: null,
  maxHeight: null,
  columns: null,
  headers: [],
  linkList: '',
});

/**
 * Правка черновика. Сменили тип — чужие настройки сбрасываем сразу: у строки нет
 * ни вариантов, ни форматов, и в окне они не должны висеть невидимо. Таблица
 * получает размер по умолчанию, чтобы не начинаться с пустоты.
 */
export const patchDraft = (draft: PropertyDraft, patch: Partial<PropertyDraft>): PropertyDraft => {
  const next = { ...draft, ...patch };
  const isTable = hasTableConfig(next.type);
  const isFile = hasFileRules(next.type);
  const isImage = hasResolution(next.type);
  const columns = isTable ? next.columns ?? DEFAULT_TABLE_COLUMNS : null;
  return {
    ...next,
    multiple: supportsMultiple(next.type) && next.multiple,
    options: hasOptions(next.type) ? next.options : [],
    // Файл и изображение делят форматы и вес; при переходе между ними форматы
    // изображения могли бы не подойти файлу и наоборот — их проще задать заново
    formats: isFile && next.type === draft.type ? next.formats : [],
    maxSizeMb: isFile ? next.maxSizeMb : null,
    maxWidth: isImage ? next.maxWidth : null,
    maxHeight: isImage ? next.maxHeight : null,
    columns,
    // Заголовков ровно по числу столбцов: столбец убрали — убрали и его заголовок
    headers: isTable ? tableHeaders(next.headers, columns ?? 0) : [],
    linkList: hasLinkSource(next.type) ? next.linkList : '',
  };
};

/** Заголовки столбцов ровно по их числу: лишние отрезаны, недостающие пусты. */
export const tableHeaders = (headers: string[], columns: number): string[] =>
  Array.from({ length: columns }, (_, index) => headers[index] ?? '');

/** Вариант списка после правки одного поля. */
export const setOption = (
  options: ListOptionDto[],
  index: number,
  patch: Partial<ListOptionDto>,
): ListOptionDto[] => options.map((option, at) => (at === index ? { ...option, ...patch } : option));

/**
 * Новый вариант списка. Код не придумывают заново: он собирается из названия
 * так же, как код вкладки, — но остаётся видимым и правится, потому что по нему
 * значение уходит на сайт.
 */
export const optionCodeFromName = (name: string, taken: string[]): string =>
  uniqueSlug(name, taken, 'option');

/** Ключ вкладки «Свойства» — общей, на неё попадают свойства без своей вкладки. */
export const DEFAULT_TAB_KEY = '';

/** Ошибка в свойствах (первая) или null. */
export function validateDrafts(drafts: PropertyDraft[]): string | null {
  const codes = new Set<string>();

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    const title = draft.name.trim() || `№${index + 1}`;
    const code = draft.code.trim();

    if (!draft.name.trim()) return `У свойства ${title} нет названия`;
    if (!code) return `У свойства «${title}» нет кода`;
    if (!PROPERTY_CODE_PATTERN.test(code)) {
      return `Код свойства «${title}»: строчные латинские буквы, цифры и подчёркивание, начиная с буквы`;
    }
    if (codes.has(code)) return `Код «${code}» уже занят другим свойством`;
    codes.add(code);

    if (hasOptions(draft.type)) {
      const invalid = optionsError(draft.options, title);
      if (invalid) return invalid;
    }
    if (hasTableConfig(draft.type) && !inRange(draft.columns, TABLE_MAX_COLUMNS)) {
      return `Таблица «${title}»: от 1 до ${TABLE_MAX_COLUMNS} столбцов`;
    }
  }

  return null;
}

/** Ошибка в вариантах списка: пустых нет, коды не повторяются. */
function optionsError(options: ListOptionDto[], title: string): string | null {
  const filled = options.filter((option) => option.code.trim() || option.name.trim());
  if (filled.length === 0) return `У свойства «${title}» (Список) нет вариантов`;

  const codes = new Set<string>();
  for (const option of filled) {
    if (!option.name.trim()) return `У варианта «${option.code}» свойства «${title}» нет названия`;
    if (!option.code.trim()) return `У варианта «${option.name}» свойства «${title}» нет кода`;
    if (codes.has(option.code.trim())) {
      return `Код варианта «${option.code.trim()}» в свойстве «${title}» повторяется`;
    }
    codes.add(option.code.trim());
  }
  return null;
}

const inRange = (value: number | null, max: number): boolean =>
  value !== null && Number.isInteger(value) && value >= 1 && value <= max;

/**
 * Предупреждение перед сохранением: что станет со значениями записей. Сохранять
 * не мешает.
 *
 * Значения теряет не только удаление свойства: сервер читает их по текущим
 * настройкам и молча отбрасывает всё, что под них не подходит. Поэтому здесь
 * перечислены **все** правки, после которых значение уже не прочитать.
 */
export function droppedValuesWarning(
  saved: ListPropertyDto[],
  drafts: PropertyDraft[],
): string | null {
  const next = new Map(drafts.map((draft) => [draft.code.trim(), draft]));
  const warnings = saved
    .map((property) => {
      const draft = next.get(property.code);
      const title = `«${property.name}»`;

      if (!draft) return `${title}: свойство удалено`;
      if (draft.type !== property.type) return `${title}: сменился тип`;

      // Было несколько значений, станет одно — остальные не прочитать
      if (property.multiple && !draft.multiple) return `${title}: останется одно значение`;

      if (property.type === ListPropertyType.List) {
        const codes = new Set(draft.options.map((option) => option.code.trim()));
        const gone = property.options.filter((option) => !codes.has(option.code));
        if (gone.length > 0) {
          return `${title}: пропали варианты ${gone.map((option) => option.name).join(', ')}`;
        }
      }

      if (
        property.type === ListPropertyType.ContentLink &&
        draft.linkList &&
        draft.linkList !== property.linkList
      ) {
        return `${title}: ссылки на записи других списков`;
      }

      if (
        property.type === ListPropertyType.Table &&
        (draft.columns ?? 0) < (property.columns ?? 0)
      ) {
        return `${title}: лишние столбцы таблицы`;
      }

      return null;
    })
    .filter((warning): warning is string => warning !== null);

  if (warnings.length === 0) return null;
  return `У записей пропадут значения — ${warnings.join('; ')}`;
}

/** Код вкладки по её `uid` — внутри окна свойства ссылаются на вкладки по uid. */
const tabCodeByUid = (tabs: TabDraft[]): Map<string, string> =>
  new Map(tabs.map((tab) => [tab.uid, tab.code.trim()]));

/** Свойство без служебных полей черновика, пробелы по краям срезаны. */
const toPropertyPayload = (
  { uid: _uid, saved: _saved, sort: _sort, ...property }: PropertyDraft,
  codeByUid: Map<string, string>,
): ListPropertyDto => ({
  ...property,
  tab: codeByUid.get(property.tab) ?? DEFAULT_TAB_KEY,
  code: property.code.trim(),
  name: property.name.trim(),
  options: property.options
    .map((option) => ({ code: option.code.trim(), name: option.name.trim() }))
    .filter((option) => option.code && option.name),
  headers: property.headers.map((header) => header.trim()),
  formats: property.formats.map((format) => format.trim().replace(/^\.+/, '').toLowerCase()).filter(Boolean),
});

/** Черновики → тело запроса. Дерево у раздела со своей вложенностью не отправляется. */
export const toSettingsPayload = (
  values: EditorValues,
  drafts: PropertyDraft[],
  tabs: TabDraft[],
  ownNesting: boolean,
): UpdateListSettingsDto => ({
  name: String(values.name ?? '').trim(),
  code: String(values.code ?? '').trim(),
  isTree: ownNesting ? false : values.isTree !== false,
  useCode: values.codeMode !== CodeMode.None,
  codeRequired: values.codeMode === CodeMode.Required || values.codeMode === CodeMode.Unique,
  codeUnique: values.codeMode === CodeMode.Unique,
  useRecordMeta: values.useRecordMeta === true,
  tabs: tabs.map(toTabPayload),
  // Порядок в массиве и есть порядок полей в карточке — сортируем перед отправкой
  properties: sortedDrafts(drafts).map((draft) => toPropertyPayload(draft, tabCodeByUid(tabs))),
});

/** Свойство в одном порядке ключей: JSONB с сервера отдаёт их как ему удобно. */
const comparable = (property: ListPropertyDto) => ({
  code: property.code,
  name: property.name,
  type: property.type,
  tab: property.tab,
  required: property.required,
  multiple: property.multiple,
  options: property.options,
  formats: property.formats,
  maxSizeMb: property.maxSizeMb,
  maxWidth: property.maxWidth,
  maxHeight: property.maxHeight,
  columns: property.columns,
  // Пустая шапка с сервера приходит как [], а в окне живёт как ['', ''] —
  // сравнивать нужно то, что реально уйдёт в базу
  headers: property.headers.some((header) => header.trim()) ? property.headers : [],
  linkList: property.linkList,
});

/** Свойства в окне отличаются от сохранённых — есть что терять при закрытии. */
export const draftsChanged = (
  saved: ListPropertyDto[],
  drafts: PropertyDraft[],
  tabs: TabDraft[],
): boolean => {
  const codeByUid = tabCodeByUid(tabs);
  return (
    JSON.stringify(saved.map(comparable)) !==
    JSON.stringify(
      sortedDrafts(drafts).map((draft) => comparable(toPropertyPayload(draft, codeByUid))),
    )
  );
};
