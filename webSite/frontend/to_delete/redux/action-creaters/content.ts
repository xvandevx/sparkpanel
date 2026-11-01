import type { Dispatch } from 'redux';
import * as contentApi from '../../api/content';
import type {
  ContentBlockDto,
  CreateContentBlockDto,
  UpdateContentBlockDto,
} from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  CONTENT_ERROR,
  CONTENT_REQUEST,
  CONTENT_SAVED,
  CONTENT_SAVING,
  CONTENT_SUCCESS,
  ContentAction,
} from '../reducers/contentReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchContentThunk = () => async (dispatch: Dispatch<ContentAction>) => {
  dispatch({ type: CONTENT_REQUEST });
  try {
    dispatch({ type: CONTENT_SUCCESS, payload: await contentApi.fetchContentBlocks() });
  } catch (error) {
    dispatch({
      type: CONTENT_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить HTML-блоки'),
    });
  }
};

/**
 * Создание и изменение — один thunk: форма шторки одна и та же, отличается
 * только наличием идентификатора. Возвращает сохранённый блок или null.
 */
export const saveContentBlockThunk =
  (id: number | null, dto: CreateContentBlockDto | UpdateContentBlockDto) =>
  async (dispatch: Dispatch<ContentAction>): Promise<ContentBlockDto | null> => {
    dispatch({ type: CONTENT_SAVING });
    try {
      const block = id
        ? await contentApi.updateContentBlock(id, dto as UpdateContentBlockDto)
        : await contentApi.createContentBlock(dto as CreateContentBlockDto);
      dispatch({ type: CONTENT_SAVED });
      // Перечитываем список целиком: создание меняет и порядок в списке
      dispatch({ type: CONTENT_SUCCESS, payload: await contentApi.fetchContentBlocks() });
      return block;
    } catch (error) {
      dispatch({
        type: CONTENT_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить HTML-блок'),
      });
      return null;
    }
  };

/** Удаляет блок; true — удалилось. */
export const removeContentBlockThunk =
  (id: number) =>
  async (dispatch: Dispatch<ContentAction>): Promise<boolean> => {
    dispatch({ type: CONTENT_SAVING });
    try {
      await contentApi.removeContentBlock(id);
      dispatch({ type: CONTENT_SAVED });
      dispatch({ type: CONTENT_SUCCESS, payload: await contentApi.fetchContentBlocks() });
      return true;
    } catch (error) {
      dispatch({
        type: CONTENT_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить HTML-блок'),
      });
      return false;
    }
  };

/**
 * Где блок подключён — читается на время открытой шторки, как и история:
 * в общий стейт не кладётся, но запрос уходит отсюда.
 */
export const loadContentBlockUsagesThunk = (id: number) => () =>
  contentApi.fetchContentBlockUsages(id);
