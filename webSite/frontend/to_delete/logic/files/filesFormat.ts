/**
 * Представление файла в списке: размер, дата и вид значка.
 * Чистые функции — ни React, ни сети; разметку по ним рисуют компоненты.
 */

const KB = 1024;
const MB = KB * 1024;

/** Размер файла человеку: 4,2 КБ / 1,8 МБ. Байты показываем только у совсем мелких. */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < KB) return `${bytes} Б`;
  if (bytes < MB) return `${round(bytes / KB)} КБ`;
  return `${round(bytes / MB)} МБ`;
};

/** Дата загрузки коротко: 16.09.2026, 22:15. */
export const formatFileDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Вид файла — по нему компонент выбирает значок. */
export const FileKind = {
  Image: 'image',
  Pdf: 'pdf',
  Document: 'document',
  Sheet: 'sheet',
  Archive: 'archive',
  Video: 'video',
  Audio: 'audio',
  Text: 'text',
  Other: 'other',
} as const;

export type FileKind = (typeof FileKind)[keyof typeof FileKind];

/**
 * Вид файла по MIME-типу и расширению. MIME браузер иногда не знает
 * (`application/octet-stream` у архивов), поэтому расширение — запасной признак.
 */
export const fileKind = (mimeType: string, name: string): FileKind => {
  if (mimeType.startsWith('image/')) return FileKind.Image;
  if (mimeType.startsWith('video/')) return FileKind.Video;
  if (mimeType.startsWith('audio/')) return FileKind.Audio;
  if (mimeType === 'application/pdf') return FileKind.Pdf;

  switch (extensionOf(name)) {
    case 'pdf':
      return FileKind.Pdf;
    case 'doc':
    case 'docx':
    case 'rtf':
    case 'odt':
      return FileKind.Document;
    case 'xls':
    case 'xlsx':
    case 'csv':
    case 'ods':
      return FileKind.Sheet;
    case 'zip':
    case 'rar':
    case '7z':
    case 'gz':
    case 'tar':
      return FileKind.Archive;
    case 'txt':
    case 'md':
    case 'json':
    case 'xml':
      return FileKind.Text;
    default:
      return mimeType.startsWith('text/') ? FileKind.Text : FileKind.Other;
  }
};

/** Расширение в нижнем регистре, без точки; у файла без расширения — пустая строка. */
export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Полный адрес файла — его вставляют в контент и открывают в новой вкладке. */
export const absoluteFileUrl = (url: string): string =>
  typeof window === 'undefined' ? url : new URL(url, window.location.origin).toString();

const round = (value: number): string =>
  value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });

/** Подпись вида файла в таблице: по ней видно, что за файл, без открытия. */
const KIND_LABELS: Record<FileKind, string> = {
  [FileKind.Image]: 'Изображение',
  [FileKind.Pdf]: 'PDF',
  [FileKind.Document]: 'Документ',
  [FileKind.Sheet]: 'Таблица',
  [FileKind.Archive]: 'Архив',
  [FileKind.Video]: 'Видео',
  [FileKind.Audio]: 'Аудио',
  [FileKind.Text]: 'Текст',
  [FileKind.Other]: 'Файл',
};

export const fileKindLabel = (kind: FileKind): string => KIND_LABELS[kind];
