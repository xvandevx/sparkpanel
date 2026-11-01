import type { EditorFields } from '../drawer';
import type { EditorRow } from '../table';
import type { EditorListApi } from '../useLoadEditor';
import ClearHistoryButton from './ClearHistoryButton';
import HistoryTable from './HistoryTable';
import { JOURNAL_PAGE_SIZE, useHistoryLabels, useJournal, useListRows } from './useHistory';

/**
 * Журнал изменений списка: все правки его записей, от свежих к старым,
 * страницами. Сам журнал тянет по коду списка — он общий на всю панель;
 * Api раздела нужен только записям, которые из журнала открывают в карточке.
 * Читается при каждом показе: журнал растёт с каждой правкой.
 */
export default function ContentEditorHistory({
  listKey,
  api,
  fields,
  onOpen,
}: {
  listKey: string;
  /** Где лежат записи: из журнала открывают и те, что не на странице таблицы */
  api: EditorListApi;
  /** Поля карточки раздела — ими подписываются поля в журнале */
  fields: EditorFields;
  /** Открыть запись из журнала в карточке */
  onOpen: (row: EditorRow) => void;
}) {
  const { items, total, page, setPage, isLoading, error, reload } = useJournal(listKey);
  const labels = useHistoryLabels(listKey, fields);
  const rows = useListRows(listKey, api);

  return (
    <div className="flex flex-col gap-4">
      {/* Прижата вправо, как кнопки шапки редактора */}
      <div className="flex justify-end">
        <ClearHistoryButton listKey={listKey} isEmpty={total === 0} onCleared={reload} />
      </div>
      <HistoryTable
        records={items}
        labels={labels}
        isLoading={isLoading}
        error={error}
        isRecordShown
        openableIds={new Set(rows.keys())}
        onOpenRecord={(recordId) => {
          const row = rows.get(recordId);
          if (row) onOpen(row);
        }}
        pagination={{
          current: page,
          pageSize: JOURNAL_PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </div>
  );
}
