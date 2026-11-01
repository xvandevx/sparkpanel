import { useEffect } from 'react';
import { useAuthActions } from './useAuthActions';

/**
 * Хук-эффект загрузки: вызывается ОДИН раз на странице, а не в каждом компоненте,
 * иначе запрос /auth/me продублируется.
 */
export const useLoadSession = (): void => {
  const { restoreSession } = useAuthActions();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);
};
