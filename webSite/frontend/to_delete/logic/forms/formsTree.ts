import type { FormDto } from '../../src/api/client';
import type { EditorRow, EditorSelectOption } from '../contentEditor';

/**
 * Раздел показывает формы и их поля одной таблицей: форма — строка верхнего
 * уровня, поле — вложенная строка. Это две разные сущности с разными запросами,
 * поэтому у строки есть вид (`rowKind`), а идентификатор — с приставкой:
 * номера двух таблиц начинаются с единицы и в одном списке перепутались бы.
 *
 * Те же ключи (`form-1`, `field-3`) использует журнал изменений на бэкенде —
 * благодаря этому история строки запрашивается её же идентификатором.
 */

export const FormRowKind = {
  Form: 'form',
  Field: 'field',
} as const;

export type FormRowKind = (typeof FormRowKind)[keyof typeof FormRowKind];

export const formRowId = (id: number): string => `${FormRowKind.Form}-${id}`;
export const fieldRowId = (id: number): string => `${FormRowKind.Field}-${id}`;

/** Разобранный идентификатор строки: что это и какой номер в своей таблице. */
export interface FormsRowRef {
  kind: FormRowKind;
  id: number;
}

export function parseRowId(value: unknown): FormsRowRef | null {
  const match = /^(form|field)-(\d+)$/.exec(String(value ?? ''));
  if (!match) return null;
  return { kind: match[1] as FormRowKind, id: Number(match[2]) };
}

/** Строка таблицы: поля записи, её вид и вложенные строки. */
export type FormsRow = EditorRow & { children?: FormsRow[] };

/** Дерево строк: формы по порядку, внутри каждой — её поля. */
export function buildFormsTree(items: FormDto[]): FormsRow[] {
  return items.map((form) => {
    const children = form.fields.map((field) => ({
      ...field,
      id: fieldRowId(field.id),
      rowKind: FormRowKind.Field,
      formId: form.id,
    }));

    return {
      ...form,
      id: formRowId(form.id),
      rowKind: FormRowKind.Form,
      fieldsCount: form.fields.length,
      // Пустой children antd показал бы как раскрывающуюся строку без содержимого
      ...(children.length > 0 ? { children } : {}),
    };
  });
}

export const findForm = (items: FormDto[], id: number | null): FormDto | null =>
  items.find((form) => form.id === id) ?? null;

/**
 * Форма, в которую попадёт новое поле. Кнопка «добавить внутрь» есть у каждой
 * строки: на форме это её поля, на поле — соседнее поле той же формы.
 */
export function targetFormId(items: FormDto[], parentRowId: string | null): number | null {
  const ref = parseRowId(parentRowId);
  if (!ref) return null;
  if (ref.kind === FormRowKind.Form) return findForm(items, ref.id)?.id ?? null;
  return items.find((form) => form.fields.some((field) => field.id === ref.id))?.id ?? null;
}

/** Список форм для выбора: в поле видно, какой форме оно принадлежит. */
export const formOptions = (items: FormDto[]): EditorSelectOption[] =>
  items.map((form) => ({
    label: form.name,
    value: String(form.id),
    description: form.code,
  }));

/** Шаг сортировки — тот же, что на бэкенде: между соседями остаётся место. */
const POSITION_STEP = 100;

/** Порядок новой формы: следом за последней. */
export function nextFormPosition(items: FormDto[]): number {
  if (items.length === 0) return POSITION_STEP;
  return Math.max(...items.map((form) => form.position)) + POSITION_STEP;
}

/** Порядок нового поля: следом за последним полем этой формы. */
export function nextFieldPosition(items: FormDto[], formId: number | null): number {
  const fields = findForm(items, formId)?.fields ?? [];
  if (fields.length === 0) return POSITION_STEP;
  return Math.max(...fields.map((field) => field.position)) + POSITION_STEP;
}
