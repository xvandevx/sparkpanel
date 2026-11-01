import {
  createFormField,
  fetchFormFields,
  removeFormField,
  updateFormField,
} from '../../api/formFields';
import type { CreateFormFieldDto, UpdateFormFieldDto } from '../../src/api/client';

/**
 * Где лежат поля форм. Поле, подключённое к форме, сервер не удалит — оно
 * приходит с `isBlocked`, и редактор вместо корзины покажет замок.
 *
 * Ключ записи у редактора строковый; в базе поле адресуется числом.
 */
export const fieldsApi = {
  list: fetchFormFields,
  create: (payload: Record<string, unknown>) =>
    createFormField(payload as unknown as CreateFormFieldDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateFormField(Number(id), payload as UpdateFormFieldDto),
  remove: (id: string) => removeFormField(Number(id)),
};
