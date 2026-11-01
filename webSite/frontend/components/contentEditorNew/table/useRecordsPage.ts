import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RecordsPageQuery } from '../../../api/records';
import type { AppDispatch, RootState } from '../../../redux';
import { loadEditorPageThunk } from '../../../redux/action-creaters/contentEditorNew';
import { activeFilterEntries, type FilterEntry } from '../filters';

/**
 * Страница таблицы: что показано, сколько всего и что выбрано под таблицей.
 * Поиск, фильтр, сортировку и саму страницу ведёт сервер (`api/records.ts`),
 * здесь только собирается запрос.
 *
 * Номер страницы, её размер и сортировка — состояние таблицы, в адрес они
 * не уходят. Поменялись поиск или фильтр — снова первая страница: на пятой
 * найденного может и не быть.
 */

/** Сколько записей на странице: у дерева — записей верхнего уровня с ветками. */
export const PAGE_SIZES = [20, 50, 100];

/** Пауза перед запросом: поиск и фильтр набирают по букве, а спросить надо один раз. */
const REQUEST_DELAY_MS = 250;

export interface PageSort {
  key: string;
  order: 'asc' | 'desc';
}

/**
 * Порядок по умолчанию — по полю «Сортировка» (у новой записи 500), равные —
 * новые сверху: так только что заведённое видно сразу. У списка без этого
 * поля (файлы) — просто новые сверху: равны все, порядок решает сервер.
 */
export const DEFAULT_SORT: PageSort = { key: 'sort', order: 'asc' };

export function useRecordsPage({
  listKey,
  search,
  searchIn,
  filters,
  isTree,
  isDraft,
  isReady,
}: {
  listKey: string;
  /** Набранное в строке поиска */
  search: string;
  /** Поля, по которым ищет строка поиска */
  searchIn: string[];
  filters: FilterEntry[];
  /** Список — дерево: страница — записи верхнего уровня со всеми ветками */
  isTree: boolean;
  /** Только записи с черновиком — вид «Черновики»: плоским списком, как найденное */
  isDraft: boolean;
  /** Вид таблицы и поля фильтра пришли: до них не ясно, что спрашивать */
  isReady: boolean;
}) {
  const dispatch = useDispatch<AppDispatch>();
  const page = useSelector((state: RootState) => state.contentEditorNew[listKey]?.page ?? null);

  const trimmed = search.trim();
  const active = useMemo(() => activeFilterEntries(filters).map(({ filter }) => filter), [filters]);
  const isFiltered = trimmed !== '' || active.length > 0 || isDraft;

  // Номер страницы помнится вместе с тем, что отбирали: поменяли поиск или
  // фильтр — он сам становится первым, без лишнего запроса за старым номером
  const selection = JSON.stringify([listKey, trimmed, active, isDraft]);
  const [current, setCurrent] = useState({ selection, page: 1 });
  const pageNumber = current.selection === selection ? current.page : 1;
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [sort, setSort] = useState<PageSort>(DEFAULT_SORT);

  const query = useMemo<RecordsPageQuery>(
    () => ({
      page: pageNumber,
      pageSize,
      search: trimmed,
      searchIn,
      sort: sort.key,
      order: sort.order,
      isTree,
      isDraft,
      filters: active,
    }),
    [active, isDraft, isTree, pageNumber, pageSize, searchIn, sort, trimmed],
  );
  const queryKey = JSON.stringify(query);

  useEffect(() => {
    if (!isReady) return;
    const timer = setTimeout(() => dispatch(loadEditorPageThunk(listKey, query)), REQUEST_DELAY_MS);
    return () => clearTimeout(timer);
    // Запрос — по его содержимому, а не по ссылке на объект
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, isReady, listKey, queryKey]);

  // Страница опустела — удалили последние записи на ней: уходим на последнюю,
  // где записи есть, а не показываем «Записей пока нет» при непустом списке
  const lastPage = Math.max(1, Math.ceil((page?.total ?? 0) / pageSize));
  const isPastEnd = page !== null && !page.isLoading && page.items.length === 0 && pageNumber > lastPage;
  useEffect(() => {
    if (isPastEnd) setCurrent({ selection, page: lastPage });
  }, [isPastEnd, lastPage, selection]);

  /** Перелистнули, сменили размер или сортировку — от antd `Table`. */
  const change = (next: { page: number; pageSize: number; sort: PageSort | null }) => {
    // Сортировку сняли — снова порядок по умолчанию, а не порядок раздела
    const nextSort = next.sort ?? DEFAULT_SORT;
    const isPageKept = next.pageSize === pageSize && JSON.stringify(nextSort) === JSON.stringify(sort);
    // Другой размер или порядок — с первой страницы: прежний номер о другом
    setCurrent({ selection, page: isPageKept ? next.page : 1 });
    setPageSize(next.pageSize);
    setSort(nextSort);
  };

  return {
    items: page?.items ?? [],
    total: page?.total ?? 0,
    isLoading: !isReady || page === null || page.isLoading,
    error: page?.error ?? null,
    page: pageNumber,
    pageSize,
    sort,
    isFiltered,
    change,
  };
}
