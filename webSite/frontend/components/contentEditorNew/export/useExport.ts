import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { csvText, saveTextFile } from '../../../logic/csv';
import { linkListOf, linkPaths, useLinkTargets } from '../../../logic/contentLinks';
import { useFiles } from '../../../logic/files';
import { PropertyType } from '../../../logic/listSettings';
import type { AppDispatch, RootState } from '../../../redux';
import { exportEditorRecordsThunk } from '../../../redux/action-creaters/contentEditorNew';
import { editorRows, type EditorColumns } from '../table';
import { useColumns } from '../table/columns';
import { exportFileName, exportTable } from './exportTable';

/**
 * Выгрузка списка в CSV: из каких колонок выбирают, что отмечено по умолчанию
 * и сама выгрузка. Записи — все, что отобрала таблица поиском и фильтром,
 * в её порядке: запрос берётся из ячейки списка (`page.query`), его кладёт
 * туда таблица.
 *
 * Файлы и названия привязок нужны, только если такое свойство отмечено:
 * иначе каждая выгрузка тянула бы всю медиатеку.
 */
export function useExport(listKey: string, columns: EditorColumns, keys: string[]) {
  const dispatch = useDispatch<AppDispatch>();
  const query = useSelector((state: RootState) => state.contentEditorNew[listKey]?.page?.query ?? null);
  const code = useSelector((state: RootState) => state.contentEditorNew[listKey]?.settings?.code ?? null);
  const { available, shown } = useColumns(listKey, columns);

  // В файле колонки стоят в том же порядке, в каком их предлагают, а не в порядке отметок
  const chosen = useMemo(() => available.filter((item) => keys.includes(item.key)), [available, keys]);

  const types = new Set(chosen.map((item) => item.property?.type));
  const isFilesNeeded = types.has(PropertyType.File) || types.has(PropertyType.Image);
  const files = useFiles(isFilesNeeded);
  const links = useLinkTargets(chosen.flatMap((item) => (item.property ? [linkListOf(item.property)] : [])));
  const linkNames = useMemo(() => linkPaths(links.targets), [links.targets]);

  // Не пришли файлы — ячейки файлов вышли бы пустыми; не пришли из-за ошибки —
  // ждать нечего, выгрузка всё равно лучше, чем вечная загрузка
  const isPreparing =
    (isFilesNeeded && !files.isLoaded && files.error === null) || links.isLoading;

  /** Выгружает отмеченное в файл; возвращает, сколько записей ушло. Ошибку — бросает текстом. */
  const run = useCallback(async (): Promise<number> => {
    if (query === null) return 0;
    const { items, values } = await dispatch(exportEditorRecordsThunk(listKey, query));
    const table = exportTable(chosen, editorRows(items), values, {
      fileById: files.fileById,
      linkNames,
    });
    saveTextFile(exportFileName(code || listKey, new Date()), csvText(table), 'text/csv;charset=utf-8');
    return items.length;
  }, [chosen, code, dispatch, files.fileById, linkNames, listKey, query]);

  return {
    available,
    /** Видимые в таблице колонки — они отмечены, когда окно открывают */
    shownKeys: shown.map((item) => item.key),
    /** Таблица отобрала записи поиском или фильтром — выгрузятся только они */
    isFiltered: query !== null && (query.search.trim() !== '' || query.filters.length > 0),
    /** Таблица ещё не спрашивала записи — выгружать нечем */
    isReady: query !== null,
    isPreparing,
    run,
  };
}
