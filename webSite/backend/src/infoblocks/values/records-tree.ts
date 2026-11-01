/**
 * Дерево записей списка (настройка `isTree`): родитель хранится у записи
 * в `property_values.parentId`. Чистые функции — без базы.
 */

/**
 * Ошибка выбора родителя или null. Запись не может лежать в самой себе и в своих
 * потомках: дерево превратилось бы в кольцо, и таблица не нашла бы корень.
 *
 * Ключ любой: у записей настроек он строковый, у категорий товаров — номер.
 */
export function parentError<K>(
  recordId: K,
  parentId: K | null,
  parents: Map<K, K | null>,
): string | null {
  if (parentId === null) return null;
  if (parentId === recordId) return 'Запись не может быть вложена в саму себя';

  const seen = new Set<K>();
  let current: K | null = parentId;
  while (current !== null && !seen.has(current)) {
    if (current === recordId) return 'Запись не может быть вложена в свою же вложенную запись';
    seen.add(current);
    current = parents.get(current) ?? null;
  }
  return null;
}

/**
 * Новые родители после удаления записей: вложенные в удалённую поднимаются
 * к её родителю. Сами записи удаляет их раздел, дерево терять их не должно.
 */
export function reparentAfterRemove(
  removed: string[],
  parents: Map<string, string | null>,
): Map<string, string | null> {
  const gone = new Set(removed);
  const resolve = (id: string | null): string | null => {
    const seen = new Set<string>();
    let current = id;
    while (current !== null && gone.has(current) && !seen.has(current)) {
      seen.add(current);
      current = parents.get(current) ?? null;
    }
    return current !== null && gone.has(current) ? null : current;
  };

  const moved = new Map<string, string | null>();
  for (const [recordId, parentId] of parents) {
    if (gone.has(recordId) || parentId === null || !gone.has(parentId)) continue;
    moved.set(recordId, resolve(parentId));
  }
  return moved;
}
