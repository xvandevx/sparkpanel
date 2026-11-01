import {
  api,
  CreateFileSectionDto,
  FileSectionDto,
  UpdateFileSectionDto,
} from '../src/api/client';

/**
 * Сетевой слой разделов файлов — списка редактора контента в разделе «Файлы».
 * Единственное место, где дергается сгенерированный клиент.
 */

/** Плоский список: дерево собирает редактор по parentId. */
export const fetchFileSections = async (): Promise<FileSectionDto[]> => {
  const { data } = await api.fileSections.fileSectionsControllerFindAll();
  return data;
};

export const createFileSection = async (dto: CreateFileSectionDto): Promise<FileSectionDto> => {
  const { data } = await api.fileSections.fileSectionsControllerCreate(dto);
  return data;
};

export const updateFileSection = async (
  id: number,
  dto: UpdateFileSectionDto,
): Promise<FileSectionDto> => {
  const { data } = await api.fileSections.fileSectionsControllerUpdate(id, dto);
  return data;
};

/** Удаляет пустой раздел; раздел свойства, с файлами или вложенными сервер не отдаст (409). */
export const removeFileSection = async (id: number): Promise<void> => {
  await api.fileSections.fileSectionsControllerRemove(id);
};
