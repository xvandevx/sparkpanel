import type { RecordsPageQuery } from '../../api/records';

/**
 * Данные нового редактора контента — по ключу списка (`pages`, `content`).
 * Срез свой, рядом со старым `lists`: новый редактор собирается с нуля и по
 * частям, поэтому в ячейке лежит ровно то, что он уже умеет показывать.
 *
 * Что в ячейке — решает редактор, а не раздел: раздел отдаёт только Api.
 */

export const NEW_EDITOR_REQUEST = 'NEW_EDITOR_REQUEST';
export const NEW_EDITOR_SETTINGS = 'NEW_EDITOR_SETTINGS';
export const NEW_EDITOR_SETTINGS_REQUEST = 'NEW_EDITOR_SETTINGS_REQUEST';
export const NEW_EDITOR_TABS = 'NEW_EDITOR_TABS';
export const NEW_EDITOR_COLUMNS = 'NEW_EDITOR_COLUMNS';
export const NEW_EDITOR_FILTERS = 'NEW_EDITOR_FILTERS';
export const NEW_EDITOR_PROPERTIES = 'NEW_EDITOR_PROPERTIES';
export const NEW_EDITOR_RECORD_VALUES = 'NEW_EDITOR_RECORD_VALUES';
export const NEW_EDITOR_RECORD_DRAFT = 'NEW_EDITOR_RECORD_DRAFT';
export const NEW_EDITOR_SETTINGS_SAVING = 'NEW_EDITOR_SETTINGS_SAVING';
export const NEW_EDITOR_SUCCESS = 'NEW_EDITOR_SUCCESS';
export const NEW_EDITOR_ERROR = 'NEW_EDITOR_ERROR';
export const NEW_EDITOR_PAGE_REQUEST = 'NEW_EDITOR_PAGE_REQUEST';
export const NEW_EDITOR_PAGE = 'NEW_EDITOR_PAGE';
export const NEW_EDITOR_PAGE_ERROR = 'NEW_EDITOR_PAGE_ERROR';
export const NEW_EDITOR_RESTORED = 'NEW_EDITOR_RESTORED';

/**
 * Свойство записей списка: код — ключ значения, остальное зависит от типа
 * и редактору списка не важно.
 */
export interface EditorProperty {
  /** Номер свойства: им адресуются значения записей */
  id: number;
  code: string;
  name: string;
  type: string;
  [key: string]: unknown;
}

/**
 * Значения свойств записей списка: ключ записи → **номер свойства** → значение.
 * Номер, а не код: код у свойства правят, и значения, подписанные кодом,
 * после переименования пришлось бы искать заново.
 */
export type EditorValues = Record<string, Record<string, unknown>>;

/**
 * Черновик записи: что в ней изменено относительно опубликованного и ещё
 * не записано. Поля — как их принимает `PATCH` раздела, свойства — по номеру,
 * как в `values`. Опубликованное лежит в странице и `values`, черновик — рядом:
 * карточка показывает обе версии.
 */
export interface EditorDraft {
  fields: Record<string, unknown>;
  values: Record<string, unknown>;
  /** Запись заведена черновиком — на сайте её ещё нет */
  isNew: boolean;
  authorEmail: string;
  updatedAt: string;
}

/** Вкладка карточки записи: свойства ссылаются на неё кодом. */
export interface EditorTab {
  /** Номер вкладки: по нему её переименовывают и удаляют */
  id: number;
  code: string;
  name: string;
}

/**
 * Колонка таблицы, как её настроил пользователь: поле записи (`name`) или
 * свойство (`property-12`) и ширина. Лежат только видимые и по порядку:
 * чего нет, того в таблице не видно.
 */
export interface EditorTableColumn {
  key: string;
  /** Ширина, px; null — как задал раздел */
  width: number | null;
}

/**
 * Настройки списка: имя, код, устройство и свойства записей. Хранятся они
 * в одной таблице на всю панель, а различаются кодом списка, — поэтому и здесь
 * лежат в ячейке этого кода, рядом с самими записями.
 */
export interface EditorListSettings {
  name: string | null;
  code: string | null;
  useCode: boolean;
  codeRequired: boolean;
  codeUnique: boolean;
  /**
   * Журнал ведётся — включён в настройках списка: правки пишутся в историю,
   * и редактор её показывает. У списка без журнала всегда false
   */
  isHistoryEnabled: boolean;
  /** Черновики включены: правки сохраняются черновиком и публикуются отдельно */
  isDraftEnabled: boolean;
  /**
   * Уровней вложенности; он же решает, дерево ли список: 1 — плоский,
   * больше — дерево, null — дерево без ограничения
   */
  maxDepth: number | null;
}

/**
 * Страница таблицы: записи, которые она показывает, и запрос, которым их
 * получили. Запрос лежит здесь же — после правки записи страница перечитывается
 * тем же запросом, кто бы правку ни сделал.
 */
export interface EditorPage {
  /** Записи страницы; у дерева — записи верхнего уровня, за каждой её ветка */
  items: unknown[];
  /** Сколько всего: у дерева — записей верхнего уровня */
  total: number;
  query: RecordsPageQuery;
  isLoading: boolean;
  error: string | null;
  /** Номер последнего запроса: отставший ответ не ложится поверх свежего */
  request: number;
}

/** Одна ячейка: записи списка и состояние их загрузки. */
export interface NewEditorList {
  /**
   * Весь список, как его отдал Api раздела. Таблица его не читает — у неё
   * страница (`page`); весь список грузят те, кому он нужен целиком: выбор
   * родителя в карточке дерева, меню типов контента, выбор хранилища
   */
  items: unknown[];
  isLoading: boolean;
  /** Список уже приходил — при перерисовке не запрашиваем заново */
  isLoaded: boolean;
  error: string | null;
  /** Настройки списка; null — ещё не пришли */
  settings: EditorListSettings | null;
  /**
   * Вкладки карточки и свойства записей. Отдельно от настроек: на сервере это
   * свои сущности (`list_tabs`, `list_properties`), и пользуются ими не только
   * настройки — по свойствам строится и карточка записи.
   */
  tabs: EditorTab[];
  properties: EditorProperty[];
  /**
   * Значения свойств записей — по ключу записи. Приходят со страницей таблицы
   * (только её записей) и по одной — карточке, открытой не со страницы.
   * Ключа записи нет — её значения ещё не приходили; пустой объект — их нет
   */
  values: EditorValues;
  /**
   * Черновики записей — по ключу записи, как и значения. Ключа нет — ещё
   * не знаем; null — черновика у записи нет
   */
  drafts: Record<string, EditorDraft | null>;
  /** Черновиков во всём списке — у вида «Черновики» */
  draftsCount: number;
  /**
   * Вид таблицы — у каждого пользователя свой. Пусто — таблицу не настраивали,
   * она показывает колонки раздела; null — вид ещё не пришёл.
   */
  columns: EditorTableColumn[] | null;
  /**
   * Набор полей фильтра — ключи колонок (`name`, `property-12`) по порядку.
   * Один на список для всех, кто его видит. Пусто — фильтра нет; null — ещё
   * не пришёл. Что в полях выбрано, в сторе нет: это в адресе страницы.
   */
  filterKeys: string[] | null;
  /**
   * Номер последнего ушедшего запроса списка. Нужен вложенным спискам: ушли
   * с записей одного инфоблока на другой — ответ по первому приходит позже,
   * и без номера он лёг бы поверх свежего.
   */
  request: number;
  /** Страница таблицы; null — таблица её ещё не просила */
  page: EditorPage | null;
  /** Запрос настроек уже ушёл — второй не нужен */
  isSettingsLoading: boolean;
  isSettingsSaving: boolean;
}

export type ContentEditorNewState = Record<string, NewEditorList>;

export const emptyNewEditorList: NewEditorList = {
  items: [],
  isLoading: false,
  isLoaded: false,
  error: null,
  settings: null,
  tabs: [],
  properties: [],
  values: {},
  drafts: {},
  draftsCount: 0,
  columns: null,
  filterKeys: null,
  request: 0,
  page: null,
  isSettingsLoading: false,
  isSettingsSaving: false,
};

export type ContentEditorNewAction =
  | { type: typeof NEW_EDITOR_REQUEST; payload: { key: string; request: number } }
  | { type: typeof NEW_EDITOR_SUCCESS; payload: { key: string; request: number; items: unknown[] } }
  | { type: typeof NEW_EDITOR_ERROR; payload: { key: string; error: string } }
  | {
      type: typeof NEW_EDITOR_PAGE_REQUEST;
      payload: { key: string; request: number; query: RecordsPageQuery };
    }
  | {
      type: typeof NEW_EDITOR_PAGE;
      payload: {
        key: string;
        request: number;
        items: unknown[];
        total: number;
        values: EditorValues;
        drafts: Record<string, EditorDraft | null>;
        draftsCount: number;
      };
    }
  | { type: typeof NEW_EDITOR_PAGE_ERROR; payload: { key: string; request: number; error: string } }
  | { type: typeof NEW_EDITOR_SETTINGS_REQUEST; payload: { key: string; isLoading: boolean } }
  | { type: typeof NEW_EDITOR_TABS; payload: { key: string; tabs: EditorTab[] } }
  | { type: typeof NEW_EDITOR_COLUMNS; payload: { key: string; columns: EditorTableColumn[] } }
  | { type: typeof NEW_EDITOR_FILTERS; payload: { key: string; filterKeys: string[] } }
  | {
      type: typeof NEW_EDITOR_PROPERTIES;
      payload: { key: string; properties: EditorProperty[] };
    }
  | {
      type: typeof NEW_EDITOR_RECORD_VALUES;
      payload: { key: string; recordId: string; values: Record<string, unknown> };
    }
  | {
      type: typeof NEW_EDITOR_RECORD_DRAFT;
      payload: { key: string; recordId: string; draft: EditorDraft | null };
    }
  | {
      type: typeof NEW_EDITOR_SETTINGS;
      payload: { key: string; settings: EditorListSettings };
    }
  | { type: typeof NEW_EDITOR_SETTINGS_SAVING; payload: { key: string; isSaving: boolean } }
  | { type: typeof NEW_EDITOR_RESTORED; payload: { key: string } };

/** Правка одной ячейки: остальные списки остаются как были. */
const patch = (
  state: ContentEditorNewState,
  key: string,
  change: Partial<NewEditorList>,
): ContentEditorNewState => ({
  ...state,
  [key]: { ...(state[key] ?? emptyNewEditorList), ...change },
});

export const contentEditorNewReducer = (
  state: ContentEditorNewState = {},
  action: ContentEditorNewAction,
): ContentEditorNewState => {
  switch (action.type) {
    case NEW_EDITOR_REQUEST:
      return patch(state, action.payload.key, {
        isLoading: true,
        error: null,
        request: action.payload.request,
      });

    case NEW_EDITOR_SUCCESS: {
      const { key, request, items } = action.payload;
      // Ответ отстал от более свежего запроса — он уже ни о чём
      if (request < (state[key]?.request ?? 0)) return state;
      return patch(state, key, { items, isLoading: false, isLoaded: true, error: null });
    }

    case NEW_EDITOR_ERROR:
      return patch(state, action.payload.key, {
        isLoading: false,
        error: action.payload.error,
      });

    case NEW_EDITOR_PAGE_REQUEST: {
      const { key, request, query } = action.payload;
      const page = state[key]?.page;
      // Пока идёт запрос, таблица показывает прежнюю страницу
      return patch(state, key, {
        page: {
          items: page?.items ?? [],
          total: page?.total ?? 0,
          query,
          isLoading: true,
          error: null,
          request,
        },
      });
    }

    case NEW_EDITOR_PAGE: {
      const { key, request, items, total, values, drafts, draftsCount } = action.payload;
      const entry = state[key];
      const page = entry?.page;
      // Ответ отстал от более свежего запроса — он уже ни о чём
      if (!entry || !page || request < page.request) return state;
      return patch(state, key, {
        page: { ...page, items, total, isLoading: false, error: null },
        // Значения записей страницы — поверх известных: карточка записи
        // с прежней страницы, открытая из журнала, своих не теряет
        values: { ...entry.values, ...values },
        drafts: { ...entry.drafts, ...drafts },
        draftsCount,
      });
    }

    case NEW_EDITOR_PAGE_ERROR: {
      const { key, request, error } = action.payload;
      const page = state[key]?.page;
      if (!page || request < page.request) return state;
      return patch(state, key, { page: { ...page, isLoading: false, error } });
    }

    case NEW_EDITOR_RECORD_VALUES:
      // Одна запись, а не весь список: у соседей значения свои
      return patch(state, action.payload.key, {
        values: {
          ...(state[action.payload.key] ?? emptyNewEditorList).values,
          [action.payload.recordId]: action.payload.values,
        },
      });

    case NEW_EDITOR_RECORD_DRAFT:
      return patch(state, action.payload.key, {
        drafts: {
          ...(state[action.payload.key] ?? emptyNewEditorList).drafts,
          [action.payload.recordId]: action.payload.draft,
        },
      });

    case NEW_EDITOR_SETTINGS_REQUEST:
      return patch(state, action.payload.key, { isSettingsLoading: action.payload.isLoading });

    case NEW_EDITOR_SETTINGS:
      return patch(state, action.payload.key, {
        settings: action.payload.settings,
        isSettingsLoading: false,
        isSettingsSaving: false,
      });

    case NEW_EDITOR_TABS:
      return patch(state, action.payload.key, { tabs: action.payload.tabs });

    case NEW_EDITOR_COLUMNS:
      return patch(state, action.payload.key, { columns: action.payload.columns });

    case NEW_EDITOR_FILTERS:
      return patch(state, action.payload.key, { filterKeys: action.payload.filterKeys });

    case NEW_EDITOR_PROPERTIES:
      return patch(state, action.payload.key, { properties: action.payload.properties });

    case NEW_EDITOR_SETTINGS_SAVING:
      return patch(state, action.payload.key, { isSettingsSaving: action.payload.isSaving });

    case NEW_EDITOR_RESTORED:
      // Список вернули из копии: известные значения и черновики — о прежнем
      // списке, их перечитают страница и карточки
      return patch(state, action.payload.key, { values: {}, drafts: {} });

    default:
      return state;
  }
};
