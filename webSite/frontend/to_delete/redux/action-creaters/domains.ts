import type { Dispatch } from 'redux';
import * as domainsApi from '../../api/domains';
import type { CreateDomainDto, DomainDto, UpdateDomainDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  DOMAINS_ERROR,
  DOMAINS_REQUEST,
  DOMAINS_SAVED,
  DOMAINS_SAVING,
  DOMAINS_SUCCESS,
  DomainsAction,
} from '../reducers/domainsReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchDomainsThunk = () => async (dispatch: Dispatch<DomainsAction>) => {
  dispatch({ type: DOMAINS_REQUEST });
  try {
    dispatch({ type: DOMAINS_SUCCESS, payload: await domainsApi.fetchDomains() });
  } catch (error) {
    dispatch({
      type: DOMAINS_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить список доменов'),
    });
  }
};

/**
 * Создание и изменение — один thunk: форма шторки одна и та же, отличается
 * только наличием идентификатора. Возвращает сохранённый домен или null.
 */
export const saveDomainThunk =
  (id: number | null, dto: CreateDomainDto | UpdateDomainDto) =>
  async (dispatch: Dispatch<DomainsAction>): Promise<DomainDto | null> => {
    dispatch({ type: DOMAINS_SAVING });
    try {
      const domain = id
        ? await domainsApi.updateDomain(id, dto as UpdateDomainDto)
        : await domainsApi.createDomain(dto as CreateDomainDto);
      dispatch({ type: DOMAINS_SAVED });
      // Перечитываем список целиком: сервер мог достроить имя и поменять порядок
      dispatch({ type: DOMAINS_SUCCESS, payload: await domainsApi.fetchDomains() });
      return domain;
    } catch (error) {
      dispatch({
        type: DOMAINS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить домен'),
      });
      return null;
    }
  };

export const removeDomainThunk =
  (id: number) =>
  async (dispatch: Dispatch<DomainsAction>): Promise<boolean> => {
    dispatch({ type: DOMAINS_SAVING });
    try {
      await domainsApi.removeDomain(id);
      dispatch({ type: DOMAINS_SAVED });
      dispatch({ type: DOMAINS_SUCCESS, payload: await domainsApi.fetchDomains() });
      return true;
    } catch (error) {
      dispatch({
        type: DOMAINS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить домен'),
      });
      return false;
    }
  };

/**
 * История читается только на время открытой шторки и в общий стейт не кладётся —
 * но запрос всё равно уходит отсюда: api/ дергается только из thunks.
 */
export const loadDomainHistoryThunk = (id: number) => () => domainsApi.fetchDomainHistory(id);

export const loadDomainsJournalThunk = (limit: number, offset: number) => () =>
  domainsApi.fetchDomainsJournal(limit, offset);
