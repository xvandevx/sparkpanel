import { api, HistoryPageDto, HistoryRecordDto } from '../src/api/client';

/**
 * Сетевой слой журнала изменений. Журнал — одна сущность на всю панель:
 * правки всех разделов лежат в общей таблице и читаются одним маршрутом по
 * ключу списка (`pages`, `infoblock-elements.3`). Своего журнала у раздела нет.
 */

/** История одной записи: ключ записи тот же, что в адресе админки (`2`, `element-7`). */
export const fetchRecordHistory = async (
  listKey: string,
  recordId: string,
): Promise<HistoryRecordDto[]> => {
  const { data } = await api.history.historyControllerFindRecord(listKey, recordId);
  return data;
};

/** Общий журнал списка, страницами. */
export const fetchListJournal = async (
  listKey: string,
  limit: number,
  offset: number,
): Promise<HistoryPageDto> => {
  const { data } = await api.history.historyControllerFindJournal(listKey, limit, offset);
  return data;
};

/**
 * Очистить журнал: весь журнал списка или, с ключом записи, историю одной записи.
 * Возвращает, сколько строк стёрто.
 */
export const clearHistory = async (listKey: string, recordId?: string): Promise<number> => {
  const { data } =
    recordId === undefined
      ? await api.history.historyControllerClearJournal(listKey)
      : await api.history.historyControllerClearRecord(listKey, recordId);
  return data.deleted;
};
