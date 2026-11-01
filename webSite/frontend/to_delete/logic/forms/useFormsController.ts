import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadFormHistoryThunk,
  loadFormsJournalThunk,
} from '../../redux/action-creaters/forms';
import {
  toEditorHistoryPage,
  toEditorHistoryRecord,
  type ContentEditorController,
  type EditorRecord,
  type EditorRow,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import { FORM_HISTORY_LABELS, formColumns, formFields, formTabs } from './formsFields';
import {
  newValues,
  recordNumber,
  recordValues,
  toFieldPayload,
  toFormPayload,
  valuesFormId,
  valuesRowKind,
} from './formsForm';
import {
  FormRowKind,
  buildFormsTree,
  fieldRowId,
  formRowId,
  parseRowId,
  targetFormId,
} from './formsTree';
import { useFormsActions } from './useFormsActions';

/**
 * Раздел «Веб-формы» для универсального редактора контента: данные из стора,
 * описание полей, сохранение и удаление. Редактор о формах ничего не знает.
 *
 * Раздел держит две сущности: форму и её поле. Какая из них в строке — видно по
 * идентификатору (`form-1` / `field-3`), и от этого зависит, какой запрос уйдёт.
 */
export const useFormsController = (): ContentEditorController => {
  const { items, loading, saving, error } = useSelector((state: RootState) => state.forms);
  const { saveForm, saveField, removeForm, removeField } = useFormsActions();
  const dispatch = useDispatch<AppDispatch>();

  const rows = useMemo(() => buildFormsTree(items), [items]);
  // Список форм нужен полю: в нём видно, какой форме оно принадлежит
  const fields = useMemo(() => formFields(items), [items]);

  const valuesOf = useCallback((record: EditorRecord): EditorValues => recordValues(record), []);

  const emptyValues = useCallback(
    (parentId: string | null): EditorValues => newValues(items, targetFormId(items, parentId)),
    [items],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const number = recordNumber(id);

      if (valuesRowKind(values) === FormRowKind.Field) {
        const formId = valuesFormId(values);
        if (formId === null) return null;
        const field = await saveField(formId, number, toFieldPayload(values));
        return field ? fieldRowId(field.id) : null;
      }

      const form = await saveForm(number, toFormPayload(values));
      return form ? formRowId(form.id) : null;
    },
    [saveField, saveForm],
  );

  const remove = useCallback(
    async (record: EditorRow) => {
      const ref = parseRowId(record.id);
      if (!ref) return false;

      if (ref.kind === FormRowKind.Field) {
        return (await removeField(Number(record.formId), ref.id)) !== null;
      }
      return (await removeForm(ref.id)) !== null;
    },
    [removeField, removeForm],
  );

  // Идентификатор строки совпадает с ключом записи в журнале — история
  // запрашивается им же, без отдельного преобразования.
  const loadRecordHistory = useCallback(
    async (id: string) => (await dispatch(loadFormHistoryThunk(id))).map(toEditorHistoryRecord),
    [dispatch],
  );

  const loadJournal = useCallback(
    async (limit: number, offset: number) =>
      toEditorHistoryPage(await dispatch(loadFormsJournalThunk(limit, offset))),
    [dispatch],
  );

  return {
    list: {
      title: 'Формы обратной связи',
      addLabel: 'Добавить форму',
      rows,
      columns: useMemo(formColumns, []),
      isLoading: loading,
      isSaving: saving,
      error,
      // Вложенность здесь — поля формы: «добавить внутрь» на любой строке
      // добавляет поле в ту форму, к которой строка относится
      supportsNesting: true,
    },
    form: {
      fields,
      tabs: useMemo(formTabs, []),
      emptyValues,
      valuesOf,
    },
    actions: {
      save,
      remove,
    },
    history: {
      loadRecord: loadRecordHistory,
      loadJournal,
      fieldLabels: FORM_HISTORY_LABELS,
    },
    // Свойства — у форм; у их полей своя форма, и свойства списка к ним не относятся
    settings: {
      key: ListKey.forms,
      appliesTo: (values) => valuesRowKind(values) === FormRowKind.Form,
    },
  };
};
