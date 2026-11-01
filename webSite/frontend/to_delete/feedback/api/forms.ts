import { api, CreateFormDto, FormDto, UpdateFormDto } from '../src/api/client';

/**
 * Сетевой слой форм обратной связи (`/api/infoblocks/forms` — список редактора
 * контента). Единственное место, где дергается сгенерированный клиент.
 */

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

/** Удаляет форму; значения её свойств, в том числе подключённые поля, сервер стирает сам. */
export const removeForm = async (id: number): Promise<void> => {
  await api.forms.formsControllerRemove(id);
};
