import { slugify, uniqueSlug } from '../slug';
import type { EditorFieldDef, EditorValues } from '../editorForm';

/**
 * Символьный код записи по настройкам списка: есть ли он у записей вообще,
 * обязателен ли и проверяется ли на уникальность. Плюс главное правило —
 * **код собирается из названия**, одинаково во всех разделах.
 *
 * Чистые функции: редактор только подмешивает результат к полям раздела.
 */

/** Ключи полей раздела, которые знает редактор: они одинаковы во всех разделах. */
export const CODE_FIELD = 'code';
export const NAME_FIELD = 'name';

export interface CodePolicy {
  /** У записей есть код; выключен — поля «Код» в карточке нет */
  useCode: boolean;
  required: boolean;
  unique: boolean;
  /**
   * Открыта новая запись. По значениям это не определить: разделы кладут
   * в `id` заглушку «будет присвоен при сохранении», а не пусто.
   */
  isNew: boolean;
}

/**
 * Поля раздела с учётом политики кода. Поле `code` прячется, когда кода у списка
 * нет, становится обязательным и проверяется на уникальность; поле `name`
 * получает подстановку кода.
 *
 * `otherCodes` — коды остальных записей списка: по ним и уникальность, и
 * подстановка (второй «Акции» получит `akcii-2`).
 */
export function applyCodePolicy(
  fields: EditorFieldDef[],
  policy: CodePolicy,
  otherCodes: (values: EditorValues) => string[],
): EditorFieldDef[] {
  const codeField = fields.find((field) => field.key === CODE_FIELD);
  if (!codeField) return fields;

  return fields.map((field) => {
    if (field.key === CODE_FIELD) {
      return {
        ...field,
        // Скрытое поле не проверяется и не рисуется, но значение записи остаётся
        // как было: выключенный код её не портит
        hidden: policy.useCode ? field.hidden : () => true,
        // Скрытое поле заполнить нечем, поэтому обязательным его не делаем:
        // значение у него всё равно есть — его подставляет название
        required: policy.useCode && (policy.required || field.required === true),
        validate: (value, values) => {
          const own = field.validate?.(value, values) ?? null;
          if (own || !policy.useCode || !policy.unique) return own;
          const code = String(value ?? '').trim();
          return code && otherCodes(values).includes(code)
            ? `Код «${code}» уже занят другой записью списка`
            : null;
        },
      };
    }

    // Код собирается из названия и у списка без кода: поле скрыто, но сама
    // запись сайту без кода не нужна — разделы по-прежнему требуют его непустым
    if (field.key === NAME_FIELD) {
      return {
        ...field,
        onChange: (value, values) => ({
          ...(field.onChange?.(value, values) ?? {}),
          ...codeFromName(String(value ?? ''), values, codeField, policy, otherCodes),
        }),
      };
    }

    return field;
  });
}

/**
 * Код из названия. У новой записи он идёт за названием — пока её не сохранили,
 * ломать нечего; у сохранённой подставляется, только если кода ещё нет: менять
 * код сохранённой записи нельзя, по нему её открывает сайт.
 *
 * Результат прогоняется через `onChange` самого поля кода: у страниц от кода
 * считается адрес, и он должен пересчитаться вместе с ним.
 */
function codeFromName(
  name: string,
  values: EditorValues,
  codeField: EditorFieldDef,
  policy: CodePolicy,
  otherCodes: (values: EditorValues) => string[],
): EditorValues {
  const current = String(values[CODE_FIELD] ?? '').trim();
  if (!policy.isNew && current) return {};

  const code = policy.unique ? uniqueSlug(name, otherCodes(values), '') : slugify(name);
  if (code === current) return {};

  const next = { ...values, [CODE_FIELD]: code };
  return { [CODE_FIELD]: code, ...(codeField.onChange?.(code, next) ?? {}) };
}
