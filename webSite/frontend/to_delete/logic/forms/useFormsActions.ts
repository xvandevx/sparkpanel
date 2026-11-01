import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  fetchFormsThunk,
  removeFormFieldThunk,
  removeFormThunk,
  saveFormFieldThunk,
  saveFormThunk,
} from '../../redux/action-creaters/forms';
import type {
  CreateFormDto,
  CreateFormFieldDto,
  FormDto,
  FormFieldDto,
  UpdateFormDto,
  UpdateFormFieldDto,
} from '../../src/api/client';

/**
 * Действия раздела «Веб-формы»: только dispatch, без селекторов — хук можно звать
 * где угодно, в том числе в строках таблицы, не вызывая лишних перерисовок.
 */
export const useFormsActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback(() => dispatch(fetchFormsThunk()), [dispatch]);

  const saveForm = useCallback(
    (id: number | null, dto: CreateFormDto | UpdateFormDto): Promise<FormDto | null> =>
      dispatch(saveFormThunk(id, dto)),
    [dispatch],
  );

  const saveField = useCallback(
    (
      formId: number,
      id: number | null,
      dto: CreateFormFieldDto | UpdateFormFieldDto,
    ): Promise<FormFieldDto | null> => dispatch(saveFormFieldThunk(formId, id, dto)),
    [dispatch],
  );

  const removeForm = useCallback(
    (id: number): Promise<number | null> => dispatch(removeFormThunk(id)),
    [dispatch],
  );

  const removeField = useCallback(
    (formId: number, id: number): Promise<number | null> =>
      dispatch(removeFormFieldThunk(formId, id)),
    [dispatch],
  );

  return { load, saveForm, saveField, removeForm, removeField };
};
