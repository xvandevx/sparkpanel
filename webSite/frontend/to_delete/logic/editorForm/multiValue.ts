/**
 * Значение множественного поля — список. Множественность можно включить любому
 * типу свойства, поэтому список бывает и из строк, и из чисел, и из разметки;
 * чистые функции — без React: поле только рисует строки и отдаёт правку сюда.
 *
 * Выбор (список вариантов, файлы, блоки, привязки) сюда не попадает: у него
 * множественность рисует сам Select или поле медиатеки.
 */

/** Значение → список. Одиночное значение, сохранённое до включения галочки, не теряется. */
export const multiValues = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];

/** Список после правки одной строки. */
export const setMultiValue = (value: unknown, index: number, next: unknown): unknown[] =>
  multiValues(value).map((item, at) => (at === index ? next : item));

/** Список с новой пустой строкой в конце. */
export const addMultiValue = (value: unknown, empty: unknown): unknown[] => [
  ...multiValues(value),
  empty,
];

/** Список без одной строки. */
export const removeMultiValue = (value: unknown, index: number): unknown[] =>
  multiValues(value).filter((_item, at) => at !== index);
