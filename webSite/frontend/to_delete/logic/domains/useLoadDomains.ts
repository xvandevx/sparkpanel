import { useEffect } from 'react';
import { useDomainsActions } from './useDomainsActions';

/**
 * Загрузка доменов. Вызывается ОДИН раз — на экране раздела,
 * чтобы запрос не дублировался, когда данные читают несколько компонентов.
 */
export const useLoadDomains = () => {
  const { load } = useDomainsActions();

  useEffect(() => {
    load();
  }, [load]);
};
