import type { FileLinkDto } from '../../src/api/client';
import { formatDateTime } from '../dateFormat';
import { recordPagePath } from '../navigation/listPaths';

/**
 * Файл человеку: размер, дата, привязки к записям. Чистые функции —
 * ни React, ни сети; разметку по ним рисуют компоненты.
 */

const KB = 1024;
const MB = KB * 1024;

/** Размер файла: 4,2 КБ / 1,8 МБ. Байты показываем только у совсем мелких. */
export const formatFileSize = (bytes: number): string => {
  if (!bytes) return '—';
  if (bytes < KB) return `${bytes} Б`;
  if (bytes < MB) return `${round(bytes / KB)} КБ`;
  return `${round(bytes / MB)} МБ`;
};

/** Дата загрузки коротко: 16.09.2026, 22:15. */
export const formatFileDate = (value: string): string => formatDateTime(value);

/**
 * Привязка одной строкой: где запись и как называется — «Страницы сайта · Главная».
 * Название записи знают не все списки — тогда её ключ.
 */
export const linkLabel = (link: FileLinkDto): string =>
  [link.listName, link.recordName ?? `запись ${link.recordId}`].join(' · ');

/**
 * Привязки файла для колонки списка — ссылками на записи, по одной на запись:
 * выбрала запись файл двумя свойствами — она всё равно одна. Ссылка открывает
 * страницу списка с карточкой записи; у списка без своей страницы — просто текст.
 */
export const fileLinks = (links: FileLinkDto[]): string | { text: string; href: string | null }[] => {
  const records = new Map(links.map((link) => [`${link.listKey}/${link.recordId}`, link]));
  if (records.size === 0) return '—';
  return Array.from(records.values(), (link) => ({
    text: linkLabel(link),
    href: recordPagePath(link.listKey, link.recordId),
  }));
};

/** Картинка ли по адресу — по расширению: превью колонки знает только адрес. */
export const isImageUrl = (url: string): boolean =>
  /\.(png|jpe?g|gif|webp|avif|bmp|svg|ico)$/i.test(url.split(/[?#]/)[0]);

const round = (value: number): string => value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
