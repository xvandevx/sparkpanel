import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadListThunk,
  removeListItemThunk,
  saveListItemThunk,
} from '../../redux/action-creaters/lists';
import { emptyListEntry } from '../../redux/reducers/listsReducer';
import { nestRows, type ListParents } from '../listSettings';
import { ROOT_PATH, rowPaths } from './recordPath';
import type { EditorApi } from './editorApi';
import type { EditorRow } from './types';

/**
 * Данные списка для редактора: читает свою ячейку общего среза, при первом
 * показе грузит её через Api раздела и отдаёт сохранение с удалением.
 *
 * Раньше это писал каждый раздел — хук-загрузчик, хук-действий и свой срез;
 * теперь раздел не знает про redux вообще, он отдаёт только Api.
 *
 * `isNested` — у раздела своя вложенность (`list.isNested`): строки
 * собираются в дерево по `parentId` самой записи. Это общая механика, и раздел
 * её не пишет: у дерева из настроек списка она ровно такая же, только родители
 * берутся из значений свойств.
 */
export function useListData(api: EditorApi, isNested = false) {
  const dispatch = useDispatch<AppDispatch>();
  const entry = useSelector((state: RootState) => state.lists[api.key]) ?? emptyListEntry;

  const { loaded, loading } = entry;

  useEffect(() => {
    // Список уже в сторе — перечитывать нечего: после сохранения он обновляется сам
    if (loaded || loading) return;
    dispatch(loadListThunk(api));
    // Следим за ключом, а не за объектом Api: раздел может собирать его на каждый рендер
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api.key, dispatch, loaded, loading]);

  const save = useCallback(
    (id: string | null, payload: Record<string, unknown>) =>
      dispatch(saveListItemThunk(api, id, payload)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api.key, dispatch],
  );

  const remove = useCallback(
    (id: string) => dispatch(removeListItemThunk(api, id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api.key, dispatch],
  );

  /**
   * Записи списка строками таблицы: ключ строки — ключ записи, как в адресе,
   * поэтому и он, и родитель приводятся к строке.
   */
  const rows = useMemo<EditorRow[]>(() => {
    const flat = entry.items.map((item) => {
      const record = item as Record<string, unknown>;
      // «Сортировка» — то же, что `position` записи: в карточке и в колонке
      // поле называется понятнее, в базе остаётся как есть
      const row: EditorRow = { ...record, id: String(record.id), sort: record.position };
      if (record.parentId !== undefined && record.parentId !== null) {
        row.parentId = String(record.parentId);
      }
      return row;
    });

    if (!isNested) return flat;

    const parents: ListParents = Object.fromEntries(
      flat.map((row) => [row.id, (row.parentId as string | null | undefined) ?? null]),
    );
    const tree = nestRows(flat, parents);

    // Адрес записи — цепочка кодов от корня; считаем один раз на весь список
    const paths = rowPaths(tree);
    const withPath = (list: EditorRow[]): EditorRow[] =>
      list.map((row) => ({
        ...row,
        path: paths.get(row.id) ?? ROOT_PATH,
        ...(row.children?.length ? { children: withPath(row.children) } : {}),
      }));

    return withPath(tree);
  }, [entry.items, isNested]);

  return {
    /** Записи как их отдал Api: по ним раздел строит строки и описание полей */
    items: entry.items,
    rows,
    isLoading: entry.loading,
    isSaving: entry.saving,
    error: entry.error,
    save,
    remove: api.remove ? remove : undefined,
  };
}
