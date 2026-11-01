import {
  api,
  CreateFileSectionDto,
  FileDto,
  FileSectionDto,
  UpdateFileDto,
  UpdateFileSectionDto,
} from '../src/api/client';

/**
 * Сетевой слой раздела «Файлы». Единственное место, где дергается
 * сгенерированный клиент; выше по стеку сюда ходят только thunks из redux/.
 */

/** Разделы медиатеки со счётчиком файлов. */
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

/** Удаляет пустой раздел; возвращает его идентификатор. */
export const removeFileSection = async (id: number): Promise<number> => {
  const { data } = await api.fileSections.fileSectionsControllerRemove(id);
  return data.id;
};

export const fetchFiles = async (sectionId: number): Promise<FileDto[]> => {
  const { data } = await api.files.filesControllerFindAll(sectionId);
  return data;
};

/** Вся медиатека разом — для выбора файла в свойстве записи любого раздела. */
export const fetchMediaLibrary = async (): Promise<FileDto[]> => {
  const { data } = await api.files.filesControllerFindAll();
  return data;
};

/**
 * Загрузка одного файла. Тело — multipart, его собирает сгенерированный клиент:
 * сюда File приходит прямо из input, руками FormData не лепим.
 */
export const uploadFile = async (
  sectionId: number,
  file: File,
  description?: string,
): Promise<FileDto> => {
  const { data } = await api.files.filesControllerUpload(file, sectionId, description);
  return data;
};

export const updateFile = async (id: number, dto: UpdateFileDto): Promise<FileDto> => {
  const { data } = await api.files.filesControllerUpdate(id, dto);
  return data;
};

/** Удаляет файл вместе с объектом в хранилище; возвращает его идентификатор. */
export const removeFile = async (id: number): Promise<number> => {
  const { data } = await api.files.filesControllerRemove(id);
  return data.id;
};
