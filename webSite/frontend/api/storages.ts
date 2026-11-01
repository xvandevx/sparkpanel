import { api, SaveStorageDto, StorageDto, UpdateStorageDto } from '../src/api/client';

/**
 * Сетевой слой внешних хранилищ файлов (`/api/infoblocks/storages` — список
 * редактора контента). Единственное место, где дергается сгенерированный клиент.
 */

export const fetchStorages = async (): Promise<StorageDto[]> => {
  const { data } = await api.infoblockStorages.storagesControllerFindAll();
  return data;
};

/** Новое хранилище: название и активность. Подключение уходит значениями свойств. */
export const createStorage = async (dto: SaveStorageDto): Promise<StorageDto> => {
  const { data } = await api.infoblockStorages.storagesControllerCreate(dto);
  return data;
};

/** Правка хранилища: только присланное — название, активность, сортировка. */
export const updateStorage = async (id: number, dto: UpdateStorageDto): Promise<StorageDto> => {
  const { data } = await api.infoblockStorages.storagesControllerUpdate(id, dto);
  return data;
};

/** Удаляет свободное хранилище: выбранное и с файлами сервер не отдаст (409). */
export const removeStorage = async (id: number): Promise<void> => {
  await api.infoblockStorages.storagesControllerRemove(id);
};
