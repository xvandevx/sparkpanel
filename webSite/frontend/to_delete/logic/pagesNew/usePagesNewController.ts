import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import type { NewEditorController } from '../contentEditorNew';
import { pagesNewColumns, toPagesNewRows } from './pagesNewTable';

/**
 * Раздел «Страницы» для нового редактора: тот же стор `state.pages`,
 * что и у старого экрана, — данные загружает `useLoadPages`.
 */
export const usePagesNewController = (): NewEditorController => {
  const { items, loading, error } = useSelector((state: RootState) => state.pages);

  const rows = useMemo(() => toPagesNewRows(items), [items]);

  return {
    title: 'Страницы',
    columns: pagesNewColumns,
    rows,
    isLoading: loading,
    error,
  };
};
