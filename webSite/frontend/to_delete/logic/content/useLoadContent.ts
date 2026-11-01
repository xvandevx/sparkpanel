import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { useContentActions } from './useContentActions';

/**
 * Загрузка HTML-блоков. Вызывается ОДИН раз — на странице раздела,
 * чтобы запрос не дублировался, когда данные читают несколько компонентов.
 */
export const useLoadContent = () => {
  const { load } = useContentActions();

  useEffect(() => {
    load();
  }, [load]);
};

/**
 * HTML-блоки для подключения в других разделах (страницы, записи инфоблоков).
 * Там список нужен только для выбора, поэтому грузится один раз на сессию:
 * сохранение блока в его разделе перечитывает список само, и «уже загружено»
 * означает «в сторе лежит актуальное».
 */
export const useLoadHtmlBlocks = () => {
  const { load } = useContentActions();
  const { loading, loaded } = useSelector((state: RootState) => state.content);

  /** Попытка уже была: провалившийся запрос не опрашивается по кругу. */
  const attempted = useRef(false);

  useEffect(() => {
    if (loaded || loading || attempted.current) return;
    attempted.current = true;
    load();
  }, [load, loaded, loading]);
};
