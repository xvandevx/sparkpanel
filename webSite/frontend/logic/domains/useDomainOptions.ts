import { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  loadEditorDomainsThunk,
  type EditorDomain,
} from '../../redux/action-creaters/contentEditorNew';
import { domainOptions } from './domainOptions';

/**
 * Домены, для которых мультидоменному свойству задают своё значение.
 * Читаются при каждом показе поля, как записи привязки: домены правят
 * в «Настройках», и заведённый только что должен сразу быть в выборе.
 */
export function useDomainOptions() {
  const dispatch = useDispatch<AppDispatch>();
  const [domains, setDomains] = useState<EditorDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Карточку закрыли раньше ответа — класть его уже некуда
    let isActual = true;
    dispatch(loadEditorDomainsThunk())
      .then((list) => {
        if (isActual) setDomains(list);
      })
      .catch(() => {
        // Не пришли — выбор пуст, а сохранённые значения доменов останутся
        if (isActual) setDomains([]);
      })
      .finally(() => {
        if (isActual) setIsLoading(false);
      });
    return () => {
      isActual = false;
    };
  }, [dispatch]);

  const options = useMemo(() => domainOptions(domains), [domains]);
  return { options, isLoading };
}
