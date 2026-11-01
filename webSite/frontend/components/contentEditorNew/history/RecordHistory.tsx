import type { EditorFields } from '../drawer';
import HistoryTable from './HistoryTable';
import { useHistoryLabels, useRecordHistory } from './useHistory';

/**
 * История одной записи — вкладка карточки. Правки самой записи и значений
 * её свойств лежат в журнале под одним ключом, поэтому видны здесь вместе.
 * Читается при каждом показе вкладки: запись могли только что сохранить.
 * Кнопка очистки стоит в строке вкладок карточки, а не здесь; после очистки
 * карточка пересобирает вкладку, и история читается заново.
 */
export default function RecordHistory({
  listKey,
  recordId,
  fields,
}: {
  listKey: string;
  recordId: string;
  /** Поля карточки — ими подписываются поля в журнале */
  fields: EditorFields;
}) {
  const { items, isLoading, error } = useRecordHistory(listKey, recordId);
  const labels = useHistoryLabels(listKey, fields);

  return <HistoryTable records={items} labels={labels} isLoading={isLoading} error={error} />;
}
