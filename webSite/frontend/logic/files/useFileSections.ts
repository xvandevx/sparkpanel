import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';
import type { FileSectionDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { fileSectionsApi } from './fileSectionsApi';

/**
 * Разделы файлов — список редактора контента, лежат в его ячейке. Их читают
 * и страница раздела, и выбор файла в карточке записи; перечитываются при
 * показе: разделы заводят и правят в «Файлах», а читают отовсюду.
 */
export function useFileSections() {
  const dispatch = useDispatch<AppDispatch>();
  const list =
    useSelector((state: RootState) => state.contentEditorNew[ListKey.fileSections]) ??
    emptyNewEditorList;

  useEffect(() => {
    dispatch(loadEditorListThunk(ListKey.fileSections, fileSectionsApi.list));
  }, [dispatch]);

  return {
    sections: list.items as FileSectionDto[],
    isLoaded: list.isLoaded,
    error: list.error,
  };
}
