import { api, CreateFormFieldDto, FormFieldDto, UpdateFormFieldDto } from '../src/api/client';

/**
 * Сетевой слой полей форм (`/api/infoblocks/forms/fields` — список редактора
 * контента). Единственное место, где дергается сгенерированный клиент.
 */

export const fetchFormFields = async (): Promise<FormFieldDto[]> => {
  const { data } = await api.formFields.formFieldsControllerFindAll();
  return data;
};

export const createFormField = async (dto: CreateFormFieldDto): Promise<FormFieldDto> => {
  const { data } = await api.formFields.formFieldsControllerCreate(dto);
  return data;
};

export const updateFormField = async (
  id: number,
  dto: UpdateFormFieldDto,
): Promise<FormFieldDto> => {
  const { data } = await api.formFields.formFieldsControllerUpdate(id, dto);
  return data;
};

/** Удаляет поле, не подключённое ни к одной форме: подключённое сервер не отдаст (409). */
export const removeFormField = async (id: number): Promise<void> => {
  await api.formFields.formFieldsControllerRemove(id);
};
