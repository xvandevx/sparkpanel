import {
  api,
  CreateFormDto,
  CreateFormFieldDto,
  FormDto,
  FormFieldDto,
  HistoryPageDto,
  HistoryRecordDto,
  UpdateFormDto,
  UpdateFormFieldDto,
} from '../src/api/client';

/**
 * Сетевой слой раздела «Веб-формы». Единственное место, где дергается
 * сгенерированный клиент; выше по стеку сюда ходят только thunks из redux/.
 */

/** Формы приходят вместе со своими полями — дерево собирает logic/forms/formsTree.ts. */
export const fetchForms = async (): Promise<FormDto[]> => {
  const { data } = await api.forms.formsControllerFindAll();
  return data;
};

export const createForm = async (dto: CreateFormDto): Promise<FormDto> => {
  const { data } = await api.forms.formsControllerCreate(dto);
  return data;
};

export const updateForm = async (id: number, dto: UpdateFormDto): Promise<FormDto> => {
  const { data } = await api.forms.formsControllerUpdate(id, dto);
  return data;
};

/** Удаляет форму вместе с её полями; возвращает, сколько полей ушло с ней. */
export const removeForm = async (id: number): Promise<number> => {
  const { data } = await api.forms.formsControllerRemove(id);
  return data.removedFields;
};

export const createFormField = async (
  formId: number,
  dto: CreateFormFieldDto,
): Promise<FormFieldDto> => {
  const { data } = await api.forms.formsControllerCreateField(formId, dto);
  return data;
};

export const updateFormField = async (
  formId: number,
  id: number,
  dto: UpdateFormFieldDto,
): Promise<FormFieldDto> => {
  const { data } = await api.forms.formsControllerUpdateField(formId, id, dto);
  return data;
};

export const removeFormField = async (formId: number, id: number): Promise<number> => {
  const { data } = await api.forms.formsControllerRemoveField(formId, id);
  return data.removedFields;
};

/** История одной записи раздела; `entityId` — ключ с приставкой: `form-1`, `field-3`. */
export const fetchFormHistory = async (entityId: string): Promise<HistoryRecordDto[]> => {
  const { data } = await api.forms.formsControllerFindHistory(entityId);
  return data;
};

/** Общий журнал изменений раздела, страницами. */
export const fetchFormsJournal = async (
  limit: number,
  offset: number,
): Promise<HistoryPageDto> => {
  const { data } = await api.forms.formsControllerFindJournal(limit, offset);
  return data;
};
