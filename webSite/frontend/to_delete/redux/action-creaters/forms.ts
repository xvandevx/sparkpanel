import type { Dispatch } from 'redux';
import * as formsApi from '../../api/forms';
import type {
  CreateFormDto,
  CreateFormFieldDto,
  FormDto,
  FormFieldDto,
  UpdateFormDto,
  UpdateFormFieldDto,
} from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  FORMS_ERROR,
  FORMS_REQUEST,
  FORMS_SAVED,
  FORMS_SAVING,
  FORMS_SUCCESS,
  FormsAction,
} from '../reducers/formsReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchFormsThunk = () => async (dispatch: Dispatch<FormsAction>) => {
  dispatch({ type: FORMS_REQUEST });
  try {
    dispatch({ type: FORMS_SUCCESS, payload: await formsApi.fetchForms() });
  } catch (error) {
    dispatch({
      type: FORMS_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить список форм'),
    });
  }
};

/**
 * Создание и изменение — один thunk: форма шторки одна и та же, отличается
 * только наличием идентификатора. Возвращает сохранённую форму или null.
 */
export const saveFormThunk =
  (id: number | null, dto: CreateFormDto | UpdateFormDto) =>
  async (dispatch: Dispatch<FormsAction>): Promise<FormDto | null> => {
    dispatch({ type: FORMS_SAVING });
    try {
      const form = id
        ? await formsApi.updateForm(id, dto as UpdateFormDto)
        : await formsApi.createForm(dto as CreateFormDto);
      dispatch({ type: FORMS_SAVED });
      // Перечитываем список целиком: создание меняет и порядок соседей, и дерево.
      dispatch({ type: FORMS_SUCCESS, payload: await formsApi.fetchForms() });
      return form;
    } catch (error) {
      dispatch({
        type: FORMS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить форму'),
      });
      return null;
    }
  };

export const saveFormFieldThunk =
  (formId: number, id: number | null, dto: CreateFormFieldDto | UpdateFormFieldDto) =>
  async (dispatch: Dispatch<FormsAction>): Promise<FormFieldDto | null> => {
    dispatch({ type: FORMS_SAVING });
    try {
      const field = id
        ? await formsApi.updateFormField(formId, id, dto as UpdateFormFieldDto)
        : await formsApi.createFormField(formId, dto as CreateFormFieldDto);
      dispatch({ type: FORMS_SAVED });
      dispatch({ type: FORMS_SUCCESS, payload: await formsApi.fetchForms() });
      return field;
    } catch (error) {
      dispatch({
        type: FORMS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить поле формы'),
      });
      return null;
    }
  };

/** Удаляет форму со всеми полями; возвращает их количество или null при ошибке. */
export const removeFormThunk =
  (id: number) =>
  async (dispatch: Dispatch<FormsAction>): Promise<number | null> => {
    dispatch({ type: FORMS_SAVING });
    try {
      const removed = await formsApi.removeForm(id);
      dispatch({ type: FORMS_SAVED });
      dispatch({ type: FORMS_SUCCESS, payload: await formsApi.fetchForms() });
      return removed;
    } catch (error) {
      dispatch({
        type: FORMS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить форму'),
      });
      return null;
    }
  };

export const removeFormFieldThunk =
  (formId: number, id: number) =>
  async (dispatch: Dispatch<FormsAction>): Promise<number | null> => {
    dispatch({ type: FORMS_SAVING });
    try {
      const removed = await formsApi.removeFormField(formId, id);
      dispatch({ type: FORMS_SAVED });
      dispatch({ type: FORMS_SUCCESS, payload: await formsApi.fetchForms() });
      return removed;
    } catch (error) {
      dispatch({
        type: FORMS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить поле формы'),
      });
      return null;
    }
  };

/**
 * История читается только на время открытой шторки и в общий стейт не кладётся —
 * но запрос всё равно уходит отсюда: api/ дергается только из thunks.
 */
export const loadFormHistoryThunk = (entityId: string) => () =>
  formsApi.fetchFormHistory(entityId);

export const loadFormsJournalThunk =
  (limit: number, offset: number) => () =>
    formsApi.fetchFormsJournal(limit, offset);
