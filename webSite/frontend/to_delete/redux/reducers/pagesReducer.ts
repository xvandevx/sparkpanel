import type { PageDto } from '../../src/api/client';

export const PAGES_REQUEST = 'PAGES_REQUEST';
export const PAGES_SUCCESS = 'PAGES_SUCCESS';
export const PAGES_ERROR = 'PAGES_ERROR';
export const PAGES_SAVING = 'PAGES_SAVING';
export const PAGES_SAVED = 'PAGES_SAVED';

export interface PagesState {
  /** Плоский список страниц; дерево собирается в logic/pages/pagesTree.ts */
  items: PageDto[];
  /** Идёт загрузка списка */
  loading: boolean;
  /** Идёт сохранение или удаление */
  saving: boolean;
  /** Список уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: PagesState = {
  items: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export type PagesAction =
  | { type: typeof PAGES_REQUEST }
  | { type: typeof PAGES_SUCCESS; payload: PageDto[] }
  | { type: typeof PAGES_ERROR; payload: string }
  | { type: typeof PAGES_SAVING }
  | { type: typeof PAGES_SAVED };

export const pagesReducer = (state = initialState, action: PagesAction): PagesState => {
  switch (action.type) {
    case PAGES_REQUEST:
      return { ...state, loading: true, error: null };
    case PAGES_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, items: action.payload };
    case PAGES_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case PAGES_SAVING:
      return { ...state, saving: true, error: null };
    case PAGES_SAVED:
      return { ...state, saving: false };
    default:
      return state;
  }
};
