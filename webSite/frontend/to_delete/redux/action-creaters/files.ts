import type { Dispatch } from 'redux';
import * as filesApi from '../../api/files';
import type {
  CreateFileSectionDto,
  FileDto,
  FileSectionDto,
  UpdateFileDto,
  UpdateFileSectionDto,
} from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  FILE_SECTIONS_REQUEST,
  FILE_SECTIONS_SUCCESS,
  FILE_UPDATED,
  FILES_ERROR,
  FILES_REQUEST,
  FILES_SAVED,
  FILES_SAVING,
  FILES_SUCCESS,
  FILES_UPLOADED,
  FILES_UPLOADING,
  FilesAction,
} from '../reducers/filesReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchFileSectionsThunk = () => async (dispatch: Dispatch<FilesAction>) => {
  dispatch({ type: FILE_SECTIONS_REQUEST });
  try {
    dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
  } catch (error) {
    dispatch({
      type: FILES_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить разделы'),
    });
  }
};

export const fetchFilesThunk =
  (sectionId: number) => async (dispatch: Dispatch<FilesAction>) => {
    dispatch({ type: FILES_REQUEST });
    try {
      const items = await filesApi.fetchFiles(sectionId);
      dispatch({ type: FILES_SUCCESS, payload: { sectionId, items } });
    } catch (error) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось загрузить файлы раздела'),
      });
    }
  };

export const createFileSectionThunk =
  (dto: CreateFileSectionDto) =>
  async (dispatch: Dispatch<FilesAction>): Promise<FileSectionDto | null> => {
    dispatch({ type: FILES_SAVING });
    try {
      const section = await filesApi.createFileSection(dto);
      dispatch({ type: FILES_SAVED });
      // Перечитываем список: раздел встаёт на своё место по алфавиту кода
      dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
      return section;
    } catch (error) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось создать раздел'),
      });
      return null;
    }
  };

export const updateFileSectionThunk =
  (id: number, dto: UpdateFileSectionDto) =>
  async (dispatch: Dispatch<FilesAction>): Promise<FileSectionDto | null> => {
    dispatch({ type: FILES_SAVING });
    try {
      const section = await filesApi.updateFileSection(id, dto);
      dispatch({ type: FILES_SAVED });
      dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
      return section;
    } catch (error) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить раздел'),
      });
      return null;
    }
  };

export const removeFileSectionThunk =
  (id: number) =>
  async (dispatch: Dispatch<FilesAction>): Promise<boolean> => {
    dispatch({ type: FILES_SAVING });
    try {
      await filesApi.removeFileSection(id);
      dispatch({ type: FILES_SAVED });
      dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
      return true;
    } catch (error) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить раздел'),
      });
      return false;
    }
  };

/**
 * Заливка файлов по одному: сервер принимает один файл за запрос, а выбирают их
 * обычно пачкой. Список и счётчики раздела перечитываем один раз в конце.
 * Возвращает загруженные файлы — редактору нужен идентификатор созданной записи.
 */
export const uploadFilesThunk =
  (sectionId: number, files: File[], description?: string) =>
  async (dispatch: Dispatch<FilesAction>): Promise<FileDto[]> => {
    dispatch({ type: FILES_UPLOADING });

    const uploaded: FileDto[] = [];
    let failure: unknown = null;

    for (const file of files) {
      try {
        uploaded.push(await filesApi.uploadFile(sectionId, file, description));
      } catch (error) {
        failure = error;
        // Дальше не идём: обычно это общая причина — нет хранилища или кончилось место
        break;
      }
    }

    dispatch({ type: FILES_UPLOADED });

    if (uploaded.length > 0) {
      const items = await filesApi.fetchFiles(sectionId);
      dispatch({ type: FILES_SUCCESS, payload: { sectionId, items } });
      dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
    }

    if (failure) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(failure, 'Не удалось загрузить файл'),
      });
    }

    return uploaded;
  };

export const updateFileThunk =
  (id: number, dto: UpdateFileDto) =>
  async (dispatch: Dispatch<FilesAction>): Promise<FileDto | null> => {
    dispatch({ type: FILES_SAVING });
    try {
      const file = await filesApi.updateFile(id, dto);
      dispatch({ type: FILES_SAVED });
      dispatch({ type: FILE_UPDATED, payload: file });

      // Переезд в другой раздел меняет и состав списка, и счётчики разделов
      if (dto.sectionId !== undefined) {
        dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
      }
      return file;
    } catch (error) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить файл'),
      });
      return null;
    }
  };

export const removeFileThunk =
  (id: number, sectionId: number) =>
  async (dispatch: Dispatch<FilesAction>): Promise<boolean> => {
    dispatch({ type: FILES_SAVING });
    try {
      await filesApi.removeFile(id);
      dispatch({ type: FILES_SAVED });

      const items = await filesApi.fetchFiles(sectionId);
      dispatch({ type: FILES_SUCCESS, payload: { sectionId, items } });
      dispatch({ type: FILE_SECTIONS_SUCCESS, payload: await filesApi.fetchFileSections() });
      return true;
    } catch (error) {
      dispatch({
        type: FILES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить файл'),
      });
      return false;
    }
  };
