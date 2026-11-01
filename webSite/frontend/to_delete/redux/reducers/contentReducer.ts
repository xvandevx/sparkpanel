import type { ContentBlockDto } from '../../src/api/client';

export const CONTENT_REQUEST = 'CONTENT_REQUEST';
export const CONTENT_SUCCESS = 'CONTENT_SUCCESS';
export const CONTENT_ERROR = 'CONTENT_ERROR';
export const CONTENT_SAVING = 'CONTENT_SAVING';
export const CONTENT_SAVED = 'CONTENT_SAVED';

export interface ContentState {
  /** Плоский список HTML-блоков: вложенности у них нет */
  items: ContentBlockDto[];
  /** Идёт загрузка списка */
  loading: boolean;
  /** Идёт сохранение или удаление */
  saving: boolean;
  /** Список уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: ContentState = {
  items: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export type ContentAction =
  | { type: typeof CONTENT_REQUEST }
  | { type: typeof CONTENT_SUCCESS; payload: ContentBlockDto[] }
  | { type: typeof CONTENT_ERROR; payload: string }
  | { type: typeof CONTENT_SAVING }
  | { type: typeof CONTENT_SAVED };

export const contentReducer = (
  state = initialState,
  action: ContentAction,
): ContentState => {
  switch (action.type) {
    case CONTENT_REQUEST:
      return { ...state, loading: true, error: null };
    case CONTENT_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, items: action.payload };
    case CONTENT_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case CONTENT_SAVING:
      return { ...state, saving: true, error: null };
    case CONTENT_SAVED:
      return { ...state, saving: false };
    default:
      return state;
  }
};
