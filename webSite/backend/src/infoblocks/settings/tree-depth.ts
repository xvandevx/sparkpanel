/**
 * Предел вложенности древовидного списка — настройка «Уровней вложенности».
 * Чистые функции: дерево приходит картой «запись → родитель», ключи у разделов
 * разные (номер страницы, номер раздела), поэтому ключ любой.
 *
 * Уровень корневой записи — 1. Предел 2 значит «корень и один уровень под ним».
 */

/**
 * Дерево ли список: отдельной настройки нет, её заменил предел вложенности.
 * Один уровень — плоский список; больше или без ограничения (null) — дерево.
 */
export const isTreeDepth = (maxDepth: number | null): boolean => maxDepth !== 1;

/** Уровень записи в дереве: у корневой 1. Кольцо в родителях не зацикливает. */
export function depthOf<K>(parents: Map<K, K | null>, id: K): number {
  let depth = 1;
  const seen = new Set<K>([id]);
  let parent = parents.get(id) ?? null;
  while (parent !== null && !seen.has(parent)) {
    seen.add(parent);
    depth += 1;
    parent = parents.get(parent) ?? null;
  }
  return depth;
}

/** Сколько уровней занимает ветка записи вместе с ней самой: у записи без детей 1. */
export function heightOf<K>(parents: Map<K, K | null>, id: K): number {
  const children = new Map<K, K[]>();
  parents.forEach((parent, child) => {
    if (parent !== null) children.set(parent, [...(children.get(parent) ?? []), child]);
  });

  const walk = (node: K, seen: Set<K>): number => {
    const below = (children.get(node) ?? []).filter((child) => !seen.has(child));
    return 1 + Math.max(0, ...below.map((child) => walk(child, new Set([...seen, child]))));
  };
  return walk(id, new Set([id]));
}

/**
 * Встанет ли запись (со всей своей веткой) под родителя, не выйдя за предел.
 * `id` null — новая запись, ветки у неё нет. `maxDepth` null — без ограничения.
 * Возвращает текст ошибки или null.
 */
export function depthError<K>(
  parents: Map<K, K | null>,
  id: K | null,
  parentId: K | null,
  maxDepth: number | null,
): string | null {
  if (maxDepth === null) return null;
  const parentDepth = parentId === null ? 0 : depthOf(parents, parentId);
  const height = id === null ? 1 : heightOf(parents, id);
  return parentDepth + height > maxDepth
    ? `В этом списке не больше ${maxDepth} ${levels(maxDepth)} вложенности`
    : null;
}

const levels = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'уровня';
  return 'уровней';
};
