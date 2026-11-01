import type { UserDto } from '../../src/api/client';

export const AUTH_REQUEST = 'AUTH_REQUEST';
export const AUTH_SUCCESS = 'AUTH_SUCCESS';
export const AUTH_ERROR = 'AUTH_ERROR';
export const AUTH_LOGOUT = 'AUTH_LOGOUT';
export const AUTH_SETUP_REQUIRED = 'AUTH_SETUP_REQUIRED';
export const AUTH_SESSION_CHECKED = 'AUTH_SESSION_CHECKED';

export interface AuthState {
  user: UserDto | null;
  /** Идёт запрос логина или создания root */
  loading: boolean;
  /** Идёт восстановление сессии по токену из cookie (до него экран не рисуем) */
  checkingSession: boolean;
  /** В системе ещё нет главного администратора — нужен экран первичной настройки */
  needsRoot: boolean;
  /** Сервер разрешил локальный вход без пароля: на экране входа есть кнопка */
  isDevLogin: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  loading: false,
  checkingSession: true,
  needsRoot: false,
  isDevLogin: false,
  error: null,
};

export type AuthAction =
  | { type: typeof AUTH_REQUEST }
  | { type: typeof AUTH_SUCCESS; payload: UserDto }
  | { type: typeof AUTH_ERROR; payload: string }
  | { type: typeof AUTH_LOGOUT }
  | { type: typeof AUTH_SETUP_REQUIRED; payload: boolean; isDevLogin?: boolean }
  | { type: typeof AUTH_SESSION_CHECKED };

export const authReducer = (state = initialState, action: AuthAction): AuthState => {
  switch (action.type) {
    case AUTH_REQUEST:
      return { ...state, loading: true, error: null };
    case AUTH_SUCCESS:
      return {
        ...state,
        loading: false,
        error: null,
        user: action.payload,
        needsRoot: false,
        checkingSession: false,
      };
    case AUTH_ERROR:
      return { ...state, loading: false, error: action.payload, checkingSession: false };
    case AUTH_LOGOUT:
      return { ...state, user: null, error: null, loading: false, checkingSession: false };
    case AUTH_SETUP_REQUIRED:
      return {
        ...state,
        needsRoot: action.payload,
        isDevLogin: action.isDevLogin ?? state.isDevLogin,
        checkingSession: false,
      };
    case AUTH_SESSION_CHECKED:
      return { ...state, checkingSession: false };
    default:
      return state;
  }
};
