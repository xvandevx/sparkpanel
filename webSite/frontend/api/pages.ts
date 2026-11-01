import { api, CreatePageDto, PageDto, UpdatePageDto } from '../src/api/client';

/**
 * Сетевой слой раздела «Страницы». Единственное место, где дергается
 * сгенерированный клиент. Журнала изменений здесь нет: он общий на всю панель
 * и живёт в `api/history.ts`.
 */

/** Плоский список: дерево собирает фронт по parentId (см. logic/pages/pagesTree.ts). */
export const fetchPages = async (): Promise<PageDto[]> => {
  const { data } = await api.pages.pagesControllerFindAll();
  return data;
};

export const createPage = async (dto: CreatePageDto): Promise<PageDto> => {
  const { data } = await api.pages.pagesControllerCreate(dto);
  return data;
};

export const updatePage = async (id: number, dto: UpdatePageDto): Promise<PageDto> => {
  const { data } = await api.pages.pagesControllerUpdate(id, dto);
  return data;
};

/** Удаляет страницу вместе со вложенными; возвращает, сколько их было. */
export const removePage = async (id: number): Promise<number> => {
  const { data } = await api.pages.pagesControllerRemove(id);
  return data.removed;
};
