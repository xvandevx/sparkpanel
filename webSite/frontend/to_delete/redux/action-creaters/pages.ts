import type { Dispatch } from 'redux';
import * as pagesApi from '../../api/pages';
import type { CreatePageDto, PageDto, UpdatePageDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  PAGES_ERROR,
  PAGES_REQUEST,
  PAGES_SAVED,
  PAGES_SAVING,
  PAGES_SUCCESS,
  PagesAction,
} from '../reducers/pagesReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchPagesThunk = () => async (dispatch: Dispatch<PagesAction>) => {
  dispatch({ type: PAGES_REQUEST });
  try {
    dispatch({ type: PAGES_SUCCESS, payload: await pagesApi.fetchPages() });
  } catch (error) {
    dispatch({
      type: PAGES_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить список страниц'),
    });
  }
};

/**
 * Создание и изменение — один thunk: форма шторки одна и та же, отличается
 * только наличием идентификатора. Возвращает сохранённую страницу или null.
 */
export const savePageThunk =
  (id: number | null, dto: CreatePageDto | UpdatePageDto) =>
  async (dispatch: Dispatch<PagesAction>): Promise<PageDto | null> => {
    dispatch({ type: PAGES_SAVING });
    try {
      const page = id
        ? await pagesApi.updatePage(id, dto as UpdatePageDto)
        : await pagesApi.createPage(dto as CreatePageDto);
      dispatch({ type: PAGES_SAVED });
      // Перечитываем список целиком: создание меняет и порядок соседей, и дерево.
      dispatch({ type: PAGES_SUCCESS, payload: await pagesApi.fetchPages() });
      return page;
    } catch (error) {
      dispatch({
        type: PAGES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить страницу'),
      });
      return null;
    }
  };

/** Удаляет страницу со всеми вложенными; возвращает их количество или null при ошибке. */
export const removePageThunk =
  (id: number) =>
  async (dispatch: Dispatch<PagesAction>): Promise<number | null> => {
    dispatch({ type: PAGES_SAVING });
    try {
      const removed = await pagesApi.removePage(id);
      dispatch({ type: PAGES_SAVED });
      dispatch({ type: PAGES_SUCCESS, payload: await pagesApi.fetchPages() });
      return removed;
    } catch (error) {
      dispatch({
        type: PAGES_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить страницу'),
      });
      return null;
    }
  };
