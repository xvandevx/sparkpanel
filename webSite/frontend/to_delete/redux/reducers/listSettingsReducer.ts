import type { LinkSourceDto, LinkTargetDto, ListSettingsDto } from '../../src/api/client';

export const LIST_SETTINGS_REQUEST = 'LIST_SETTINGS_REQUEST';
export const LIST_SETTINGS_SUCCESS = 'LIST_SETTINGS_SUCCESS';
export const LIST_SETTINGS_ERROR = 'LIST_SETTINGS_ERROR';
export const LIST_SETTINGS_SAVING = 'LIST_SETTINGS_SAVING';
export const LIST_SETTINGS_SAVED = 'LIST_SETTINGS_SAVED';
export const LIST_SETTINGS_SAVE_FAILED = 'LIST_SETTINGS_SAVE_FAILED';
export const PROPERTY_VALUES_SAVING = 'PROPERTY_VALUES_SAVING';
export const PROPERTY_VALUES_SAVED = 'PROPERTY_VALUES_SAVED';
export const PROPERTY_VALUES_SAVE_FAILED = 'PROPERTY_VALUES_SAVE_FAILED';
export const PROPERTY_VALUES_REMOVED = 'PROPERTY_VALUES_REMOVED';
export const LINK_TARGETS_SUCCESS = 'LINK_TARGETS_SUCCESS';
export const LINK_SOURCES_SUCCESS = 'LINK_SOURCES_SUCCESS';

/** Значения свойств записей списка: ключ записи → код свойства → значение. */
export type ListPropertyValues = Record<string, Record<string, unknown>>;

/** Родители записей древовидного списка: ключ записи → ключ родителя. */
export type ListRecordParents = Record<string, string | null>;

/** Настройки одного списка вместе со значениями его записей. */
export interface ListSettingsEntry {
  /** null — ещё не загружены или загрузка провалилась */
  settings: ListSettingsDto | null;
  values: ListPropertyValues;
  /** Родители записей; у плоского списка пусто */
  parents: ListRecordParents;
  loading: boolean;
  /** Настройки и значения пришли: записи можно открывать вместе со свойствами */
  loaded: boolean;
  error: string | null;
}

export interface ListSettingsState {
  /** Ключ списка (`pages`, `infoblock-elements.3`) → его настройки */
  lists: Record<string, ListSettingsEntry>;
  /** Идёт сохранение настроек */
  saving: boolean;
  /** Идёт сохранение значений свойств записи */
  valuesSaving: boolean;
  /** Что можно выбрать в «Привязке к контенту»: страницы, записи, блоки, формы */
  linkTargets: LinkTargetDto[];
  /** Списки, к которым привязку можно ограничить в настройках свойства */
  linkSources: LinkSourceDto[];
}

const initialState: ListSettingsState = {
  lists: {},
  saving: false,
  valuesSaving: false,
  linkTargets: [],
  linkSources: [],
};

export const emptyListSettingsEntry: ListSettingsEntry = {
  settings: null,
  values: {},
  parents: {},
  loading: false,
  loaded: false,
  error: null,
};

export type ListSettingsAction =
  | { type: typeof LIST_SETTINGS_REQUEST; payload: { listKey: string } }
  | {
      type: typeof LIST_SETTINGS_SUCCESS;
      payload: {
        listKey: string;
        settings: ListSettingsDto;
        values: ListPropertyValues;
        parents: ListRecordParents;
      };
    }
  | { type: typeof LIST_SETTINGS_ERROR; payload: { listKey: string; error: string } }
  | { type: typeof LIST_SETTINGS_SAVING }
  | { type: typeof LIST_SETTINGS_SAVE_FAILED }
  | { type: typeof LIST_SETTINGS_SAVED; payload: { listKey: string; settings: ListSettingsDto } }
  | { type: typeof PROPERTY_VALUES_SAVING }
  | { type: typeof PROPERTY_VALUES_SAVE_FAILED }
  | {
      type: typeof PROPERTY_VALUES_SAVED;
      payload: {
        listKey: string;
        recordId: string;
        values: Record<string, unknown>;
        parentId: string | null;
      };
    }
  | { type: typeof PROPERTY_VALUES_REMOVED; payload: { listKey: string; recordIds: string[] } }
  | { type: typeof LINK_TARGETS_SUCCESS; payload: LinkTargetDto[] }
  | { type: typeof LINK_SOURCES_SUCCESS; payload: LinkSourceDto[] };

/** Правка одного списка: остальные остаются как были. */
const patchList = (
  state: ListSettingsState,
  listKey: string,
  patch: (entry: ListSettingsEntry) => Partial<ListSettingsEntry>,
): ListSettingsState => {
  const entry = state.lists[listKey] ?? emptyListSettingsEntry;
  return { ...state, lists: { ...state.lists, [listKey]: { ...entry, ...patch(entry) } } };
};

export const listSettingsReducer = (
  state = initialState,
  action: ListSettingsAction,
): ListSettingsState => {
  switch (action.type) {
    case LIST_SETTINGS_REQUEST:
      return patchList(state, action.payload.listKey, () => ({ loading: true, error: null }));
    case LIST_SETTINGS_SUCCESS:
      return patchList(state, action.payload.listKey, () => ({
        settings: action.payload.settings,
        values: action.payload.values,
        parents: action.payload.parents,
        loading: false,
        loaded: true,
        error: null,
      }));
    case LIST_SETTINGS_ERROR:
      // Провал — тоже «загружено»: список работает без свойств, а не ждёт их вечно
      return patchList(state, action.payload.listKey, () => ({
        settings: null,
        loading: false,
        loaded: true,
        error: action.payload.error,
      }));
    case LIST_SETTINGS_SAVING:
      return { ...state, saving: true };
    case LIST_SETTINGS_SAVE_FAILED:
      return { ...state, saving: false };
    case LIST_SETTINGS_SAVED:
      return {
        ...patchList(state, action.payload.listKey, () => ({ settings: action.payload.settings })),
        saving: false,
      };
    case PROPERTY_VALUES_SAVING:
      return { ...state, valuesSaving: true };
    case PROPERTY_VALUES_SAVE_FAILED:
      return { ...state, valuesSaving: false };
    case PROPERTY_VALUES_SAVED:
      return {
        ...patchList(state, action.payload.listKey, (entry) => ({
          values: { ...entry.values, [action.payload.recordId]: action.payload.values },
          parents: { ...entry.parents, [action.payload.recordId]: action.payload.parentId },
        })),
        valuesSaving: false,
      };
    case PROPERTY_VALUES_REMOVED:
      return patchList(state, action.payload.listKey, (entry) => {
        const values = { ...entry.values };
        for (const recordId of action.payload.recordIds) delete values[recordId];
        return { values };
      });
    case LINK_TARGETS_SUCCESS:
      return { ...state, linkTargets: action.payload };
    case LINK_SOURCES_SUCCESS:
      return { ...state, linkSources: action.payload };
    default:
      return state;
  }
};
