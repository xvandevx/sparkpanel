import {
  createFileSection,
  fetchFileSections,
  removeFileSection,
  updateFileSection,
} from '../../api/fileSections';
import type { CreateFileSectionDto, UpdateFileSectionDto } from '../../src/api/client';

/**
 * Где лежат разделы файлов. Всё, что раздел «Файлы» рассказывает редактору
 * контента о данных: загрузку, перечитывание и ошибки ведёт сам редактор.
 *
 * `parentId` переписываем, только если карточка его присылала: `null` в теле —
 * осознанный перенос в корень, а отсутствие ключа — «поле не трогали».
 */
const toSectionPayload = (payload: Record<string, unknown>) => ({
  ...payload,
  ...(payload.parentId === undefined ? {} : { parentId: toSectionId(payload.parentId) }),
});

/** Ключ записи у редактора строковый; в базе раздел адресуется числом. */
const toSectionId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const fileSectionsApi = {
  list: fetchFileSections,
  create: (payload: Record<string, unknown>) =>
    createFileSection(toSectionPayload(payload) as unknown as CreateFileSectionDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateFileSection(Number(id), toSectionPayload(payload) as UpdateFileSectionDto),
  remove: (id: string) => removeFileSection(Number(id)),
};
