import type { EditorMediaRules } from '../editorForm';
import { formatFileSize } from '../files/filesFormat';

/**
 * Ограничения поля «файл»: формат, вес, «только изображения», разрешение.
 * Формат и вес видны по карточке файла, разрешение — только загрузив картинку,
 * поэтому оно проверяется отдельно и асинхронно.
 */

/** Что известно о файле до загрузки картинки: из карточки медиатеки или из выбора на диске. */
export interface MediaFacts {
  name: string;
  mimeType: string;
  size: number;
}

/** Одинаковые форматы под разными именами: `photo.jpeg` — это тоже JPG. */
const FORMAT_ALIASES: Record<string, string> = { jpeg: 'jpg', tif: 'tiff' };
const canonical = (format: string): string => FORMAT_ALIASES[format] ?? format;

export const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

const isImageMime = (mimeType: string): boolean => mimeType.startsWith('image/');

/** Почему файл не подходит (без разрешения) или null. */
export function mediaRuleError(file: MediaFacts, rules: EditorMediaRules | undefined): string | null {
  if (!rules) return null;
  if (rules.imagesOnly && !isImageMime(file.mimeType)) return 'не изображение';
  if (rules.formats.length && !rules.formats.map(canonical).includes(canonical(extensionOf(file.name)))) {
    return `формат не ${rules.formats.join(', ').toUpperCase()}`;
  }
  if (rules.maxSizeMb !== null && file.size > rules.maxSizeMb * 1024 * 1024) {
    return `больше ${rules.maxSizeMb} МБ (${formatFileSize(file.size)})`;
  }
  return null;
}

/** Ограничение разрешения задано — значит, картинку перед выбором придётся загрузить. */
export const checksResolution = (rules: EditorMediaRules | undefined): boolean =>
  Boolean(rules && (rules.maxWidth !== null || rules.maxHeight !== null));

/** Почему разрешение не подходит или null. */
export function resolutionError(
  size: { width: number; height: number },
  rules: EditorMediaRules | undefined,
): string | null {
  if (!rules) return null;
  const tooWide = rules.maxWidth !== null && size.width > rules.maxWidth;
  const tooHigh = rules.maxHeight !== null && size.height > rules.maxHeight;
  if (!tooWide && !tooHigh) return null;
  return `разрешение ${size.width}×${size.height} больше ${rules.maxWidth ?? '∞'}×${rules.maxHeight ?? '∞'}`;
}

/**
 * Размер картинки в пикселях: по адресу медиатеки или по файлу с диска.
 * null — картинку не удалось прочитать (SVG без размеров, битый файл).
 */
export function readImageSize(source: string | File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = typeof source === 'string' ? source : URL.createObjectURL(source);
    const image = new Image();
    const done = (size: { width: number; height: number } | null) => {
      if (typeof source !== 'string') URL.revokeObjectURL(url);
      resolve(size);
    };
    image.onload = () =>
      done(image.naturalWidth ? { width: image.naturalWidth, height: image.naturalHeight } : null);
    image.onerror = () => done(null);
    image.src = url;
  });
}

/** Подсказка под полем: что сюда подойдёт. Пустая строка — ограничений нет. */
export function mediaRulesHint(rules: EditorMediaRules | undefined): string {
  if (!rules) return '';
  const parts = [
    rules.formats.length ? rules.formats.join(', ').toUpperCase() : rules.imagesOnly ? 'изображение' : '',
    rules.maxSizeMb !== null ? `до ${rules.maxSizeMb} МБ` : '',
    checksResolution(rules) ? `до ${rules.maxWidth ?? '∞'}×${rules.maxHeight ?? '∞'} px` : '',
  ];
  return parts.filter(Boolean).join(' · ');
}
