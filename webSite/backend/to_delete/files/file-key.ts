import { randomBytes } from 'crypto';

/** Хвост имени, чтобы два одинаковых `banner.jpg` не перетёрли друг друга. */
const UNIQUE_BYTES = 6;

/** Длиннее имени в ключе не нужно: полное имя файла всё равно хранится в базе. */
const SLUG_MAX = 60;

/** Кириллица в адресе файла ломает половину внешних инструментов — переводим в латиницу. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Ключ объекта в хранилище: `<userId>/<год>/<месяц>/<хвост>-<имя>.<расширение>`.
 *
 * Раздела в ключе намеренно нет: файл можно перенести в другой раздел, и ключ,
 * собранный из раздела, после переноса начал бы врать. Дата — чтобы в консоли
 * хранилища не оказалось одной папки на десятки тысяч файлов.
 */
export const buildObjectKey = (userId: number, originalName: string, now = new Date()): string => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const { slug, extension } = splitName(originalName);
  const unique = randomBytes(UNIQUE_BYTES).toString('hex');

  return `${userId}/${year}/${month}/${unique}-${slug}${extension}`;
};

/** Имя и расширение по отдельности: имя приводим к латинице, расширение — к нижнему регистру. */
function splitName(originalName: string): { slug: string; extension: string } {
  // Браузеры кое-где присылают имя с путём — берём только последний сегмент.
  const base = String(originalName ?? '').split(/[\\/]/).pop() ?? '';
  const dot = base.lastIndexOf('.');
  const hasExtension = dot > 0 && /^[a-zA-Z0-9]{1,10}$/.test(base.slice(dot + 1));

  return {
    slug: slugify(hasExtension ? base.slice(0, dot) : base),
    extension: hasExtension ? `.${base.slice(dot + 1).toLowerCase()}` : '',
  };
}

/** Латиница, цифры и дефисы. Ничего не осталось (имя было из одних эмодзи) — зовём `file`. */
function slugify(value: string): string {
  const latin = value
    .toLowerCase()
    .replace(/[а-яё]/g, (letter) => TRANSLIT[letter] ?? '');

  const slug = latin
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');

  return slug || 'file';
}
