/**
 * Значение поля «таблица»: строки ячеек. Столбцов столько, сколько задано
 * в настройках свойства, строк — сколько добавили в карточке записи.
 * Чистые функции — без React: поле только рисует ячейки и отдаёт правку сюда.
 */

/** Значение → строки ровно нужной ширины: лишнее отрезано, недостающее пусто. */
export function tableCells(value: unknown, columns: number): string[][] {
  const source = Array.isArray(value) ? value : [];
  return source.map((row) => {
    const cells = Array.isArray(row) ? (row as unknown[]) : [];
    return Array.from({ length: columns }, (_cell, column) => {
      const cell = cells[column];
      return cell === undefined || cell === null ? '' : String(cell);
    });
  });
}

/** Пустая строка таблицы. */
export const emptyTableRow = (columns: number): string[] => Array.from({ length: columns }, () => '');

/** Таблица после правки одной ячейки. */
export function setTableCell(
  value: unknown,
  columns: number,
  row: number,
  column: number,
  text: string,
): string[][] {
  const cells = tableCells(value, columns);
  if (!cells[row]) return cells;
  cells[row][column] = text;
  return cells;
}

/** Таблица с новой пустой строкой в конце. */
export const addTableRow = (value: unknown, columns: number): string[][] => [
  ...tableCells(value, columns),
  emptyTableRow(columns),
];

/** Таблица без одной строки. */
export const removeTableRow = (value: unknown, columns: number, row: number): string[][] =>
  tableCells(value, columns).filter((_row, index) => index !== row);

/** В таблице нет ни одного значения — для обязательного свойства это «не заполнено». */
export const isTableEmpty = (value: unknown): boolean =>
  !Array.isArray(value) ||
  value.every((row) => !Array.isArray(row) || row.every((cell) => !String(cell ?? '').trim()));
