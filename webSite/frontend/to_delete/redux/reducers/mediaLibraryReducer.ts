import type { FileDto } from '../../src/api/client';

export const MEDIA_LIBRARY_REQUEST = 'MEDIA_LIBRARY_REQUEST';
export const MEDIA_LIBRARY_SUCCESS = 'MEDIA_LIBRARY_SUCCESS';
export const MEDIA_LIBRARY_ERROR = 'MEDIA_LIBRARY_ERROR';
export const MEDIA_LIBRARY_UPLOADING = 'MEDIA_LIBRARY_UPLOADING';
export const MEDIA_LIBRARY_UPLOADED = 'MEDIA_LIBRARY_UPLOADED';

/**
 * Вся медиатека разом — для выбора файла в свойстве записи. Отдельно от раздела
 * «Файлы»: там в сторе лежат файлы одного открытого раздела, и выбор файла
 * из шторки не должен их подменять.
 */
export interface MediaLibraryState {
  items: FileDto[];
  loading: boolean;
  /** Медиатеку уже загружали — чтобы не дёргать запрос повторно */
  loaded: boolean;
  uploading: boolean;
  error: string | null;
}

const initialState: MediaLibraryState = {
  items: [],
  loading: false,
  loaded: false,
  uploading: false,
  error: null,
};

export type MediaLibraryAction =
  | { type: typeof MEDIA_LIBRARY_REQUEST }
  | { type: typeof MEDIA_LIBRARY_SUCCESS; payload: FileDto[] }
  | { type: typeof MEDIA_LIBRARY_ERROR; payload: string }
  | { type: typeof MEDIA_LIBRARY_UPLOADING }
  | { type: typeof MEDIA_LIBRARY_UPLOADED };

export const mediaLibraryReducer = (
  state = initialState,
  action: MediaLibraryAction,
): MediaLibraryState => {
  switch (action.type) {
    case MEDIA_LIBRARY_REQUEST:
      return { ...state, loading: true, error: null };
    case MEDIA_LIBRARY_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, items: action.payload };
    case MEDIA_LIBRARY_ERROR:
      return { ...state, loading: false, loaded: true, uploading: false, error: action.payload };
    case MEDIA_LIBRARY_UPLOADING:
      return { ...state, uploading: true, error: null };
    case MEDIA_LIBRARY_UPLOADED:
      return { ...state, uploading: false };
    default:
      return state;
  }
};
