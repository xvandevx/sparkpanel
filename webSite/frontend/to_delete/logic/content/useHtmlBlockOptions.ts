import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import type { EditorHtmlBlock } from '../editorForm';
import { toHtmlBlockOptions } from './htmlBlockLinks';

/**
 * HTML-блоки для поля разметки в любом разделе: страница, запись инфоблока.
 * Раздел отдаёт их полю в `htmlBlocks` — и в нём появляется выбор блока.
 *
 * Сам список не грузит: экран раздела один раз зовёт `useLoadHtmlBlocks()`.
 */
export const useHtmlBlockOptions = (): EditorHtmlBlock[] => {
  const items = useSelector((state: RootState) => state.content.items);
  return useMemo(() => toHtmlBlockOptions(items), [items]);
};
