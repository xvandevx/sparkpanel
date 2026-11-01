import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../../redux';
import {
  resetEditorColumnsThunk,
  saveEditorColumnsThunk,
} from '../../../../redux/action-creaters/contentEditorNew';
import {
  emptyNewEditorList,
  type EditorTableColumn,
} from '../../../../redux/reducers/contentEditorNewReducer';
import type { EditorColumns } from '../ContentEditorTable';
import { availableColumns, shownColumns } from './columnView';

/**
 * Вид таблицы списка: что из колонок раздела и свойств записей видно и как.
 * Его читают таблица (рисует `shown`) и шторка колонок (правит, сохраняет,
 * сбрасывает). Вид лежит в ячейке списка — грузит его `useLoadEditor`.
 */
export function useColumns(listKey: string, columns: EditorColumns) {
  const dispatch = useDispatch<AppDispatch>();
  const { properties, columns: saved } =
    useSelector((state: RootState) => state.contentEditorNew[listKey]) ?? emptyNewEditorList;

  const available = useMemo(() => availableColumns(columns, properties), [columns, properties]);
  const shown = useMemo(() => shownColumns(available, saved ?? []), [available, saved]);

  /** Сохраняет вид целиком; возвращает текст ошибки или null. */
  const save = useCallback(
    (view: EditorTableColumn[]) => dispatch(saveEditorColumnsThunk(listKey, view)),
    [dispatch, listKey],
  );

  /** Стирает сохранённый вид; возвращает текст ошибки или null. */
  const reset = useCallback(() => dispatch(resetEditorColumnsThunk(listKey)), [dispatch, listKey]);

  return {
    available,
    shown,
    /** Сохранённый вид; пусто — не настраивали, null — ещё не пришёл */
    saved,
    /** Таблицу настраивали: есть что сбрасывать */
    isCustom: saved !== null && saved.length > 0,
    save,
    reset,
  };
}
