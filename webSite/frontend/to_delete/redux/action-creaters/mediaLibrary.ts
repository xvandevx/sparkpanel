import type { Dispatch } from 'redux';
import * as filesApi from '../../api/files';
import type { FileDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  MEDIA_LIBRARY_ERROR,
  MEDIA_LIBRARY_REQUEST,
  MEDIA_LIBRARY_SUCCESS,
  MEDIA_LIBRARY_UPLOADED,
  MEDIA_LIBRARY_UPLOADING,
  MediaLibraryAction,
} from '../reducers/mediaLibraryReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchMediaLibraryThunk = () => async (dispatch: Dispatch<MediaLibraryAction>) => {
  dispatch({ type: MEDIA_LIBRARY_REQUEST });
  try {
    dispatch({ type: MEDIA_LIBRARY_SUCCESS, payload: await filesApi.fetchMediaLibrary() });
  } catch (error) {
    dispatch({
      type: MEDIA_LIBRARY_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить медиатеку'),
    });
  }
};

/**
 * Загрузка файла прямо из шторки записи: он ложится в выбранный раздел
 * медиатеки и сразу становится значением свойства. Возвращает файл или null.
 */
export const uploadMediaThunk =
  (sectionId: number, file: File) =>
  async (dispatch: Dispatch<MediaLibraryAction>): Promise<FileDto | null> => {
    dispatch({ type: MEDIA_LIBRARY_UPLOADING });
    try {
      const uploaded = await filesApi.uploadFile(sectionId, file);
      dispatch({ type: MEDIA_LIBRARY_UPLOADED });
      dispatch({ type: MEDIA_LIBRARY_SUCCESS, payload: await filesApi.fetchMediaLibrary() });
      return uploaded;
    } catch (error) {
      dispatch({
        type: MEDIA_LIBRARY_ERROR,
        payload: apiErrorMessage(error, 'Не удалось загрузить файл'),
      });
      return null;
    }
  };
