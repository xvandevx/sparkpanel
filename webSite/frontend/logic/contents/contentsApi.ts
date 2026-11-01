import { createContent, fetchContents, removeContent, updateContent } from '../../api/contents';
import type { CreateContentDto, UpdateContentDto } from '../../src/api/client';
import { toParentPayload } from './parentPayload';

/**
 * Где лежат типы контента. Тип с элементами или вложенными типами сервер
 * не удалит — он приходит с `isBlocked`, и редактор вместо корзины покажет замок.
 */
export const contentsApi = {
  list: fetchContents,
  create: (payload: Record<string, unknown>) =>
    createContent(toParentPayload(payload) as unknown as CreateContentDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateContent(Number(id), toParentPayload(payload) as UpdateContentDto),
  remove: (id: string) => removeContent(Number(id)),
};
