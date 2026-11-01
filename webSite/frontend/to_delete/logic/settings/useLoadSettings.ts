import { useEffect } from 'react';
import { useSettingsActions } from './useSettingsActions';

/**
 * Загрузка настроек. Вызывается ОДИН раз — на странице раздела,
 * чтобы запрос не дублировался, когда данные читают несколько компонентов.
 */
export const useLoadSettings = () => {
  const { load } = useSettingsActions();

  useEffect(() => {
    load();
  }, [load]);
};
