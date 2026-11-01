import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  fetchElementsThunk,
  fetchStructureThunk,
  removeBlockThunk,
  removeElementThunk,
  removeSectionThunk,
  saveBlockThunk,
  saveElementThunk,
  saveSectionThunk,
} from '../../redux/action-creaters/infoblocks';
import type {
  CreateInfoblockDto,
  CreateInfoblockElementDto,
  CreateInfoblockSectionDto,
  InfoblockDto,
  InfoblockElementDto,
  InfoblockSectionDto,
  UpdateInfoblockDto,
  UpdateInfoblockElementDto,
  UpdateInfoblockSectionDto,
} from '../../src/api/client';

/**
 * Действия раздела «Инфоблоки»: только dispatch, без селекторов — хук можно
 * звать где угодно, в том числе в узлах дерева и строках таблицы, не вызывая
 * лишних перерисовок.
 */
export const useInfoblocksActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const loadStructure = useCallback(() => dispatch(fetchStructureThunk()), [dispatch]);

  const loadElements = useCallback(
    (blockId: number) => dispatch(fetchElementsThunk(blockId)),
    [dispatch],
  );

  const saveSection = useCallback(
    (
      id: number | null,
      dto: CreateInfoblockSectionDto | UpdateInfoblockSectionDto,
    ): Promise<InfoblockSectionDto | null> => dispatch(saveSectionThunk(id, dto)),
    [dispatch],
  );

  const removeSection = useCallback(
    (id: number): Promise<boolean> => dispatch(removeSectionThunk(id)),
    [dispatch],
  );

  const saveBlock = useCallback(
    (id: number | null, dto: CreateInfoblockDto | UpdateInfoblockDto): Promise<InfoblockDto | null> =>
      dispatch(saveBlockThunk(id, dto)),
    [dispatch],
  );

  const removeBlock = useCallback(
    (id: number): Promise<boolean> => dispatch(removeBlockThunk(id)),
    [dispatch],
  );

  const saveElement = useCallback(
    (
      blockId: number,
      id: number | null,
      dto: CreateInfoblockElementDto | UpdateInfoblockElementDto,
    ): Promise<InfoblockElementDto | null> => dispatch(saveElementThunk(blockId, id, dto)),
    [dispatch],
  );

  const removeElement = useCallback(
    (blockId: number, id: number): Promise<boolean> =>
      dispatch(removeElementThunk(blockId, id)),
    [dispatch],
  );

  return {
    loadStructure,
    loadElements,
    saveSection,
    removeSection,
    saveBlock,
    removeBlock,
    saveElement,
    removeElement,
  };
};
