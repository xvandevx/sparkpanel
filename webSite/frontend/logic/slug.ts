/**
 * Символьный код из названия: «Акции и скидки» → `akcii-i-skidki`. Один на всю
 * панель — по этому правилу код предлагается и записям разделов, и вкладкам
 * карточки, и вариантам списка.
 *
 * Чистая функция: ни React, ни сети.
 */

/** Русские буквы в латиницу. */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
};

/**
 * Длина кода: столько же принимают поля кодов на сервере. Транслитерация длинного
 * названия легко вылезает за это — «Доставка по Москве…» даёт за шестьдесят
 * символов, и без обрезки сохранение отвечало бы 400.
 */
export const SLUG_MAX_LENGTH = 64;

/** Название → код: латиница, цифры и дефис. Пустое название даёт пустой код. */
export const slugify = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    // Обрезка могла оставить дефис на конце
    .replace(/-+$/g, '');

/** Код из названия, не совпадающий с занятыми: второму такому достаётся `-2`. */
export function uniqueSlug(name: string, taken: string[], fallback: string): string {
  const base = slugify(name) || fallback;
  if (!taken.includes(base)) return base;

  let index = 2;
  while (taken.includes(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}
