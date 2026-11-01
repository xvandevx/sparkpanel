import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  loadEditorLinkTargetsThunk,
  type EditorLinkTarget,
} from '../../redux/action-creaters/contentEditorNew';

/**
 * Записи, которые можно выбрать в поле привязки, — только из названных
 * списков: поле смотрит в свой список-источник, таблица — в источники видимых
 * колонок. Все записи панели разом повесили бы выбор, когда их станет много.
 *
 * Читаются при каждом показе поля, а не один раз на панель: роли и страницы
 * правят в своих разделах, и заведённая только что роль должна сразу оказаться
 * в выборе. Списков нет — нет и запроса.
 */
export function useLinkTargets(listKeys: string[]) {
  const dispatch = useDispatch<AppDispatch>();
  // Ключ эффекта — строка: массив с теми же списками каждый рендер новый
  const keys = Array.from(new Set(listKeys.filter((key) => key !== ''))).sort().join(',');
  const [targets, setTargets] = useState<EditorLinkTarget[]>([]);
  const [isLoading, setIsLoading] = useState(keys !== '');

  useEffect(() => {
    if (keys === '') {
      setTargets([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    // Карточку закрыли раньше ответа — класть его уже некуда
    let isActual = true;
    dispatch(loadEditorLinkTargetsThunk(keys.split(',')))
      .then((list) => {
        if (isActual) setTargets(list);
      })
      .catch(() => {
        // Не пришли — поле покажет пустой выбор, а сохранённое значение останется
        if (isActual) setTargets([]);
      })
      .finally(() => {
        if (isActual) setIsLoading(false);
      });
    return () => {
      isActual = false;
    };
  }, [dispatch, keys]);

  return { targets, isLoading };
}
