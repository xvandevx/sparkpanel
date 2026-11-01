import type { Dispatch } from 'redux';
import { fetchFiles, removeFile, uploadFile, type UploadTarget } from '../../api/files';
import type { FileDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import type { RootState } from '..';
import {
  FILES_ERROR,
  FILES_REQUEST,
  FILES_SUCCESS,
  type FilesAction,
} from '../reducers/filesReducer';

/**
 * Список файлов. Читают его несколько мест разом — раздел и каждое поле файла
 * в карточке, — поэтому запрос, который уже в полёте, второй раз не уходит.
 */
export const loadFilesThunk =
  () =>
  async (dispatch: Dispatch<FilesAction>, getState: () => RootState): Promise<void> => {
    if (getState().files.isLoading) return;
    dispatch({ type: FILES_REQUEST });
    try {
      dispatch({ type: FILES_SUCCESS, payload: await fetchFiles() });
    } catch (error) {
      dispatch({ type: FILES_ERROR, payload: apiErrorMessage(error, 'Не удалось загрузить файлы') });
    }
  };

/**
 * Загрузка одного файла, потом — перечитанный список: в нём файл появится
 * с тем адресом и разделом, которые назначил сервер.
 */
export const uploadFileThunk =
  (file: File, target: UploadTarget) =>
  async (dispatch: Dispatch<FilesAction>): Promise<{ file: FileDto | null; error: string | null }> => {
    let uploaded: FileDto;
    try {
      uploaded = await uploadFile(file, target);
    } catch (error) {
      return { file: null, error: apiErrorMessage(error, `Не удалось загрузить «${file.name}»`) };
    }
    await refresh(dispatch);
    return { file: uploaded, error: null };
  };

/** Удаление файла; возвращает текст ошибки или null. */
export const removeFileThunk =
  (id: number) =>
  async (dispatch: Dispatch<FilesAction>): Promise<string | null> => {
    try {
      await removeFile(id);
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось удалить файл');
    }
    await refresh(dispatch);
    return null;
  };

/**
 * Перечитать список после правки. Файл уже на сервере, и упавшее перечитывание —
 * беда списка, а не правки: таблица покажет ошибку, а загрузку не повторят зря.
 */
async function refresh(dispatch: Dispatch<FilesAction>): Promise<void> {
  try {
    dispatch({ type: FILES_SUCCESS, payload: await fetchFiles() });
  } catch (error) {
    dispatch({ type: FILES_ERROR, payload: apiErrorMessage(error, 'Не удалось обновить файлы') });
  }
}
