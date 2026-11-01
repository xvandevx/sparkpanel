import { useEffect } from 'react';
import { useUsersActions } from './useUsersActions';

/**
 * Загрузка списка пользователей. Вызывается ОДИН раз — на странице раздела,
 * чтобы запрос не дублировался, когда данные читают несколько компонентов.
 */
export const useLoadUsers = () => {
  const { load } = useUsersActions();

  useEffect(() => {
    load();
  }, [load]);
};
