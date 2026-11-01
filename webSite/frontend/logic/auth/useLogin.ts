import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { useAuthActions } from './useAuthActions';

/**
 * Состояние доступа: что показывать (загрузка / настройка / вход / приложение)
 * и что делать при отправке формы входа.
 */
export const useLogin = () => {
  const { user, loading, error, checkingSession, needsRoot, isDevLogin } = useSelector(
    (state: RootState) => state.auth,
  );
  const { login, devLogin } = useAuthActions();

  // Страница статическая: сервер не знает про cookie и всегда рендерит «проверку доступа».
  // Если начать рисовать результат проверки уже в первом клиентском рендере, разметка
  // разойдётся с серверной и React упадёт на гидрации, оставив мёртвый экран.
  // Поэтому результат показываем только со второго рендера — после монтирования.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return {
    user,
    isAuthorized: Boolean(user),
    /** В системе нет главного администратора — вместо входа показываем первичную настройку */
    needsRoot,
    /** Сеанс проверен и экран можно рисовать (до этого — индикатор загрузки) */
    isReady: mounted && !checkingSession,
    loading,
    /** Ошибка от сервера (неверная пара email/пароль, сеть) */
    error,
    submit: login,
    /** Локальный вход без пароля разрешён сервером (`DEV_LOGIN=true`, не прод) */
    isDevLogin,
    devLogin,
  };
};
