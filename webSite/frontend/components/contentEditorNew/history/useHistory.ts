import { useEffect, useMemo, useState } from 'react';
import { App } from 'antd';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../redux';
import {
  clearEditorHistoryThunk,
  loadEditorJournalThunk,
  loadEditorListThunk,
  loadEditorRecordHistoryThunk,
  type EditorHistoryRecord,
} from '../../../redux/action-creaters/contentEditorNew';
import { apiErrorMessage } from '../../../redux/apiError';
import { emptyNewEditorList } from '../../../redux/reducers/contentEditorNewReducer';
import type { EditorFields } from '../drawer';
import { editorRows, type EditorRow } from '../table';
import type { EditorListApi } from '../useLoadEditor';
import { historyLabels } from './historyFormat';

/**
 * Журнал изменений глазами редактора. Журнал — не данные списка: он растёт
 * с каждой правкой, поэтому в стор не кладётся, а читается при каждом показе.
 * Держит его тот, кто показывает, и забывает вместе с собой.
 */

/** Строк журнала на страницу. */
export const JOURNAL_PAGE_SIZE = 20;

/**
 * Показывать ли историю: журнал списка включён в его настройках, и раздел
 * не убрал историю сам (`isHistoryHidden` — так журнал прячут от тех, кому
 * сервер его не отдаст). Пока настройки не пришли — не показываем.
 */
export function useIsHistoryShown(listKey: string, isHistoryHidden: boolean): boolean {
  const isEnabled = useSelector(
    (state: RootState) => state.contentEditorNew[listKey]?.settings?.isHistoryEnabled === true,
  );
  return isEnabled && !isHistoryHidden;
}

/** Подписи полей журнала — по полям раздела и свойствам записей списка. */
export function useHistoryLabels(listKey: string, fields: EditorFields): Record<string, string> {
  const properties = useSelector(
    (state: RootState) => (state.contentEditorNew[listKey] ?? emptyNewEditorList).properties,
  );
  return useMemo(() => historyLabels(fields, properties), [fields, properties]);
}

/**
 * Записи списка по ключу — чтобы из журнала открыть запись в карточке.
 * Журнал шире таблицы: удалённой записи здесь нет, и открыть её нечем.
 * У таблицы только страница, а в журнале правки всех записей, — поэтому
 * весь список журнал догружает сам, при каждом показе.
 */
export function useListRows(listKey: string, api: EditorListApi): Map<string, EditorRow> {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector(
    (state: RootState) => (state.contentEditorNew[listKey] ?? emptyNewEditorList).items,
  );
  useEffect(() => {
    dispatch(loadEditorListThunk(listKey, api.list));
    // Следим за кодом списка, а не за объектом Api: раздел собирает его на каждый рендер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, listKey]);
  return useMemo(() => new Map(editorRows(items).map((row) => [row.id, row])), [items]);
}

/** Общий журнал списка, страницами: страница — в состоянии экрана, строки — с сервера. */
export function useJournal(listKey: string) {
  const dispatch = useDispatch<AppDispatch>();
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<EditorHistoryRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Счётчик перечитываний: после очистки журнал читается заново
  const [version, setVersion] = useState(0);

  useEffect(() => {
    // Перелистнули раньше, чем пришёл ответ, — прежняя страница уже ни о чём
    let isCurrent = true;
    setIsLoading(true);
    dispatch(loadEditorJournalThunk(listKey, JOURNAL_PAGE_SIZE, (page - 1) * JOURNAL_PAGE_SIZE))
      .then((loaded) => {
        if (!isCurrent) return;
        setItems(loaded.items);
        setTotal(loaded.total);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (isCurrent) setError(apiErrorMessage(reason, 'Не удалось загрузить историю изменений'));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [dispatch, listKey, page, version]);

  /** Перечитать с первой страницы: после очистки прежней страницы может не быть. */
  const reload = () => {
    setPage(1);
    setVersion((value) => value + 1);
  };

  return { items, total, page, setPage, isLoading, error, reload };
}

/** История одной записи — от свежих правок к старым. */
export function useRecordHistory(listKey: string, recordId: string) {
  const dispatch = useDispatch<AppDispatch>();
  const [items, setItems] = useState<EditorHistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    dispatch(loadEditorRecordHistoryThunk(listKey, recordId))
      .then((loaded) => {
        if (!isCurrent) return;
        setItems(loaded);
        setError(null);
      })
      .catch((reason: unknown) => {
        if (isCurrent) setError(apiErrorMessage(reason, 'Не удалось загрузить историю записи'));
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false);
      });
    return () => {
      isCurrent = false;
    };
  }, [dispatch, listKey, recordId]);

  return { items, isLoading, error };
}

/**
 * Очистка журнала: весь журнал списка или, с ключом записи, история одной
 * записи. Спрашиваем подтверждение — вернуть стёртое нечем. После очистки
 * зовём `onCleared`: показанный журнал перечитывается.
 */
export function useClearHistory(
  listKey: string,
  recordId: string | undefined,
  onCleared: () => void,
) {
  const dispatch = useDispatch<AppDispatch>();
  const { message, modal } = App.useApp();
  const [isClearing, setIsClearing] = useState(false);

  const clear = () =>
    modal.confirm({
      title: recordId === undefined ? 'Очистить историю списка?' : 'Очистить историю записи?',
      content:
        recordId === undefined
          ? 'Из журнала пропадут все правки записей этого списка. Вернуть их будет нечем.'
          : 'Из журнала пропадут все правки этой записи. Вернуть их будет нечем.',
      okText: 'Очистить',
      okButtonProps: { danger: true },
      cancelText: 'Отмена',
      onOk: async () => {
        setIsClearing(true);
        const error = await dispatch(clearEditorHistoryThunk(listKey, recordId));
        setIsClearing(false);
        if (error) {
          message.error(error);
          return;
        }
        message.success('История очищена');
        onCleared();
      },
    });

  return { isClearing, clear };
}
