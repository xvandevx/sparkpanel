import { createStorage, fetchStorages, removeStorage, updateStorage } from '../../api/storages';
import type { SaveStorageDto, UpdateStorageDto } from '../../src/api/client';

/**
 * Где лежат внешние хранилища. Всё, что настройки рассказывают редактору
 * контента о данных: загрузку, перечитывание и ошибки ведёт сам редактор.
 *
 * Ключ записи у редактора строковый; в базе хранилище адресуется числом —
 * перевод только здесь.
 */
export const storagesApi = {
  list: fetchStorages,
  create: (payload: Record<string, unknown>) =>
    createStorage(payload as unknown as SaveStorageDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateStorage(Number(id), payload as unknown as UpdateStorageDto),
  remove: (id: string) => removeStorage(Number(id)),
};
