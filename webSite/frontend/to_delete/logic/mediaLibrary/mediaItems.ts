import type { FileDto, FileSectionDto } from '../../src/api/client';
import { absoluteFileUrl, fileKind, fileKindLabel, formatFileSize } from '../files/filesFormat';

/**
 * Файл медиатеки в том виде, в каком его показывает выбор файла: всё уже
 * посчитано, компоненту остаётся нарисовать. Чистые функции — без React и сети.
 */
export interface MediaItem {
  id: number;
  name: string;
  /** Адрес для превью и для ссылки «открыть» */
  url: string;
  isImage: boolean;
  mimeType: string;
  /** Вес в байтах — для проверки ограничений поля */
  size: number;
  /** Подпись мелким шрифтом: вид, размер, раздел */
  details: string;
  sectionId: number;
}

export const toMediaItem = (file: FileDto, sections: FileSectionDto[]): MediaItem => {
  const section = sections.find((item) => item.id === file.sectionId);
  return {
    id: file.id,
    name: file.name,
    url: absoluteFileUrl(file.url),
    isImage: file.isImage,
    mimeType: file.mimeType,
    size: file.size,
    details: [
      fileKindLabel(fileKind(file.mimeType, file.name)),
      formatFileSize(file.size),
      section?.name,
    ]
      .filter(Boolean)
      .join(' · '),
    sectionId: file.sectionId,
  };
};

/** Поиск по имени и описанию плюс фильтр по разделу; null — все разделы. */
export const filterMedia = (
  files: FileDto[],
  query: string,
  sectionId: number | null,
): FileDto[] => {
  const needle = query.trim().toLowerCase();
  return files.filter(
    (file) =>
      (sectionId === null || file.sectionId === sectionId) &&
      (!needle ||
        file.name.toLowerCase().includes(needle) ||
        (file.description ?? '').toLowerCase().includes(needle)),
  );
};

/** Значение поля → номера файлов: одиночное свойство хранит номер, множественное — массив. */
export const mediaIds = (value: unknown): number[] =>
  (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

/** Номера файлов → значение поля: обратное к `mediaIds`. */
export const mediaValue = (ids: number[], multiple: boolean): number | number[] | null =>
  multiple ? ids : ids[0] ?? null;

/**
 * Выбранные файлы → новое значение поля. Множественное свойство дополняется
 * без повторов, одиночное заменяется первым выбранным.
 */
export const addMedia = (
  value: unknown,
  picked: number[],
  multiple: boolean,
): number | number[] | null =>
  multiple
    ? Array.from(new Set([...mediaIds(value), ...picked]))
    : mediaValue(picked, false);

/** Убрать файл из значения поля; сам файл остаётся в медиатеке. */
export const removeMedia = (value: unknown, id: number, multiple: boolean) =>
  mediaValue(
    mediaIds(value).filter((item) => item !== id),
    multiple,
  );
