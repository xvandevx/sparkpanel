import type { EditorValues } from '../../../redux/reducers/contentEditorNewReducer';
import { cellText, type TableColumn } from '../table/columns';
import { propertyValue, type PropertyLookup } from '../table/propertyValue';
import type { EditorRow } from '../table';

/**
 * Выгрузка в файл — те же колонки, что у таблицы, и те же подписи, что в её
 * ячейках: «Да / Нет», название варианта, имя файла, путь привязки. Файл — для
 * человека: что видно в таблице, то и в файле.
 *
 * Чистые функции: ни React, ни стора.
 */

/** Подпись колонки в файле: у колонки-превью заголовка нет, как и в «Колонках таблицы». */
export const exportColumnName = (item: TableColumn): string =>
  item.name || (item.column?.isPreview ? 'Превью' : item.key);

/** Шапка и строки файла: колонки слева направо, строка на запись. */
export function exportTable(
  columns: TableColumn[],
  rows: EditorRow[],
  values: EditorValues,
  lookup: PropertyLookup,
): string[][] {
  const cell = (item: TableColumn, row: EditorRow): string => {
    if (!item.property) return cellText(item.key, item.column, row, rows);
    const content = propertyValue(item.property, values[row.id]?.[String(item.property.id)], lookup);
    // У изображения в ячейке таблицы превью, а в файле — адреса картинок
    return content.text || content.images.join(', ');
  };

  return [columns.map(exportColumnName), ...rows.map((row) => columns.map((item) => cell(item, row)))];
}

/** Имя файла: код списка и сегодняшняя дата — выгрузки одного списка не путаются. */
export const exportFileName = (code: string, date: Date): string => {
  const day = [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
  return `${code}-${day}.csv`;
};
