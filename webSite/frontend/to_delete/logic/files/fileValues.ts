import type { EditorValues } from '../editorForm';

/** Мелочь, общая контроллерам раздела: приведение значений формы к данным запроса. */

export const text = (value: unknown): string => String(value ?? '').trim();

/** Номер записи из значения формы или ключа строки; мусор — это null, а не NaN. */
export const toNumericId = (value: unknown): number | null => {
  const number = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(number) && number > 0 ? number : null;
};

/** Файлы, выбранные в поле загрузки: до сохранения они лежат прямо в значениях формы. */
export const pickedFiles = (values: EditorValues, key = 'files'): File[] =>
  Array.isArray(values[key]) ? (values[key] as File[]) : [];
