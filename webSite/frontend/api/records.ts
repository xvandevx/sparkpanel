import { api, RecordsPageDto } from '../src/api/client';
import type {
  RecordsControllerPageOrderEnum,
  RecordsControllerPagePageSizeEnum,
} from '../src/api/client';

/**
 * Страница записей любого списка — для таблицы редактора контента. Маршрут
 * один на все списки: поиск, фильтр, сортировку и страницу ведёт сервер.
 * Писать записи — по-прежнему маршрутами своих разделов.
 */

/** Что просят у списка: как его ждёт сервер. */
export interface RecordsPageQuery {
  page: number;
  pageSize: number;
  search: string;
  /** Поля, по которым ищет строка поиска (ID — всегда) */
  searchIn: string[];
  sort: string | null;
  order: 'asc' | 'desc';
  /** Таблица — дерево: страница — записи верхнего уровня с ветками */
  isTree: boolean;
  /** Только записи с черновиком — вид «Черновики» */
  isDraft: boolean;
  /** Поля фильтра, в которых что-то выбрано: `{ key, kind, … }` */
  filters: unknown[];
}

export const fetchRecordsPage = async (
  listKey: string,
  query: RecordsPageQuery,
): Promise<RecordsPageDto> => {
  const { data } = await api.infoblockRecords.recordsControllerPage(
    listKey,
    query.page,
    query.pageSize as RecordsControllerPagePageSizeEnum,
    query.search || undefined,
    query.searchIn.length > 0 ? query.searchIn.join(',') : undefined,
    query.sort ?? undefined,
    query.order as RecordsControllerPageOrderEnum,
    query.isTree,
    query.isDraft || undefined,
    query.filters.length > 0 ? JSON.stringify(query.filters) : undefined,
  );
  return data;
};
