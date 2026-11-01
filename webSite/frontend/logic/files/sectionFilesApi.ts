import { fetchFiles, removeFile, updateFile, type UploadTarget } from '../../api/files';
import type { UpdateFileDto } from '../../src/api/client';

/**
 * Где лежат файлы одного раздела — обычного или раздела свойства (файлы,
 * загруженные через свойство), — Api списка редактора контента.
 *
 * `create` нет намеренно: файл заводится загрузкой с диска (кнопка над списком),
 * а не карточкой, — и без `create` редактор не показывает «Добавить запись».
 * В карточке правят имя и описание.
 */
export const sectionFilesApi = (target: UploadTarget) => ({
  list: () => fetchFiles(target),
  update: (id: string, payload: Record<string, unknown>) =>
    updateFile(Number(id), payload as UpdateFileDto),
  remove: (id: string) => removeFile(Number(id)),
});
