/**
 * Контракт универсального редактора контента (таблица + шторка).
 * Редактор ничего не знает о разделе, в котором работает: раздел отдаёт ему
 * записи, описание полей и функции сохранения — через контроллер.
 *
 * Описание самой формы (поля, группы, значения) — общее для всех экранов
 * и живёт в `logic/editorForm/`: такие формы есть и вне редактора списков.
 */
import type { EditorFieldDef, EditorFieldGroup, EditorValues } from '../editorForm';

export type {
  EditorFieldDef,
  EditorFieldGroup,
  EditorFormValue,
  EditorSelectOption,
  EditorValues,
  EditorVariable,
} from '../editorForm';
export { EditorFieldType } from '../editorForm';

/** Вкладка шторки: несколько групп полей под одним ярлыком. */
export interface EditorTabDef {
  key: string;
  label: string;
  groups: EditorFieldGroup[];
}

/** Запись раздела: идентификатор плюс всё, что нужно колонкам таблицы. */
export interface EditorRecord {
  id: string;
  [key: string]: unknown;
}

/** Строка таблицы: запись и её вложенные строки (дерево собирает раздел). */
export interface EditorRow extends EditorRecord {
  children?: EditorRow[];
}

/** Как колонка выглядит. Разметку рисует таблица — logic-слой JSX не возвращает. */
export const EditorColumnVariant = {
  Text: 'text',
  /** Моноширинный текст: коды и адреса */
  Code: 'code',
  /** Цветная метка */
  Tag: 'tag',
  /** Да/Нет меткой */
  Flag: 'flag',
  /** Превью по адресу из значения: картинка медиатеки */
  Image: 'image',
} as const;

export type EditorColumnVariant =
  (typeof EditorColumnVariant)[keyof typeof EditorColumnVariant];

export interface EditorColumnDef {
  key: string;
  title: string;
  /** Ключ значения в записи; не задан — текст берётся из `value` */
  dataIndex?: string;
  width?: number;
  variant?: EditorColumnVariant;
  /** Текст ячейки, если он не совпадает со значением поля */
  value?: (record: EditorRow) => string;
  /** Цвет метки для `Tag` */
  color?: (record: EditorRow) => string;
  /** Вторая строка ячейки: пояснение мелким шрифтом */
  hint?: (record: EditorRow) => string | null;
}

/**
 * Дополнительное действие строки — переход к тому, что у записи внутри.
 * Нужно разделам, где запись сама открывает список: у инфоблока это его
 * записи, и вести к ним должна строка, а не отдельная панель рядом.
 *
 * Разметку действие не несёт: иконку редактор выбирает сам по её имени.
 */
export const EditorRowActionIcon = {
  /** Войти внутрь записи: к её собственному списку */
  Enter: 'enter',
  /** Открыть то, на что запись ссылается, вне панели: файл медиатеки */
  Open: 'open',
} as const;

export type EditorRowActionIcon =
  (typeof EditorRowActionIcon)[keyof typeof EditorRowActionIcon];

export interface EditorRowActionDef {
  icon: EditorRowActionIcon;
  /** Подсказка на кнопке */
  title: (record: EditorRow) => string;
  /** Действие есть не у всякой строки: у раздела внутри списка нет */
  visible?: (record: EditorRow) => boolean;
  run: (record: EditorRow) => void;
}

/**
 * Настройки списка: имя, код и свойства записей. Раздел только называет ключ
 * своего списка — всё остальное (кнопка «Настройки», вкладка «Свойства»,
 * сохранение значений) редактор делает сам.
 */
export interface EditorListSettingsDef {
  /**
   * У каких записей есть свойства; не задан — у всех. В «Веб-формах» они
   * у форм, а не у их полей: две сущности в одном списке.
   */
  appliesTo?: (values: EditorValues) => boolean;
}

/** Действие в истории изменений. */
export type EditorHistoryAction = 'create' | 'update' | 'delete';

export interface EditorHistoryChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface EditorHistoryRecord {
  id: string;
  entityId: string;
  entityCode: string | null;
  entityName: string | null;
  action: EditorHistoryAction;
  changes: EditorHistoryChange[];
  snapshot: Record<string, unknown> | null;
  authorName: string | null;
  authorEmail: string | null;
  authorIp: string | null;
  createdAt: string;
}

export interface EditorHistoryPage {
  items: EditorHistoryRecord[];
  total: number;
}

/**
 * Что раздел отдаёт редактору: **Api** (где лежат записи) и **описание**
 * (как они выглядят). Больше ничего — загрузку, состояние, значения формы,
 * сохранение, удаление и историю ведёт сам редактор.
 *
 * Описание разбито на группы по смыслу и приходит отдельными пропсами:
 * `<ContentEditor api={…} list={…} form={…} />` — в экране раздела видно, что
 * именно он отдаёт.
 */

/**
 * Из чего состоит карточка записи. Значения формы редактор читает по описанию
 * полей (`recordValues`), поэтому своих `valuesOf`/`emptyValues` у раздела нет;
 * они остаются только там, где значение не лежит в записи напрямую —
 * например, адрес страницы, который считается по всему дереву.
 */
export interface EditorFormDef<T = unknown> {
  /**
   * Свои поля карточки — сверх стандартных. Стандартные (идентификатор,
   * название, код, адрес, родитель, сортировка, активность) добавляет редактор:
   * они есть у записи любого списка.
   *
   * Функцией — если описание зависит от самого списка.
   */
  fields?: EditorFieldDef[] | ((items: T[]) => EditorFieldDef[]);
  /**
   * Свои вкладки карточки — сверх «Параметров» со стандартными полями.
   * Не заданы — в карточке только «Параметры».
   */
  tabs?: EditorTabDef[];
  /** Значения сверх полей записи: вычисляемые и собранные из других данных */
  derive?: (record: EditorRecord, items: T[]) => EditorValues;
  /** Значения сверх умолчаний у новой записи: адрес будущей страницы, порядок среди соседей */
  deriveNew?: (parentId: string | null, items: T[]) => EditorValues;
}

/** Что можно сделать со строкой сверх сохранения и удаления. */
export interface EditorActionsDef {
  /** Можно ли удалить запись (основной домен — нельзя) */
  canRemove?: (record: EditorRow) => boolean;
  /** Переход к тому, что у записи внутри; не задан — такой кнопки в строках нет */
  rowAction?: EditorRowActionDef;
}

/** Правила журнала; подписи полей общие и живут в пропсе `labels`. */
export interface EditorHistoryDef {
  /**
   * Можно ли открыть запись журнала по её ключу. Журнал бывает шире таблицы:
   * в «Инфоблоках» он один на разделы, инфоблоки и записи, а на экране всегда
   * только часть из них. Не задан — открывается любая.
   */
  canOpenRecord?: (entityId: string) => boolean;
}

/**
 * Собранный редактор: описание раздела плюс то, что редактор добавил сам —
 * строки из Api, состояние загрузки, значения формы, сохранение и история.
 *
 * Раздел это не строит: внутренняя сборка `ContentEditor`, по которой дальше
 * работают `useListProperties` и `useEditorState`.
 */
export interface ContentEditorController {
  list: {
    /** Заголовок над таблицей: из подписей или из имени списка в настройках */
    title: string;
    /** Подпись кнопки добавления */
    addLabel: string;
    columns: EditorColumnDef[];
    rows: EditorRow[];
    isLoading: boolean;
    isSaving: boolean;
    /** Ошибка последней операции; редактор показывает её сообщением */
    error: string | null;
    /** Раздел только на просмотр: кнопок «добавить» и «сохранить» нет */
    isReadOnly?: boolean;
    /** Записи вкладываются друг в друга: в строках есть «добавить внутрь» */
    isNested?: boolean;
    /**
     * Удаление записи не уносит вложенные — они поднимаются на уровень выше.
     * Так ведёт себя дерево из настроек списка.
     */
    isRemoveKeepingChildren?: boolean;
  };
  form: {
    // Поля и значения здесь уже разрешены: слоты раздела (`fields` функцией,
    // `derive`, `deriveNew`) редактор применил до сборки
    fields: EditorFieldDef[];
    tabs: EditorTabDef[];
    valuesOf: (record: EditorRecord) => EditorValues;
    emptyValues: (parentId: string | null) => EditorValues;
  };
  actions: EditorActionsDef & {
    /** Сохранение; возвращает ключ записи (у новой — созданной) или null при ошибке */
    save: (params: { id: string | null; values: EditorValues }) => Promise<string | null>;
    /** Удаление; true — удалилось. Не задано — Api раздела удалять не умеет */
    remove?: (record: EditorRow) => Promise<boolean>;
  };
  history?: EditorHistoryDef & {
    loadRecord?: (id: string) => Promise<EditorHistoryRecord[]>;
    loadJournal?: (limit: number, offset: number) => Promise<EditorHistoryPage>;
  };
  /** Подписи полей: стандартные плюс свои у раздела */
  labels: Record<string, string>;
  /** Ключ списка — из Api раздела */
  listKey: string;
  settings?: EditorListSettingsDef;
}
