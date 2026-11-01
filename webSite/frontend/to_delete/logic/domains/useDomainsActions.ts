import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  fetchDomainsThunk,
  removeDomainThunk,
  saveDomainThunk,
} from '../../redux/action-creaters/domains';
import type { CreateDomainDto, DomainDto, UpdateDomainDto } from '../../src/api/client';

/**
 * Действия доменов: только dispatch, без селекторов — хук можно звать где угодно,
 * в том числе в строках таблицы, не вызывая лишних перерисовок.
 */
export const useDomainsActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback(() => dispatch(fetchDomainsThunk()), [dispatch]);

  const save = useCallback(
    (id: number | null, dto: CreateDomainDto | UpdateDomainDto): Promise<DomainDto | null> =>
      dispatch(saveDomainThunk(id, dto)),
    [dispatch],
  );

  const remove = useCallback(
    (id: number): Promise<boolean> => dispatch(removeDomainThunk(id)),
    [dispatch],
  );

  return { load, save, remove };
};
