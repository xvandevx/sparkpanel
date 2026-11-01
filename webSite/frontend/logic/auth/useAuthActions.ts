import { useCallback, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  createRootThunk,
  devLoginThunk,
  loginThunk,
  logoutThunk,
  restoreSessionThunk,
} from '../../redux/action-creaters/auth';

/**
 * Хук-действия: только dispatch, без селекторов — можно звать из любого места
 * без лишних ререндеров.
 */
export const useAuthActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const login = useCallback(
    (email: string, password: string) => dispatch(loginThunk(email.trim(), password)),
    [dispatch],
  );
  const createRoot = useCallback(
    (params: { email: string; password: string; name?: string }) =>
      dispatch(createRootThunk({ ...params, email: params.email.trim() })),
    [dispatch],
  );
  const devLogin = useCallback(() => dispatch(devLoginThunk()), [dispatch]);
  const logout = useCallback(() => dispatch(logoutThunk()), [dispatch]);
  const restoreSession = useCallback(() => dispatch(restoreSessionThunk()), [dispatch]);

  return useMemo(
    () => ({ login, devLogin, createRoot, logout, restoreSession }),
    [login, devLogin, createRoot, logout, restoreSession],
  );
};
