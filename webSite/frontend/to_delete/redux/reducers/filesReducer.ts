import type { FileDto, FileSectionDto } from '../../src/api/client';

export const FILE_SECTIONS_REQUEST = 'FILE_SECTIONS_REQUEST';
export const FILE_SECTIONS_SUCCESS = 'FILE_SECTIONS_SUCCESS';
export const FILES_REQUEST = 'FILES_REQUEST';
export const FILES_SUCCESS = 'FILES_SUCCESS';
export const FILES_ERROR = 'FILES_ERROR';
export const FILES_SAVING = 'FILES_SAVING';
export const FILES_SAVED = 'FILES_SAVED';
export const FILES_UPLOADING = 'FILES_UPLOADING';
export const FILES_UPLOADED = 'FILES_UPLOADED';
export const FILE_UPDATED = 'FILE_UPDATED';

export interface FilesState {
  /** Разделы медиатеки; счётчик файлов приходит вместе с разделом */
  sections: FileSectionDto[];
  /** Файлы раздела, который сейчас открыт */
  items: FileDto[];
  /** Чьи файлы лежат в items: пока не совпадает с выбранным — показываем загрузку */
  itemsSectionId: number | null;
  /** Идёт загрузка списка разделов */
  loading: boolean;
  /** Идёт загрузка файлов раздела */
  filesLoading: boolean;
  /** Идёт сохранение или удаление */
  saving: boolean;
  /** Идёт заливка файлов */
  uploading: boolean;
  /** Разделы уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: FilesState = {
  sections: [],
  items: [],
  itemsSectionId: null,
  loading: false,
  filesLoading: false,
  saving: false,
  uploading: false,
  loaded: false,
  error: null,
};

export type FilesAction =
  | { type: typeof FILE_SECTIONS_REQUEST }
  | { type: typeof FILE_SECTIONS_SUCCESS; payload: FileSectionDto[] }
  | { type: typeof FILES_REQUEST }
  | { type: typeof FILES_SUCCESS; payload: { sectionId: number; items: FileDto[] } }
  | { type: typeof FILES_ERROR; payload: string }
  | { type: typeof FILES_SAVING }
  | { type: typeof FILES_SAVED }
  | { type: typeof FILES_UPLOADING }
  | { type: typeof FILES_UPLOADED }
  | { type: typeof FILE_UPDATED; payload: FileDto };

export const filesReducer = (state = initialState, action: FilesAction): FilesState => {
  switch (action.type) {
    case FILE_SECTIONS_REQUEST:
      return { ...state, loading: true, error: null };
    case FILE_SECTIONS_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, sections: action.payload };
    case FILES_REQUEST:
      return { ...state, filesLoading: true, error: null };
    case FILES_SUCCESS:
      return {
        ...state,
        filesLoading: false,
        error: null,
        items: action.payload.items,
        itemsSectionId: action.payload.sectionId,
      };
    case FILES_ERROR:
      return {
        ...state,
        loading: false,
        filesLoading: false,
        saving: false,
        uploading: false,
        error: action.payload,
      };
    case FILES_SAVING:
      return { ...state, saving: true, error: null };
    case FILES_SAVED:
      return { ...state, saving: false };
    case FILES_UPLOADING:
      return { ...state, uploading: true, error: null };
    case FILES_UPLOADED:
      return { ...state, uploading: false };
    case FILE_UPDATED:
      // Правка описания списка не двигает — меняем одну строку, а не перезагружаем раздел
      return {
        ...state,
        items: state.items.map((file) =>
          file.id === action.payload.id ? action.payload : file,
        ),
      };
    default:
      return state;
  }
};
