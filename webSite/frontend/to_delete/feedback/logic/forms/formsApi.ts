import { createForm, fetchForms, removeForm, updateForm } from '../../api/forms';
import type { CreateFormDto, UpdateFormDto } from '../../src/api/client';

/**
 * Где лежат формы обратной связи. Поля сюда не входят: это системное свойство
 * «Поля», его значения редактор сохраняет сам вторым запросом. Форму, выбранную
 * в привязке другой записи, сервер не удалит — она приходит с `isBlocked`.
 *
 * Ключ записи у редактора строковый; в базе форма адресуется числом.
 */
export const formsApi = {
  list: fetchForms,
  create: (payload: Record<string, unknown>) => createForm(payload as unknown as CreateFormDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateForm(Number(id), payload as UpdateFormDto),
  remove: (id: string) => removeForm(Number(id)),
};
