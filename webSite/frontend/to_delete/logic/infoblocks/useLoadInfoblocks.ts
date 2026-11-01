import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { useInfoblocksActions } from './useInfoblocksActions';
import { useInfoblocksRoute } from './useInfoblocksRoute';

/**
 * Структура раздела — типы вместе с их инфоблоками. Нужна не только
 * страницам раздела, но и подменю слева, поэтому грузится один раз на всю
 * сессию: повторные вызовы ничего не запрашивают.
 *
 * Сохранение перечитывает структуру само, так что «уже загружено» здесь
 * означает «в сторе лежит актуальное».
 */
export const useLoadInfoblocksStructure = () => {
  const { loadStructure } = useInfoblocksActions();
  const { loading, loaded, error } = useSelector((state: RootState) => state.infoblocks);

  /** Попытка уже была: провалившийся запрос не опрашивается по кругу. */
  const attempted = useRef(false);

  useEffect(() => {
    if (loaded || loading || attempted.current) return;
    attempted.current = true;
    loadStructure();
  }, [loadStructure, loaded, loading]);

  return { isLoading: loading, loadFailed: !loaded && !loading && error !== null, error };
};

/**
 * Записи открытого инфоблока. Грузятся при каждой смене инфоблока в адресе.
 */
export const useLoadInfoblockElements = () => {
  const { loadElements } = useInfoblocksActions();
  const { blockId } = useInfoblocksRoute();
  const elementsBlockId = useSelector(
    (state: RootState) => state.infoblocks.elementsBlockId,
  );

  /**
   * За чьими записями уже сходили в этот заход. Нужен отдельно от стора:
   * по нему видно, что попытка была и провалилась. Без него упавший запрос
   * либо перезапрашивался бы по кругу, либо не повторялся бы уже никогда.
   */
  const attempted = useRef<number | null>(null);

  useEffect(() => {
    // Ушли со страницы записей — забываем попытку: вернуться в тот же
    // инфоблок и тем самым перезапросить записи должно быть можно
    if (blockId === null) {
      attempted.current = null;
      return;
    }
    // Записи этого инфоблока уже в сторе — перечитывать нечего: сохранение
    // обновляет их само, и лишний запрос затирал бы свежий ответ старым
    if (blockId === elementsBlockId) return;
    // Попытка уже была и не удалась: повторяем по возвращению, а не сразу,
    // иначе падающий эндпоинт опрашивался бы бесконечно
    if (blockId === attempted.current) return;

    attempted.current = blockId;
    loadElements(blockId);
  }, [blockId, elementsBlockId, loadElements]);
};
