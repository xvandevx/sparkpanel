import { linkKeyOf, linkOf, withId } from '../../../logic/contentLinks';
import { domainValuesOf, type DomainValue } from '../../../logic/domains';
import { fileItemsOf, type FileRules } from '../../../logic/files';
import type { EditorRow } from '../table';
import { tablePayload, tableRows } from './tableValue';

/**
 * Запись карточки: чем её описывают, что набирают в шторке и что уходит
 * на сервер. Держим отдельно от самой шторки — описание полей читает раздел,
 * черновик правит шторка, тело запроса собирает она же.
 */

/** Как показать поле. Типов ровно столько, сколько нужно сегодня. */
export const FieldType = {
  String: 'string',
  /**
   * Символьный код записи: строка с кнопкой «из названия». Его добавляет сам
   * редактор по настройкам списка
   */
  Code: 'code',
  Number: 'number',
  Text: 'text',
  /** Секрет: набирают скрыто, значение — обычная строка */
  Password: 'password',
  Switch: 'switch',
  /** Выбор из вариантов: их задаёт свойство списка */
  List: 'list',
  /** Родитель в дереве: выбор из записей того же списка. Его добавляет сам редактор */
  Parent: 'parent',
  /** Файл из раздела «Файлы»: значение — номер файла, загружают прямо из поля */
  File: 'file',
  /** То же, но только изображения — и показываются они превью */
  Image: 'image',
  /** Запись другого списка: страница, роль, форма. Значение — `{ listKey, recordId }` */
  Link: 'link',
  /** Таблица: столбцы из настроек свойства, строки добавляют в карточке */
  Table: 'table',
  /** Разметка: визуальный редактор и режим «HTML»; значение — строка HTML */
  Html: 'html',
} as const;

export type FieldTypeValue = (typeof FieldType)[keyof typeof FieldType];

/** Описание одного поля карточки. Ключ в `EditorFields` — поле записи. */
export interface EditorField {
  /** Подпись поля */
  name: string;
  /** Не задан — строка */
  type?: FieldTypeValue;
  /** Пояснение под полем */
  note?: string;
  /** Без значения запись не сохранить */
  isRequired?: boolean;
  /** Значений несколько: у списка — несколько вариантов, у строки — по одному в строке */
  isMultiple?: boolean;
  /**
   * Значение своё на домен: общее для всех доменов плюс переопределения
   * для отдельных доменов и поддоменов (`logic/domains/domainValues.ts`)
   */
  isMultiDomain?: boolean;
  /** Варианты поля-списка; значение поля — номер варианта */
  options?: { id: number; code: string; name: string }[];
  /**
   * Куда загружать файл и какой подходит — у полей «Файл» и «Изображение»,
   * а у «HTML» — для картинок в тексте. Загруженное ляжет в раздел свойства
   * в «Файлах»: его сервер знает по номеру.
   */
  upload?: { propertyId: number } & FileRules;
  /** Откуда выбирать запись у поля-привязки: ключ списка; пусто — любая запись панели */
  linkList?: string;
  /** Размер и шапка поля-таблицы: столбцы и их заголовки из настроек свойства */
  table?: { columns: number; headers: string[] };
  /**
   * Поле показываем, но не правим: так ведут себя свойства, подбиратель
   * которых ещё не вернулся из `to_delete/`. Значение такого поля карточка
   * не трогает — читает из записи и отдаёт обратно как есть, иначе сохранение
   * стёрло бы то, чего она не умеет показать.
   */
  isReadOnly?: boolean;
  /**
   * Значение пишет внешняя система (свойство «Внешний источник»): поле видно
   * со значением, но закрыто. Изменённым оно не станет — и на сервер не уйдёт
   */
  isExternal?: boolean;
}

/** Поля карточки: поле записи → как его показать. Порядок ключей — порядок полей. */
export type EditorFields = Record<string, EditorField>;

/**
 * Поля по умолчанию: то, что есть у записи любого списка. Раздел со своими
 * полями берёт отсюда и «Сортировку» — она есть у всех списков, кроме файлов.
 */
export const standardFields: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: { name: 'Активность', type: FieldType.Switch },
  sort: {
    name: 'Сортировка',
    type: FieldType.Number,
    note: 'Чем меньше число, тем выше запись в списке. Пусто — у новой записи 500',
  },
};

/**
 * Пустая запись: ключа у неё ещё нет, он появится после сохранения. Пустой
 * ключ и значит «новая» — отдельного флага для этого заводить незачем.
 */
export const newRecord = (): EditorRow => ({ id: '' });

/** Набранное в шторке: поле записи → значение. */
export type RecordDraft = Record<string, unknown>;

/**
 * Поля карточки целиком: свои у раздела плюс те, что добавляет сам редактор
 * из настроек списка — символьный код записи и родитель у дерева. Раздел
 * про них не знает: это настройки, их меняют в «Настройках списка».
 */
export const cardFields = (
  fields: EditorFields,
  settings: { isTree: boolean; useCode: boolean; codeRequired: boolean },
): EditorFields => {
  // Название идёт первым, за ним код и родитель, дальше — поля раздела
  const { name, ...rest } = fields;
  return {
    ...(name === undefined ? {} : { name }),
    ...(settings.useCode
      ? {
          code: {
            name: 'Код',
            type: FieldType.Code,
            note: 'Символьный код записи: по нему её находит сайт',
            isRequired: settings.codeRequired,
          },
        }
      : {}),
    ...(settings.isTree ? { parentId: { name: 'Родитель', type: FieldType.Parent } } : {}),
    ...rest,
  };
};

/**
 * Запись — в черновик шторки: значения приводятся к тому, что ждёт поле.
 * Берёт и запись списка, и значения её свойств: и там, и там поле → значение.
 */
export const draftOf = (
  record: Record<string, unknown> | null,
  fields: EditorFields,
): RecordDraft =>
  Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, draftValueOf(record?.[key], field)]),
  );

/**
 * Значение одного поля — к тому, что ждёт его ввод. Без значения — пустое
 * нужного вида: так заводят новую строку домена в мультидоменном поле.
 */
export const draftValueOf = (value: unknown, field: EditorField): unknown => {
  // Чего карточка не умеет показать, того она и не трогает
  if (field.isReadOnly === true) return value ?? null;
  // Мультидоменное — строка на домен, у каждой обычное значение поля.
  // Первая строка — для всех доменов: её не убирают и домен ей не выбирают
  if (field.isMultiDomain === true) {
    const single = singleOf(field);
    return domainValuesOf(value).map(
      (item): DomainValue => ({ ...item, value: draftValueOf(item.value, single) }),
    );
  }
  if (field.type === FieldType.Switch) return value !== false;
  // Родителя держим ключом записи — строкой, как и остальные ключи у редактора;
  // пустая строка это «верхний уровень»: у `Select` вариант со значением `null`
  // antd не принимает
  if (field.type === FieldType.Parent) return value === null || value === undefined ? '' : String(value);
  if (field.type === FieldType.Number) {
    const number = Number(value);
    return value === null || value === undefined || value === '' || Number.isNaN(number)
      ? null
      : number;
  }
  if (isFileField(field)) {
    // Файл — номером своего или адресом внешнего: так он и уходит на сервер
    const items = fileItemsOf(value);
    return field.isMultiple === true ? items : (items[0] ?? null);
  }
  if (field.type === FieldType.List) {
    // Вариант списка держим номером: так он и уходит на сервер
    const ids = listOf(value).map(Number).filter((id) => Number.isInteger(id) && id > 0);
    return field.isMultiple === true ? ids : (ids[0] ?? null);
  }
  if (field.type === FieldType.Table) return tableRows(value, field.table?.columns ?? 1);
  if (field.type === FieldType.Link) {
    // Привязку держим ключом «список/запись»: так её выбирают в `Select`,
    // а в объект она превращается обратно только в теле запроса
    const keys = listOf(value).flatMap((item) => {
      const key = linkKeyOf(item);
      return key === null ? [] : [key];
    });
    return field.isMultiple === true ? keys : (keys[0] ?? null);
  }
  // У множественного свойства значений несколько — и в черновике их столько же:
  // набирают их отдельными полями, а не одним текстом через перевод строки
  if (field.isMultiple === true) {
    return listOf(value).map((item) => (item === null || item === undefined ? '' : String(item)));
  }
  return value === null || value === undefined ? '' : String(value);
};

/** То же поле, но с одним значением на все домены: им правят каждую строку домена. */
export const singleOf = (field: EditorField): EditorField => ({ ...field, isMultiDomain: false });

/** Поле выбирает файл: его значение — номер файла или адрес внешнего, а не текст. */
export const isFileField = (field: EditorField): boolean =>
  field.type === FieldType.File || field.type === FieldType.Image;

/** Значение свойства приходит и одиночным, и массивом — считаем его списком. */
const listOf = (value: unknown): unknown[] =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Черновик — в тело запроса. Пустая строка это «нет значения», а не пустой текст. */
export const payloadOf = (draft: RecordDraft, fields: EditorFields): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(fields).map(([key, field]) => [key, fieldPayload(key, field, draft[key])]),
  );

const fieldPayload = (key: string, field: EditorField, value: unknown): unknown => {
  // Значение, которое карточка не показывала, возвращаем серверу как было
  if (field.isReadOnly === true) return value ?? null;
  if (field.isMultiDomain === true) {
    const single = singleOf(field);
    const [common, ...domains] = (value as DomainValue[] | undefined) ?? [];
    // Строку без доменов или без значения ещё не дописали — это не значение
    const own = domains
      .filter((item) => (item.domainIds ?? []).length > 0)
      .map((item) => ({ domainIds: item.domainIds, value: fieldPayload(key, single, item.value) }))
      .filter((item) => !isEmptyPayload(item.value));
    // Исключения уходят как выбраны, даже у доменов с уникальным значением: убери
    // их отсюда — и после сохранения домен молча пропал бы из «кроме»
    const except = common?.exceptDomainIds ?? [];
    return [
      // Общее уходит всегда, даже пустым: от него отсчитываются остальные
      {
        domainIds: null,
        value: fieldPayload(key, single, common?.value),
        ...(except.length > 0 ? { exceptDomainIds: except } : {}),
      },
      ...own,
    ];
  }
  if (field.type === FieldType.Switch) return value === true;
  if (field.type === FieldType.Parent) return parentKey(value);
  if (field.type === FieldType.Number) return value ?? null;
  if (field.type === FieldType.List || isFileField(field)) {
    return field.isMultiple === true ? (value ?? []) : (value ?? null);
  }
  if (field.type === FieldType.Table) return tablePayload(value, field.table?.columns ?? 1);
  if (field.type === FieldType.Link) {
    const links = listOf(value).map((item) => linkOf(String(item)));
    return field.isMultiple === true ? links : (links[0] ?? null);
  }
  if (field.isMultiple === true) {
    // Пустые поля не значения: их добавляют, пока думают
    return (Array.isArray(value) ? (value as unknown[]) : [])
      .map((item) => String(item ?? '').trim())
      .filter((item) => item !== '');
  }
  const text = String(value ?? '').trim();
  // Код пустым и приходит, и уходит: у корневой страницы его нет
  return text === '' && !field.isRequired && key !== 'code' ? null : text;
};

const isEmptyPayload = (value: unknown): boolean =>
  value === null || value === '' || (Array.isArray(value) && value.length === 0);

/** Ключ родителя из черновика: пустая строка и есть «верхний уровень». */
export const parentKey = (value: unknown): string | null =>
  value === null || value === undefined || value === '' ? null : String(value);

/** Чего не хватает для сохранения; пусто — можно отправлять. */
export const draftError = (
  draft: RecordDraft,
  fields: EditorFields,
  { rows, id, isCodeUnique }: { rows: EditorRow[]; id: string | null; isCodeUnique: boolean },
): string | null => {
  const empty = Object.entries(fields).find(
    ([key, field]) =>
      field.isRequired === true &&
      // У мультидоменного обязательно общее значение: домены без своего берут его
      isEmptyValue(
        field.isMultiDomain === true ? (draft[key] as DomainValue[] | undefined)?.[0]?.value : draft[key],
      ),
  );
  if (empty) return `Заполните поле «${empty[1].name}»`;

  const code = String(draft.code ?? '').trim();
  if (isCodeUnique && code !== '' && rows.some((row) => row.id !== id && String(row.code ?? '') === code)) {
    return 'Запись с таким кодом в списке уже есть';
  }
  return null;
};

/** Значения нет: пустое поле, пустой список (и таблица из пустых ячеек) или ничего. */
const isEmptyValue = (value: unknown): boolean =>
  Array.isArray(value) ? value.every(isEmptyValue) : String(value ?? '').trim() === '';

/** Вариант выбора родителя — узел дерева, так его ждёт `TreeSelect`. */
export interface ParentOption {
  value: string;
  title: string;
  children?: ParentOption[];
}

/**
 * Куда можно перенести запись — деревом, как записи лежат в таблице: любая
 * запись списка, кроме неё самой и того, что лежит внутри неё, — иначе ветка
 * замкнётся сама на себя и пропадёт из дерева. Плюс «корень»: запись верхнего
 * уровня.
 *
 * Есть предел вложенности — нет и родителей, под которыми ветка записи
 * вышла бы за него: сервер такой перенос всё равно отклонит. Отброшенная
 * запись уносит с собой и потомков: они лежат внутри неё или ещё глубже.
 *
 * Записи только для показа (`isReadOnly`) родителем не бывают: их собирает
 * сервер, и в базе их нет.
 */
export const parentOptions = (
  rows: EditorRow[],
  id: string | null,
  maxDepth: number | null = null,
): ParentOption[] => {
  const closed = id === null ? new Set<string>() : withChildren(rows, id);
  const height = id === null ? 1 : branchHeight(rows, id);
  const fits = (row: EditorRow) => maxDepth === null || depthOf(rows, row.id) + height <= maxDepth;

  const shown = rows.filter((row) => row.isReadOnly !== true && !closed.has(row.id) && fits(row));
  const nodes = new Map<string, ParentOption>(
    shown.map((row) => [row.id, { value: row.id, title: withId(String(row.name ?? row.id), row.id) }]),
  );
  const roots: ParentOption[] = [];
  for (const row of shown) {
    const node = nodes.get(row.id)!;
    const parentId = parentOf(row);
    const parent = parentId === null ? undefined : nodes.get(parentId);
    // Родитель не пришёл — запись встаёт на верхний уровень, а не пропадает
    if (parent) parent.children = [...(parent.children ?? []), node];
    else roots.push(node);
  }
  // Пустая строка, а не `null`: вариант со значением `null` antd не принимает
  return [{ value: '', title: '— верхний уровень —' }, ...roots];
};

const parentOf = (row: EditorRow | undefined): string | null =>
  row === undefined || row.parentId === null || row.parentId === undefined ? null : String(row.parentId);

/** Уровень записи: у корневой 1. Кольцо в родителях не зацикливает. */
const depthOf = (rows: EditorRow[], id: string): number => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const seen = new Set([id]);
  let depth = 1;
  let parent = parentOf(byId.get(id));
  while (parent !== null && !seen.has(parent)) {
    seen.add(parent);
    depth += 1;
    parent = parentOf(byId.get(parent));
  }
  return depth;
};

/** Сколько уровней занимает ветка записи вместе с ней самой: у записи без детей 1. */
const branchHeight = (rows: EditorRow[], id: string): number =>
  Math.max(...Array.from(withChildren(rows, id)).map((child) => depthOf(rows, child))) -
  depthOf(rows, id) +
  1;

/** Запись и всё её потомство: по ним переносить нельзя. */
const withChildren = (rows: EditorRow[], id: string): Set<string> => {
  const closed = new Set([id]);
  // Список плоский, поэтому идём по нему, пока находится новое потомство
  let isFound = true;
  while (isFound) {
    isFound = false;
    for (const row of rows) {
      const parentId = row.parentId === null || row.parentId === undefined ? null : String(row.parentId);
      if (parentId !== null && closed.has(parentId) && !closed.has(row.id)) {
        closed.add(row.id);
        isFound = true;
      }
    }
  }
  return closed;
};

/**
 * Что из значений действительно поменяли. На сервер уходит только это:
 * свойство, которого в теле нет, он не трогает — а значит карточка не может
 * ни стереть то, чего не показывала, ни переписать чужую правку, сделанную,
 * пока шторка была открыта.
 */
export const changedValues = (
  draft: RecordDraft,
  saved: Record<string, unknown>,
  fields: EditorFields,
): Record<string, unknown> => {
  const fresh = payloadOf(draft, fields);
  const before = payloadOf(draftOf(saved, fields), fields);
  return Object.fromEntries(
    Object.entries(fresh).filter(
      ([key, value]) => JSON.stringify(value ?? null) !== JSON.stringify(before[key] ?? null),
    ),
  );
};
