import { api, FileDto, UpdateFileDto } from '../src/api/client';

/**
 * Сетевой слой файлов (`/api/infoblocks/files`). Единственное место, где
 * дергается сгенерированный клиент; выше по стеку сюда ходят только thunks.
 */

/**
 * Где лежит файл: в разделе (загрузка в разделе «Файлы») или у свойства,
 * через которое его загрузили (из карточки записи; раздела под свойство нет).
 */
export type UploadTarget = { sectionId: number } | { propertyId: number };

/** Файлы раздела или свойства с привязками к записям; без них — все файлы. */
export const fetchFiles = async (target?: UploadTarget): Promise<FileDto[]> => {
  const { data } = await api.infoblockFiles.filesControllerFindAll(
    target && 'sectionId' in target ? target.sectionId : undefined,
    target && 'propertyId' in target ? target.propertyId : undefined,
  );
  return data;
};

/**
 * Загрузка одного файла. Тело — multipart, его собирает сгенерированный клиент:
 * сюда File приходит прямо из выбора на диске, руками FormData не лепим.
 */
export const uploadFile = async (file: File, target: UploadTarget): Promise<FileDto> => {
  const { data } = await api.infoblockFiles.filesControllerUpload(
    file,
    'sectionId' in target ? target.sectionId : undefined,
    'propertyId' in target ? target.propertyId : undefined,
  );
  return data;
};

/**
 * «Забрать в хранилище»: внешний файл по адресу скачивает сервер и кладёт
 * к себе — туда же, куда легла бы загрузка с диска.
 */
export const importFile = async (url: string, target: UploadTarget): Promise<FileDto> => {
  const { data } = await api.infoblockFiles.filesControllerImportUrl({ url, ...target });
  return data;
};

/** Имя и описание файла — то, что правят в его карточке. */
export const updateFile = async (id: number, dto: UpdateFileDto): Promise<FileDto> => {
  const { data } = await api.infoblockFiles.filesControllerUpdate(id, dto);
  return data;
};

/** Удаляет файл: записи его забывают, объект уходит из хранилища. */
export const removeFile = async (id: number): Promise<void> => {
  await api.infoblockFiles.filesControllerRemove(id);
};
