import { api, ContentItemDto, CreateContentItemDto, UpdateContentItemDto } from '../src/api/client';

/**
 * Сетевой слой элементов типа контента (`/api/infoblocks/contents/:contentId/items`).
 * Элемент адресуется вместе со своим типом. Единственное место, где дергается
 * сгенерированный клиент.
 */

export const fetchContentItems = async (contentId: number): Promise<ContentItemDto[]> => {
  const { data } = await api.contentItems.contentItemsControllerFindAll(contentId);
  return data;
};

export const createContentItem = async (
  contentId: number,
  dto: CreateContentItemDto,
): Promise<ContentItemDto> => {
  const { data } = await api.contentItems.contentItemsControllerCreate(contentId, dto);
  return data;
};

export const updateContentItem = async (
  contentId: number,
  id: number,
  dto: UpdateContentItemDto,
): Promise<ContentItemDto> => {
  const { data } = await api.contentItems.contentItemsControllerUpdate(contentId, id, dto);
  return data;
};

/** Удаляет элемент; значения его свойств сервер стирает сам. */
export const removeContentItem = async (contentId: number, id: number): Promise<void> => {
  await api.contentItems.contentItemsControllerRemove(contentId, id);
};
