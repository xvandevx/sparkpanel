import { api, LoginResponseDto, SetupStatusDto, UserDto } from '../src/api/client';
import { clearAuthToken, setAuthToken } from '../src/api/auth-utils';

/**
 * Сетевой слой: единственное место, где дергается сгенерированный клиент.
 * Компоненты и редьюсеры сюда не ходят напрямую — только thunks из redux/.
 */
export const login = async (email: string, password: string): Promise<LoginResponseDto> => {
  const { data } = await api.auth.authControllerLogin({ email, password });
  setAuthToken(data.token);
  return data;
};

/**
 * Локальный вход без пароля под главным администратором — только если сервер
 * его включил (`DEV_LOGIN=true`, не прод): об этом говорит статус настройки.
 */
export const devLogin = async (): Promise<LoginResponseDto> => {
  const { data } = await api.auth.authControllerDevLogin();
  setAuthToken(data.token);
  return data;
};

export const fetchMe = async (): Promise<UserDto> => {
  const { data } = await api.auth.authControllerMe();
  return data;
};

/** Нужна ли первичная настройка: есть ли в системе главный администратор. */
export const fetchSetupStatus = async (): Promise<SetupStatusDto> => {
  const { data } = await api.auth.authControllerGetSetupStatus();
  return data;
};

/** Создание root-пользователя при первом запуске. Сразу логинит: бэкенд отдаёт токен. */
export const createRoot = async (params: {
  email: string;
  password: string;
  name?: string;
}): Promise<LoginResponseDto> => {
  const { data } = await api.auth.authControllerCreateRoot(params);
  setAuthToken(data.token);
  return data;
};

export const logout = (): void => {
  // Серверной сессии нет — JWT stateless, поэтому выход это просто забыть токен.
  clearAuthToken();
};
