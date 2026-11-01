import type { UserDto } from '../../src/api/client';

export const USERS_REQUEST = 'USERS_REQUEST';
export const USERS_SUCCESS = 'USERS_SUCCESS';
export const USERS_ERROR = 'USERS_ERROR';
export const USERS_SAVING = 'USERS_SAVING';
export const USERS_SAVED = 'USERS_SAVED';

export interface UsersState {
  /** Учётные записи панели плоским списком: вложенности у них нет */
  items: UserDto[];
  /** Идёт загрузка списка */
  loading: boolean;
  /** Идёт сохранение */
  saving: boolean;
  /** Список уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: UsersState = {
  items: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export type UsersAction =
  | { type: typeof USERS_REQUEST }
  | { type: typeof USERS_SUCCESS; payload: UserDto[] }
  | { type: typeof USERS_ERROR; payload: string }
  | { type: typeof USERS_SAVING }
  | { type: typeof USERS_SAVED };

export const usersReducer = (state = initialState, action: UsersAction): UsersState => {
  switch (action.type) {
    case USERS_REQUEST:
      return { ...state, loading: true, error: null };
    case USERS_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, items: action.payload };
    case USERS_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case USERS_SAVING:
      return { ...state, saving: true, error: null };
    case USERS_SAVED:
      return { ...state, saving: false };
    default:
      return state;
  }
};
