import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  fetchContentThunk,
  removeContentBlockThunk,
  saveContentBlockThunk,
} from '../../redux/action-creaters/content';
import type {
  ContentBlockDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
} from '../../src/api/client';

/**
 * Действия раздела «HTML-блоки»: только dispatch, без селекторов — хук можно звать
 * где угодно, в том числе в строках таблицы, не вызывая лишних перерисовок.
 */
export const useContentActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback(() => dispatch(fetchContentThunk()), [dispatch]);

  const save = useCallback(
    (
      id: number | null,
      dto: CreateContentBlockDto | UpdateContentBlockDto,
    ): Promise<ContentBlockDto | null> => dispatch(saveContentBlockThunk(id, dto)),
    [dispatch],
  );

  const remove = useCallback(
    (id: number): Promise<boolean> => dispatch(removeContentBlockThunk(id)),
    [dispatch],
  );

  return { load, save, remove };
};
