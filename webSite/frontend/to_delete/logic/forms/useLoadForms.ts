import { useEffect } from 'react';
import { useFormsActions } from './useFormsActions';

/**
 * Загрузка списка форм. Вызывается ОДИН раз — на странице раздела,
 * чтобы запрос не дублировался, когда данные читают несколько компонентов.
 */
export const useLoadForms = () => {
  const { load } = useFormsActions();

  useEffect(() => {
    load();
  }, [load]);
};
