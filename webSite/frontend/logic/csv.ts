/**
 * CSV — таблица строк в текст и текст в файл на диске пользователя.
 *
 * Разделитель — точка с запятой, а в начале файла — метка BOM: так файл
 * открывает Excel с русской локалью — по колонкам и с кириллицей, а не одной
 * строкой кракозябр. Остальные программы (Numbers, LibreOffice, Google Таблицы)
 * читают такой файл тоже.
 */

const SEPARATOR = ';';
const BOM = '﻿';

/** Ячейка в кавычках, если в ней разделитель, кавычка или перенос строки. */
const csvCell = (value: string): string =>
  /[;"\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

export const csvText = (rows: string[][]): string =>
  BOM + rows.map((row) => row.map(csvCell).join(SEPARATOR)).join('\r\n');

/**
 * Сколько держать адрес файла живым после клика. Скачивание браузер начинает
 * не сразу, а читает файл по адресу уже потом: отозвать адрес сразу за кликом —
 * и в Safari и окне приложения скачивается пустой файл.
 */
const DOWNLOAD_URL_LIFETIME_MS = 60_000;

/** Отдать текст браузеру как скачанный файл. */
export function saveTextFile(fileName: string, text: string, type: string): void {
  saveBlobFile(fileName, new Blob([text], { type }));
}

/** Отдать браузеру файл, пришедший с сервера, — например, сжатую копию сайта. */
export function saveBlobFile(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  // Ссылку вне документа часть браузеров не нажимает вовсе
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), DOWNLOAD_URL_LIFETIME_MS);
}
