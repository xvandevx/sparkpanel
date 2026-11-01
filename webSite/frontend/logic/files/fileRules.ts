import type { FileDto } from '../../src/api/client';

/**
 * Ограничения поля «Файл» и «Изображение»: только картинки, формат, вес,
 * разрешение. Проверяются до загрузки — неподходящий файл не должен оседать
 * в разделе свойства — и при выборе из загруженных. Формат и вес сервер
 * проверит ещё раз, когда запись сохранит значение; разрешение — только при
 * загрузке: в карточке файла его нет.
 */
export interface FileRules {
  /** Поле принимает только изображения */
  isImageOnly: boolean;
  /** Допустимые расширения; пусто — любые */
  formats: string[];
  maxSizeMb: number | null;
  maxWidth: number | null;
  maxHeight: number | null;
}

/** Что не так с файлом с диска для этого поля; null — можно загружать. */
export async function uploadError(file: File, rules: FileRules): Promise<string | null> {
  const reason = ruleError(
    { name: file.name, size: file.size, isImage: file.type.startsWith('image/') },
    rules,
  );
  if (reason) return `«${file.name}»: ${reason}`;

  if (rules.maxWidth !== null || rules.maxHeight !== null) {
    const size = await imageSize(file);
    if (size && rules.maxWidth !== null && size.width > rules.maxWidth) {
      return `«${file.name}»: шире ${rules.maxWidth} px`;
    }
    if (size && rules.maxHeight !== null && size.height > rules.maxHeight) {
      return `«${file.name}»: выше ${rules.maxHeight} px`;
    }
  }

  return null;
}

/**
 * Почему загруженный файл не выбрать в это поле; null — подходит. Причина та же,
 * что ответит сервер при сохранении: узнать её в выборе лучше, чем после
 * «Сохранить». Без имени файла — в строке выбора оно стоит прямо над причиной.
 */
export const pickError = (file: FileDto, rules: FileRules): string | null =>
  ruleError({ name: file.name, size: file.size, isImage: file.isImage }, rules);

/**
 * Изображение ли, формат, вес — что можно проверить и у файла с диска,
 * и у загруженного. Причина без имени файла: его ставит тот, кто показывает.
 */
function ruleError(
  file: { name: string; size: number; isImage: boolean },
  rules: FileRules,
): string | null {
  if (rules.isImageOnly && !file.isImage) return 'не изображение';

  if (rules.formats.length > 0 && !formatMatches(extensionOf(file.name), rules.formats)) {
    return `формат не подходит, нужен ${rules.formats.join(', ')}`;
  }

  if (rules.maxSizeMb !== null && file.size > rules.maxSizeMb * 1024 * 1024) {
    return `больше ${rules.maxSizeMb} МБ`;
  }

  return null;
}

/** Подсказка окну выбора файла: оно сразу покажет только подходящие. */
export const acceptOf = (rules: FileRules): string | undefined =>
  rules.formats.length > 0
    ? rules.formats.map((format) => `.${format}`).join(',')
    : rules.isImageOnly
      ? 'image/*'
      : undefined;

/** Ограничения коротко — подсказкой под полем: «JPG, PNG · до 2 МБ · до 1920×1080 px». */
export const rulesHint = (rules: FileRules): string =>
  [
    rules.formats.length > 0 ? rules.formats.map((format) => format.toUpperCase()).join(', ') : null,
    rules.maxSizeMb !== null ? `до ${rules.maxSizeMb} МБ` : null,
    rules.maxWidth !== null || rules.maxHeight !== null
      ? `до ${rules.maxWidth ?? '∞'}×${rules.maxHeight ?? '∞'} px`
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

const extensionOf = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Одинаковые форматы под разными именами: `photo.jpeg` — это тоже JPG. */
const FORMAT_ALIASES: Record<string, string> = { jpeg: 'jpg', tif: 'tiff' };
const canonical = (format: string): string => FORMAT_ALIASES[format] ?? format;

const formatMatches = (extension: string, formats: string[]): boolean =>
  formats.map(canonical).includes(canonical(extension));

/**
 * Размер картинки — её надо загрузить в браузере. Не вышло (битый файл,
 * SVG без размеров) — проверять нечем, и мешать загрузке из-за этого не стоит.
 */
const imageSize = (file: File): Promise<{ width: number; height: number } | null> =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const done = (size: { width: number; height: number } | null) => {
      URL.revokeObjectURL(url);
      resolve(size);
    };
    image.onload = () =>
      done(image.naturalWidth > 0 ? { width: image.naturalWidth, height: image.naturalHeight } : null);
    image.onerror = () => done(null);
    image.src = url;
  });
