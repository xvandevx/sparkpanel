import { fetchListJournal, fetchRecordHistory } from '../../api/history';
import { toEditorHistoryPage, toEditorHistoryRecord } from './historyDto';
import type { EditorHistoryPage, EditorHistoryRecord } from './types';

/**
 * Журнал изменений для редактора контента. Раздел о нём не знает ничего:
 * история — отдельная сущность, общая на всю панель, и читается она по ключу
 * списка, тому же, по которому лежат записи и настройки.
 *
 * Поэтому загрузчики не приходят из Api раздела, а собираются здесь — одни
 * и те же для всех списков.
 */
export interface ListHistory {
  loadRecord: (recordId: string) => Promise<EditorHistoryRecord[]>;
  loadJournal: (limit: number, offset: number) => Promise<EditorHistoryPage>;
}

export const listHistory = (listKey: string): ListHistory => ({
  loadRecord: async (recordId) =>
    (await fetchRecordHistory(listKey, recordId)).map(toEditorHistoryRecord),
  loadJournal: async (limit, offset) =>
    toEditorHistoryPage(await fetchListJournal(listKey, limit, offset)),
});
