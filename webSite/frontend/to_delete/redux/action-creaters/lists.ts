import type { Dispatch } from 'redux';
import type { EditorApi } from '../../logic/contentEditor/editorApi';
import { apiErrorMessage } from '../apiError';
import {
  LIST_ERROR,
  LIST_REQUEST,
  LIST_SAVED,
  LIST_SAVING,
  LIST_SUCCESS,
  type ListsAction,
} from '../reducers/listsReducer';

/**
 * Загрузка и запись любого списка редактора контента — один набор thunk-ов
 * на все разделы. Куда ходить, знает только `EditorApi` раздела; thunk остаётся
 * единственным местом, откуда дёргается слой `api/`.
 */

/**
 * Сквозной номер запроса. Нужен вложенным спискам: ушли со списка записей
 * одного инфоблока на другой — ответ по первому приходит позже, и без номера
 * он лёг бы поверх свежего.
 */
let requestSeq = 0;
const nextRequest = (): number => (requestSeq += 1);

export const loadListThunk =
  (api: EditorApi) =>
  async (dispatch: Dispatch<ListsAction>): Promise<void> => {
    const request = nextRequest();
    dispatch({ type: LIST_REQUEST, payload: { key: api.key, request } });
    try {
      dispatch({ type: LIST_SUCCESS, payload: { key: api.key, request, items: await api.list() } });
    } catch (error) {
      dispatch({
        type: LIST_ERROR,
        payload: { key: api.key, error: apiErrorMessage(error, 'Не удалось загрузить список') },
      });
    }
  };

/**
 * Сохранение записи: создание отличается от правки только отсутствием ключа.
 * Возвращает ключ записи (у новой — выданный сервером) или null при ошибке.
 *
 * После записи список перечитывается целиком: сохранение меняет не только саму
 * запись — у соседей едет порядок, а у дерева и вложенность.
 */
export const saveListItemThunk =
  (api: EditorApi, id: string | null, payload: Record<string, unknown>) =>
  async (dispatch: Dispatch<ListsAction>): Promise<string | null> => {
    dispatch({ type: LIST_SAVING, payload: { key: api.key } });
    try {
      const saved = id ? await api.update(id, payload) : await api.create(payload);
      dispatch({ type: LIST_SAVED, payload: { key: api.key } });

      const request = nextRequest();
      dispatch({ type: LIST_SUCCESS, payload: { key: api.key, request, items: await api.list() } });

      return recordId(saved) ?? id;
    } catch (error) {
      dispatch({
        type: LIST_ERROR,
        payload: { key: api.key, error: apiErrorMessage(error, 'Не удалось сохранить запись') },
      });
      return null;
    }
  };

/** Удаление записи; true — удалилась. Список после этого перечитывается. */
export const removeListItemThunk =
  (api: EditorApi, id: string) =>
  async (dispatch: Dispatch<ListsAction>): Promise<boolean> => {
    if (!api.remove) return false;
    dispatch({ type: LIST_SAVING, payload: { key: api.key } });
    try {
      await api.remove(id);
      dispatch({ type: LIST_SAVED, payload: { key: api.key } });

      const request = nextRequest();
      dispatch({ type: LIST_SUCCESS, payload: { key: api.key, request, items: await api.list() } });

      return true;
    } catch (error) {
      dispatch({
        type: LIST_ERROR,
        payload: { key: api.key, error: apiErrorMessage(error, 'Не удалось удалить запись') },
      });
      return false;
    }
  };

/**
 * Ключ сохранённой записи из ответа. Api раздела отдаёт свой DTO, и ключ в нём
 * лежит в `id` — у разделов с приставкой (`form-1`) его туда кладёт сам Api.
 */
const recordId = (saved: unknown): string | null => {
  if (!saved || typeof saved !== 'object') return null;
  const id = (saved as Record<string, unknown>).id;
  return id === undefined || id === null ? null : String(id);
};
