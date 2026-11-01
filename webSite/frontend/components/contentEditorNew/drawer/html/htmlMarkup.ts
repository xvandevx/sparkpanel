/**
 * Что визуальный редактор (TipTap) умеет показать, не теряя разметки. Он держит
 * текст по своей схеме: абзацы, заголовки, списки, цитаты, код, ссылки,
 * изображения, таблицы. Чего в схеме нет — `div`, `span`, `iframe`, классов,
 * стилей, — он молча выбросит при первой же правке. Поэтому значение с такой
 * разметкой поле открывает в режиме «HTML» и спрашивает, прежде чем показать
 * его визуально.
 */

/** Теги схемы и атрибуты, которые она сохраняет у каждого. */
const ALLOWED: Record<string, string[]> = {
  p: [],
  br: [],
  h1: [],
  h2: [],
  h3: [],
  h4: [],
  h5: [],
  h6: [],
  strong: [],
  b: [],
  em: [],
  i: [],
  u: [],
  s: [],
  strike: [],
  del: [],
  code: [],
  pre: [],
  blockquote: [],
  ul: [],
  ol: ['start', 'type'],
  li: [],
  hr: [],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'title', 'width', 'height'],
  table: ['style'],
  colgroup: [],
  col: ['style'],
  thead: [],
  tbody: [],
  tr: [],
  th: ['colspan', 'rowspan', 'colwidth', 'style'],
  td: ['colspan', 'rowspan', 'colwidth', 'style'],
};

/**
 * Что из разметки визуальный режим потеряет: теги и атрибуты вне схемы, без
 * повторов («div», «span class»). Пусто — показывать визуально безопасно.
 * Только в браузере: разбирает строку через `DOMParser`.
 */
export function unsupportedMarkup(html: string): string[] {
  if (html.trim() === '') return [];
  const body = new DOMParser().parseFromString(html, 'text/html').body;
  const found = new Set<string>();
  for (const element of Array.from(body.querySelectorAll('*'))) {
    const tag = element.tagName.toLowerCase();
    const allowed = ALLOWED[tag];
    if (allowed === undefined) {
      found.add(tag);
      continue;
    }
    for (const attribute of Array.from(element.attributes)) {
      if (!allowed.includes(attribute.name)) found.add(`${tag} ${attribute.name}`);
    }
  }
  return Array.from(found);
}
