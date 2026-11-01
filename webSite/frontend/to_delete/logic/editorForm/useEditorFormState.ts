import { useCallback, useEffect, useMemo, useState } from 'react';
import { applyFieldChange, collectWarnings, validateValues, valuesEqual, visibleGroups } from './form';
import type { EditorFieldDef, EditorFieldGroup, EditorFormValue, EditorValues } from './types';

export interface EditorFormState {
  /** Всё, что нужно компонентам формы для отрисовки */
  form: EditorFormValue;
  values: EditorValues;
  /** В форме есть несохранённые правки */
  isChanged: boolean;
  /** Предупреждения, которые сохранять не мешают (незнакомые переменные) */
  warnings: string[];
  /** Первая ошибка формы или null */
  validate: () => string | null;
  /** Вернуть форму к состоянию на момент открытия */
  reset: () => void;
  /**
   * Принять значения за исходные — после успешного сохранения. С аргументом
   * форма заодно перечитывается (сервер мог нормализовать введённое).
   */
  commit: (next?: EditorValues) => void;
}

/**
 * Состояние формы, описанной данными: значения, правки, проверка.
 * Одно на всех, кто рисует такие формы, — шторка редактора контента и отдельные
 * экраны вроде «Настроек». Данных и сети здесь нет: откуда брать значения и куда
 * их сохранять, решает вызывающий.
 */
export function useEditorFormState(params: {
  fields: EditorFieldDef[];
  groups: EditorFieldGroup[];
  /** Откуда форма читается при смене ключа */
  read: () => EditorValues;
  /** Пока ключ не меняется, набранное в форме остаётся на месте */
  formKey: string;
}): EditorFormState {
  const { fields, groups, read, formKey } = params;

  const [values, setValues] = useState<EditorValues>(read);
  const [initialValues, setInitialValues] = useState<EditorValues>(values);

  useEffect(() => {
    const next = read();
    setValues(next);
    setInitialValues(next);
    // Перечитываем форму именно по смене ключа: обновление соседних данных
    // не должно затирать то, что сейчас набрано в открытой форме.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formKey]);

  const fieldByKey = useMemo(() => {
    const map = new Map<string, EditorFieldDef>();
    for (const field of fields) map.set(field.key, field);
    return map;
  }, [fields]);

  const setFieldValue = useCallback(
    (key: string, value: unknown) => {
      const field = fieldByKey.get(key);
      if (!field) return;
      setValues((prev) => applyFieldChange(field, value, prev));
    },
    [fieldByKey],
  );

  const isChanged = useMemo(
    () => !valuesEqual(values, initialValues),
    [initialValues, values],
  );

  const warnings = useMemo(() => collectWarnings(fields, values), [fields, values]);

  const form: EditorFormValue = useMemo(
    () => ({
      fields,
      groups: visibleGroups(groups, fields, values),
      values,
      setFieldValue,
    }),
    [fields, groups, setFieldValue, values],
  );

  const validate = useCallback(() => validateValues(fields, values), [fields, values]);

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  const commit = useCallback(
    (next?: EditorValues) => {
      if (next) setValues(next);
      setInitialValues(next ?? values);
    },
    [values],
  );

  return { form, values, isChanged, warnings, validate, reset, commit };
}
