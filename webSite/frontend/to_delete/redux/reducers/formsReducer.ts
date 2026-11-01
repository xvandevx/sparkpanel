import type { FormDto } from '../../src/api/client';

export const FORMS_REQUEST = 'FORMS_REQUEST';
export const FORMS_SUCCESS = 'FORMS_SUCCESS';
export const FORMS_ERROR = 'FORMS_ERROR';
export const FORMS_SAVING = 'FORMS_SAVING';
export const FORMS_SAVED = 'FORMS_SAVED';

export interface FormsState {
  /** Формы вместе с их полями; дерево строк собирается в logic/forms/formsTree.ts */
  items: FormDto[];
  /** Идёт загрузка списка */
  loading: boolean;
  /** Идёт сохранение или удаление */
  saving: boolean;
  /** Список уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: FormsState = {
  items: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export type FormsAction =
  | { type: typeof FORMS_REQUEST }
  | { type: typeof FORMS_SUCCESS; payload: FormDto[] }
  | { type: typeof FORMS_ERROR; payload: string }
  | { type: typeof FORMS_SAVING }
  | { type: typeof FORMS_SAVED };

export const formsReducer = (state = initialState, action: FormsAction): FormsState => {
  switch (action.type) {
    case FORMS_REQUEST:
      return { ...state, loading: true, error: null };
    case FORMS_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, items: action.payload };
    case FORMS_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case FORMS_SAVING:
      return { ...state, saving: true, error: null };
    case FORMS_SAVED:
      return { ...state, saving: false };
    default:
      return state;
  }
};
