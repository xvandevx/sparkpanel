/**
 * Значение свойства «Таблица» — строки ячеек `string[][]`. Столбцов ровно
 * столько, сколько в настройках свойства, строк — сколько завели в карточке.
 * Так же таблицу приводит и сервер (`toTable` в `property.ts`): лишние ячейки
 * отрезает, недостающие добивает пустыми, пустые строки с конца не хранит.
 */

export type TableRows = string[][];

/** Что пришло — в строки ровно по числу столбцов. Не таблица — строк нет. */
export const tableRows = (value: unknown, columns: number): TableRows =>
  (Array.isArray(value) ? value : []).map((row) =>
    Array.from({ length: columns }, (_cell, index) => {
      const cell = Array.isArray(row) ? row[index] : undefined;
      return cell === null || cell === undefined ? '' : String(cell);
    }),
  );

export const setTableCell = (
  rows: TableRows,
  rowIndex: number,
  columnIndex: number,
  text: string,
): TableRows =>
  rows.map((row, at) =>
    at === rowIndex ? row.map((cell, column) => (column === columnIndex ? text : cell)) : row,
  );

export const addTableRow = (rows: TableRows, columns: number): TableRows => [
  ...rows,
  Array.from({ length: columns }, () => ''),
];

export const removeTableRow = (rows: TableRows, rowIndex: number): TableRows =>
  rows.filter((_row, at) => at !== rowIndex);

/**
 * Таблица — в тело запроса: пустые строки с конца не значение (их добавляют,
 * пока думают), а таблица без строк — это «нет значения».
 */
export const tablePayload = (value: unknown, columns: number): TableRows | null => {
  const rows = tableRows(value, columns);
  while (rows.length > 0 && rows[rows.length - 1].every((cell) => cell.trim() === '')) rows.pop();
  return rows.length > 0 ? rows : null;
};
