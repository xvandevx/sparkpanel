import type { FileDto } from '../../src/api/client';

/**
 * Файлы пользователя — одним списком на всю панель. Его читают и раздел
 * «Файлы» (отбирает файлы открытого раздела), и поле файла в карточке записи
 * (показывает выбранный и даёт выбрать из загруженных) — грузить их по разделу
 * значило бы держать две копии одного и того же.
 */

export const FILES_REQUEST = 'FILES_REQUEST';
export const FILES_SUCCESS = 'FILES_SUCCESS';
export const FILES_ERROR = 'FILES_ERROR';

export interface FilesState {
  items: FileDto[];
  isLoading: boolean;
  /** Список уже приходил: пока перечитываем, показываем прежний */
  isLoaded: boolean;
  error: string | null;
}

const initialState: FilesState = {
  items: [],
  isLoading: false,
  isLoaded: false,
  error: null,
};

export type FilesAction =
  | { type: typeof FILES_REQUEST }
  | { type: typeof FILES_SUCCESS; payload: FileDto[] }
  | { type: typeof FILES_ERROR; payload: string };

export const filesReducer = (state: FilesState = initialState, action: FilesAction): FilesState => {
  switch (action.type) {
    case FILES_REQUEST:
      return { ...state, isLoading: true, error: null };
    case FILES_SUCCESS:
      return { items: action.payload, isLoading: false, isLoaded: true, error: null };
    case FILES_ERROR:
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
};
