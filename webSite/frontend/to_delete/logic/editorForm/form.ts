import {
  EditorFieldDef,
  EditorFieldGroup,
  EditorFieldType,
  EditorSelectOption,
  EditorValues,
} from './types';
import { htmlBlockToken, missingHtmlBlocks } from './htmlBlocks';
import { unknownVariables } from './variables';

/** Значения формы: чтение, запись, проверка. Чистые функции — без React и сети. */

export const fieldOptions = (
  field: EditorFieldDef,
  values: EditorValues,
): EditorSelectOption[] => {
  if (!field.options) return [];
  return typeof field.options === 'function' ? field.options(values) : field.options;
};

export const isFieldVisible = (field: EditorFieldDef, values: EditorValues): boolean =>
  !field.hidden?.(values);

/**
 * Группы, которые есть смысл показывать: не скрытые сами и с хотя бы одним видимым
 * полем. Группа из одних скрытых полей — это заголовок над пустотой.
 */
export function visibleGroups(
  groups: EditorFieldGroup[],
  fields: EditorFieldDef[],
  values: EditorValues,
): EditorFieldGroup[] {
  const fieldByKey = new Map(fields.map((field) => [field.key, field]));
  return groups.filter(
    (group) =>
      !group.hidden?.(values) &&
      group.fields.some((key) => {
        const field = fieldByKey.get(key);
        return field ? isFieldVisible(field, values) : false;
      }),
  );
}

/**
 * Новое состояние формы после правки поля. Каскад (`onChange` поля) может поменять
 * и соседние значения — например, сброс шаблона меты при переходе в статичную страницу.
 */
export function applyFieldChange(
  field: EditorFieldDef,
  value: unknown,
  values: EditorValues,
): EditorValues {
  const next = { ...values, [field.key]: value };
  return field.onChange ? { ...next, ...field.onChange(value, next) } : next;
}

const isEmpty = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  // Множественное поле с одной пустой строкой и таблица из пустых ячеек
  // заполненными не считаются — массив проверяется насквозь
  (Array.isArray(value) && value.every(isEmpty));

/**
 * Первая ошибка формы или null. Скрытые поля не проверяются: у статичной страницы
 * шаблон меты не показан, и требовать его заполнения бессмысленно.
 */
export function validateValues(
  fields: EditorFieldDef[],
  values: EditorValues,
): string | null {
  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue;
    if (field.type === EditorFieldType.ReadOnly) continue;

    if (field.required && isEmpty(values[field.key])) {
      return `Поле «${field.label}» обязательно`;
    }

    const invalid = field.validate?.(values[field.key], values);
    if (invalid) return invalid;
  }

  return null;
}

/**
 * Предупреждения (сохранять не мешают): незнакомые переменные в шаблонах
 * и маркеры HTML-блоков, которых нет, — на сайте на их месте будет пусто.
 */
export function collectWarnings(fields: EditorFieldDef[], values: EditorValues): string[] {
  const warnings: string[] = [];

  for (const field of fields) {
    if (!isFieldVisible(field, values)) continue;

    if (field.variables) {
      const unknown = unknownVariables(values[field.key], field.variables);
      if (unknown.length > 0) {
        warnings.push(
          `«${field.label}»: неизвестные переменные ${unknown
            .map((name) => `#${name}#`)
            .join(', ')}`,
        );
      }
    }

    if (field.htmlBlocks) {
      const missing = missingHtmlBlocks(values[field.key], field.htmlBlocks);
      if (missing.length > 0) {
        warnings.push(
          `«${field.label}»: нет HTML-блоков ${missing.map(htmlBlockToken).join(', ')}`,
        );
      }
    }
  }

  return warnings;
}

/** Значения сравниваем как JSON: этого хватает для строк, чисел и флагов формы. */
export const valuesEqual = (a: EditorValues, b: EditorValues): boolean => {
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)]));
  for (const key of keys) {
    if (JSON.stringify(a[key] ?? null) !== JSON.stringify(b[key] ?? null)) return false;
  }
  return true;
};

/** Варианты по группам — в порядке первого появления группы; без группы — отдельным блоком. */
export function groupOptions(
  options: EditorSelectOption[],
): { group: string | null; options: EditorSelectOption[] }[] {
  const groups = new Map<string | null, EditorSelectOption[]>();
  for (const option of options) {
    const key = option.group ?? null;
    groups.set(key, [...(groups.get(key) ?? []), option]);
  }
  return Array.from(groups, ([group, items]) => ({ group, options: items }));
}

/** Длинный или сгруппированный список удобнее искать, чем листать. */
export const isSearchable = (options: EditorSelectOption[]): boolean =>
  options.length > 8 || options.some((option) => option.group);
