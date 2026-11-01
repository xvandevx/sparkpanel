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
 * Код файла — имя в адресе: латиница, цифры и дефисы плюс расширение
 * (`Вопросы и ответы.PDF` → `voprosy-i-otvety.pdf`). Считается один раз,
 * при загрузке, и потом не меняется: переименовали файл в панели — адрес
 * прежний, ссылки на него в текстах и шаблонах не ломаются.
 */
export const fileCode = (originalName: string): string => {
  const { slug, extension } = splitName(originalName);
  return `${slug}${extension}`;
};

/**
 * Ключ объекта в хранилище: папки из номера файла и код — `00/00/78/voprosy-i-otvety.pdf`.
 * Номер дополняется нулями до 6 цифр и режется по две: на каждом уровне не больше
 * сотни папок, а у файла своя папка — код в ней ни с чем не столкнётся, случайный
 * хвост не нужен. Ключ не хранится: его собирают из номера и кода.
 *
 * Раздела в ключе намеренно нет: файл переносят между разделами, и ключ из раздела
 * после переноса начал бы врать. С 7 знаков номер так и режется — `10/00/000`,
 * ключи не совпадают.
 */
export const objectKeyOf = (id: number, code: string): string => {
  const digits = String(id).padStart(6, '0');
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}/${code}`;
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
