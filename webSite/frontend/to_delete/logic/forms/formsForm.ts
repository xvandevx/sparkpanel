import type {
  CreateFormDto,
  CreateFormFieldDto,
  FormDto,
  UpdateFormDto,
  UpdateFormFieldDto,
} from '../../src/api/client';
import type { EditorRecord, EditorValues } from '../contentEditor';
import { FormRowKind, nextFieldPosition, nextFormPosition, parseRowId } from './formsTree';

/**
 * Значения формы редактора ↔ тело запроса. Чистые функции: ни React, ни сети.
 *
 * Набор ключей у формы и у поля формы один и тот же — лишнее просто пусто.
 * Так редактор одинаково сравнивает «изменено / не изменено» в обоих случаях.
 */

/** Подпись кнопки по умолчанию — та же, что в forms.service.ts на бэкенде. */
export const DEFAULT_SUBMIT_LABEL = 'Отправить';

/** Совпадает с FORM_CODE_PATTERN в CreateFormDto на бэкенде. */
const FORM_CODE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Совпадает с FORM_FIELD_CODE_PATTERN. */
const FIELD_CODE_RE = /^[a-z][a-z0-9_]*$/;
/** Совпадает с NOTIFY_EMAIL_PATTERN (пустое значение там разрешено отдельно). */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const text = (value: unknown): string => String(value ?? '').trim();

/** Возвращает текст ошибки или null, если значение корректно. */
export const validateFormCode = (value: unknown): string | null => {
  const code = text(value);
  if (!code) return null; // пустоту ловит `required` — сообщение там понятнее
  if (!FORM_CODE_RE.test(code)) {
    return 'Код: строчные латинские буквы, цифры и дефис между ними — например, feedback';
  }
  return null;
};

export const validateFieldCode = (value: unknown): string | null => {
  const code = text(value);
  if (!code) return null;
  if (!FIELD_CODE_RE.test(code)) {
    return 'Код поля: латинские буквы, цифры и подчёркивание, начиная с буквы — например, user_phone';
  }
  return null;
};

/** Пустой адрес допустим: заявка сохранится, письмо просто никуда не уйдёт. */
export const validateNotifyEmail = (value: unknown): string | null => {
  const email = text(value).toLowerCase();
  if (!email) return null;
  return EMAIL_RE.test(email) ? null : 'Почта указана неверно — например, sales@example.com';
};

/** Варианты списка: вводятся по одному, пустые и повторы отбрасываем. */
export const normalizeOptions = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item ?? '').trim()).filter(Boolean)));
};

/** Пустой набор значений: от него собираются и новая запись, и существующая. */
const blankValues = (): EditorValues => ({
  id: NEW_RECORD_ID,
  rowKind: FormRowKind.Form,
  code: '',
  name: '',
  description: '',
  notifyEmail: '',
  submitLabel: DEFAULT_SUBMIT_LABEL,
  successMessage: '',
  formId: null,
  label: '',
  fieldCode: '',
  type: 'text',
  placeholder: '',
  options: [] as string[],
  isRequired: false,
  position: 0,
  isActive: true,
});

/** Идентификатор в форме новой записи: настоящий выдаст бэкенд при сохранении. */
const NEW_RECORD_ID = 'будет присвоен при сохранении';

/**
 * Значения существующей записи. Строка таблицы — это форма или её поле
 * (`rowKind`), и поля формы читаются из разных наборов ключей.
 */
export function recordValues(record: EditorRecord): EditorValues {
  const isField = record.rowKind === FormRowKind.Field;

  return {
    ...blankValues(),
    id: record.id,
    rowKind: isField ? FormRowKind.Field : FormRowKind.Form,
    position: Number(record.position ?? 0),
    isActive: record.isActive !== false,
    ...(isField
      ? {
          formId: record.formId === undefined ? null : String(record.formId),
          fieldCode: String(record.code ?? ''),
          label: String(record.label ?? ''),
          type: String(record.type ?? 'text'),
          placeholder: String(record.placeholder ?? ''),
          options: normalizeOptions(record.options),
          isRequired: record.isRequired === true,
        }
      : {
          code: String(record.code ?? ''),
          name: String(record.name ?? ''),
          description: String(record.description ?? ''),
          notifyEmail: String(record.notifyEmail ?? ''),
          submitLabel: String(record.submitLabel ?? ''),
          successMessage: String(record.successMessage ?? ''),
        }),
  };
}

/**
 * Значения новой записи. Родителя даёт редактор: его нет — добавляют форму,
 * есть — поле в ту форму, внутри которой нажали «добавить».
 */
export function newValues(items: FormDto[], formId: number | null): EditorValues {
  if (formId === null) {
    return { ...blankValues(), position: nextFormPosition(items) };
  }

  return {
    ...blankValues(),
    rowKind: FormRowKind.Field,
    formId: String(formId),
    position: nextFieldPosition(items, formId),
  };
}

/** Какая запись сейчас в форме: она же определяет, куда уйдёт сохранение. */
export const valuesRowKind = (values: EditorValues): FormRowKind =>
  values.rowKind === FormRowKind.Field ? FormRowKind.Field : FormRowKind.Form;

/** Номер формы, которой принадлежит поле в форме редактора. */
export const valuesFormId = (values: EditorValues): number | null => {
  const id = Number(values.formId);
  return Number.isFinite(id) && id > 0 ? id : null;
};

/** Номер записи в своей таблице: у новой записи его ещё нет. */
export const recordNumber = (id: string | null): number | null => parseRowId(id)?.id ?? null;

export function toFormPayload(values: EditorValues): CreateFormDto | UpdateFormDto {
  return {
    code: text(values.code),
    name: text(values.name),
    description: text(values.description) || null,
    notifyEmail: text(values.notifyEmail).toLowerCase(),
    submitLabel: text(values.submitLabel) || DEFAULT_SUBMIT_LABEL,
    successMessage: text(values.successMessage) || null,
    isActive: values.isActive !== false,
    position: Number(values.position) || 0,
  };
}

export function toFieldPayload(
  values: EditorValues,
): CreateFormFieldDto | UpdateFormFieldDto {
  return {
    code: text(values.fieldCode),
    label: text(values.label),
    // Тип приходит из списка в форме — это одно из значений перечисления DTO
    type: text(values.type) as CreateFormFieldDto['type'],
    placeholder: text(values.placeholder) || null,
    // Варианты нужны только списку; у остальных типов бэкенд их всё равно очистит
    options: normalizeOptions(values.options),
    isRequired: values.isRequired === true,
    isActive: values.isActive !== false,
    position: Number(values.position) || 0,
  };
}
