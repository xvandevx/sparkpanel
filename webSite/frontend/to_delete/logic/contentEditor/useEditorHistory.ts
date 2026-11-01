import { useCallback, useEffect, useState } from 'react';
import type { EditorHistoryPage, EditorHistoryRecord } from './types';

const DEFAULT_PAGE_SIZE = 20;

/** Откуда брать историю записи и как подписывать её поля. */
export interface EditorHistorySource {
  /** Чью историю показываем; null — записи ещё нет */
  recordId: string | null;
  /** Загрузка истории; не задана — раздел историю не ведёт */
  load?: (id: string) => Promise<EditorHistoryRecord[]>;
  /** Подписи полей: `meta.title` → «Мета заголовок» */
  fieldLabels: Record<string, string>;
}

/** История одной записи: грузится при открытии вкладки «История». */
export function useRecordHistory({ recordId, load }: EditorHistorySource) {
  const [records, setRecords] = useState<EditorHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!recordId || !load) return;
    setIsLoading(true);
    setError(null);
    try {
      setRecords(await load(recordId));
    } catch {
      setError('Не удалось загрузить историю изменений');
      setRecords([]);
    } finally {
      setIsLoading(false);
    }
  }, [load, recordId]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { records, isLoading, error, reload };
}

/** Общий журнал раздела: страницами, с сохранением позиции при обновлении. */
export function useHistoryJournal(
  load?: (limit: number, offset: number) => Promise<EditorHistoryPage>,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [records, setRecords] = useState<EditorHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!load) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await load(pageSize, (page - 1) * pageSize);
      setRecords(data.items);
      setTotal(data.total);
    } catch {
      setError('Не удалось загрузить журнал изменений');
      setRecords([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [load, page, pageSize]);

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  /** Смена размера страницы возвращает на первую: иначе можно уехать за конец списка. */
  const changePage = useCallback(
    (nextPage: number, nextPageSize: number) => {
      if (nextPageSize !== pageSize) {
        setPageSize(nextPageSize);
        setPage(1);
        return;
      }
      setPage(nextPage);
    },
    [pageSize],
  );

  return { records, total, page, pageSize, isLoading, error, reload, changePage };
}
