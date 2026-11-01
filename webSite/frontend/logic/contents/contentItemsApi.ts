import {
  createContentItem,
  fetchContentItems,
  removeContentItem,
  updateContentItem,
} from '../../api/contentItems';
import type { CreateContentItemDto, UpdateContentItemDto } from '../../src/api/client';
import { toParentPayload } from './parentPayload';

/**
 * Где лежат элементы одного типа контента — Api списка редактора контента.
 * Свойства элемента сюда не входят: их значения редактор сохраняет сам.
 */
export const contentItemsApi = (contentId: number) => ({
  list: () => fetchContentItems(contentId),
  create: (payload: Record<string, unknown>) =>
    createContentItem(contentId, toParentPayload(payload) as unknown as CreateContentItemDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateContentItem(contentId, Number(id), toParentPayload(payload) as UpdateContentItemDto),
  remove: (id: string) => removeContentItem(contentId, Number(id)),
});
