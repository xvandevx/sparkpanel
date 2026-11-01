import type { Dispatch } from 'redux';
import * as authApi from '../../api/auth';
import { getAuthToken } from '../../src/api/auth-utils';
import { apiErrorMessage } from '../apiError';
import {
  AUTH_ERROR,
  AUTH_LOGOUT,
  AUTH_REQUEST,
  AUTH_SESSION_CHECKED,
  AUTH_SETUP_REQUIRED,
  AUTH_SUCCESS,
  AuthAction,
} from '../reducers/authReducer';

/** 401 на входе — это всегда неверная пара email/пароль, а не текст с бэкенда. */
const toMessage = (error: any, fallback: string): string =>
  error?.response?.status === 401
    ? 'Неверный email или пароль'
    : apiErrorMessage(error, fallback);

/** Thunks — единственное место, откуда вызывается api/. */
export const loginThunk =
  (email: string, password: string) => async (dispatch: Dispatch<AuthAction>) => {
    dispatch({ type: AUTH_REQUEST });
    try {
      const { user } = await authApi.login(email, password);
      dispatch({ type: AUTH_SUCCESS, payload: user });
    } catch (error) {
      dispatch({
        type: AUTH_ERROR,
        payload: toMessage(error, 'Не удалось выполнить вход. Повторите попытку.'),
      });
    }
  };

/** Локальный вход без пароля — под главным администратором (только если сервер разрешил). */
export const devLoginThunk = () => async (dispatch: Dispatch<AuthAction>) => {
  dispatch({ type: AUTH_REQUEST });
  try {
    const { user } = await authApi.devLogin();
    dispatch({ type: AUTH_SUCCESS, payload: user });
  } catch (error) {
    dispatch({ type: AUTH_ERROR, payload: apiErrorMessage(error, 'Вход без пароля недоступен') });
  }
};

/** Создание главного администратора при первом запуске — сразу с входом. */
export const createRootThunk =
  (params: { email: string; password: string; name?: string }) =>
  async (dispatch: Dispatch<AuthAction>) => {
    dispatch({ type: AUTH_REQUEST });
    try {
      const { user } = await authApi.createRoot(params);
      dispatch({ type: AUTH_SUCCESS, payload: user });
    } catch (error: any) {
      dispatch({
        type: AUTH_ERROR,
        payload: toMessage(error, 'Не удалось создать учётную запись. Повторите попытку.'),
      });
      // 409 — root успели создать в другом окне: показываем обычный вход.
      if (error?.response?.status === 409) {
        dispatch({ type: AUTH_SETUP_REQUIRED, payload: false });
      }
    }
  };

/**
 * Первый запрос страницы: пробуем восстановить сессию по токену, а если входить не под кем —
 * выясняем, не нужна ли первичная настройка.
 */
export const restoreSessionThunk = () => async (dispatch: Dispatch<AuthAction>) => {
  if (getAuthToken()) {
    try {
      const user = await authApi.fetchMe();
      dispatch({ type: AUTH_SUCCESS, payload: user });
      return;
    } catch {
      // Токен протух или отозван — молча забываем его и идём проверять настройку.
      authApi.logout();
      dispatch({ type: AUTH_LOGOUT });
    }
  }

  try {
    const { needsRoot, isDevLogin } = await authApi.fetchSetupStatus();
    dispatch({ type: AUTH_SETUP_REQUIRED, payload: needsRoot, isDevLogin });
  } catch {
    // Бэкенд недоступен — показываем обычную форму входа, она сама сообщит об ошибке.
    dispatch({ type: AUTH_SESSION_CHECKED });
  }
};

export const logoutThunk = () => (dispatch: Dispatch<AuthAction>) => {
  authApi.logout();
  dispatch({ type: AUTH_LOGOUT });
};
