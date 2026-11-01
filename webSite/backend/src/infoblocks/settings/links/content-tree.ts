/**
 * Типы контента — дерево по `parentId`. В выборе привязки его нужно видеть:
 * «Уникальные описания товаров» без родителя «SEO» непонятно что. Здесь —
 * порядок обхода (родитель, за ним его ветка) и путь каждого типа.
 */

export interface ContentTypeNode {
  id: number;
  parentId: number | null;
  name: string;
}

export interface ContentTypePlace<T extends ContentTypeNode> {
  type: T;
  /** Имена от корня до самого типа: `['SEO', 'Уникальные описания товаров']` */
  path: string[];
}

/**
 * Типы в порядке дерева: корни и соседи — в том порядке, в каком пришли
 * (сервис отдаёт их по имени), под каждым — его ветка. Тип, чей родитель
 * пропал, встаёт в корень; кольцо в родителях обход не зацикливает.
 */
export function contentTypesInTreeOrder<T extends ContentTypeNode>(types: T[]): ContentTypePlace<T>[] {
  const ids = new Set(types.map((type) => type.id));
  const rootOf = (type: T) => type.parentId === null || !ids.has(type.parentId);
  const placed = new Set<number>();
  const result: ContentTypePlace<T>[] = [];

  const visit = (type: T, path: string[]) => {
    if (placed.has(type.id)) return;
    placed.add(type.id);
    const own = [...path, type.name];
    result.push({ type, path: own });
    for (const child of types) {
      if (child.parentId === type.id) visit(child, own);
    }
  };

  for (const type of types) if (rootOf(type)) visit(type, []);
  // Ветка, замкнутая в кольцо, корня не имеет — показываем её всё равно
  for (const type of types) visit(type, []);
  return result;
}

/** Путь типа одной строкой — так тип узнают и без дерева. */
export const contentTypePath = (path: string[]): string => path.join(' / ');
