/**
 * Данные всех списков редактора контента — одним срезом, по ключу списка
 * (`content`, `infoblock-elements.3`). Раньше у каждого раздела был свой срез,
 * одинаковый с точностью до имени; при десяти разделах это десять копий одного
 * кода, которые приходилось править вместе.
 *
 * Что лежит в ячейке, решает не раздел, а редактор: он один умеет грузить,
 * сохранять и удалять через Api раздела.
 */

export const LIST_REQUEST = 'LIST_REQUEST';
export const LIST_SUCCESS = 'LIST_SUCCESS';
export const LIST_ERROR = 'LIST_ERROR';
export const LIST_SAVING = 'LIST_SAVING';
export const LIST_SAVED = 'LIST_SAVED';

/** Одна ячейка: список записей и его состояние. */
export interface ListEntry {
  items: unknown[];
  loading: boolean;
  saving: boolean;
  /** Список уже приходил — повторно при перерисовке не запрашиваем */
  loaded: boolean;
  error: string | null;
  /**
   * Номер последнего ушедшего запроса. Нужен вложенным спискам: переключили
   * инфоблок — ответ по прежнему приходит позже и не должен лечь поверх нового.
   */
  request: number;
}

export type ListsState = Record<string, ListEntry>;

export const emptyListEntry: ListEntry = {
  items: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
  request: 0,
};

export type ListsAction =
  | { type: typeof LIST_REQUEST; payload: { key: string; request: number } }
  | { type: typeof LIST_SUCCESS; payload: { key: string; request: number; items: unknown[] } }
  | { type: typeof LIST_ERROR; payload: { key: string; error: string } }
  | { type: typeof LIST_SAVING; payload: { key: string } }
  | { type: typeof LIST_SAVED; payload: { key: string } };

/** Правка одной ячейки: остальные списки остаются как были. */
const patch = (state: ListsState, key: string, change: Partial<ListEntry>): ListsState => ({
  ...state,
  [key]: { ...(state[key] ?? emptyListEntry), ...change },
});

export const listsReducer = (state: ListsState = {}, action: ListsAction): ListsState => {
  switch (action.type) {
    case LIST_REQUEST:
      return patch(state, action.payload.key, {
        loading: true,
        error: null,
        request: action.payload.request,
      });

    case LIST_SUCCESS: {
      const { key, request, items } = action.payload;
      // Ответ отстал от более свежего запроса — он уже ни о чём
      if (request < (state[key]?.request ?? 0)) return state;
      return patch(state, key, { items, loading: false, loaded: true, error: null, request });
    }

    case LIST_ERROR:
      // Ошибка гасит и загрузку, и запись: канал сообщения у них один
      return patch(state, action.payload.key, {
        loading: false,
        saving: false,
        error: action.payload.error,
      });

    case LIST_SAVING:
      return patch(state, action.payload.key, { saving: true, error: null });

    case LIST_SAVED:
      return patch(state, action.payload.key, { saving: false });

    default:
      return state;
  }
};
