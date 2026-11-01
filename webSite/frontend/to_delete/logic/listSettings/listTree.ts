import type { EditorSelectOption } from '../editorForm';

/**
 * Дерево записей у списка с настройкой «Древовидная структура». Раздел отдаёт
 * плоский список, родителей хранят настройки списка — дерево собирается здесь.
 * Чистые функции — без React и сети.
 */

/** Ключ записи → её родитель; записей в корне здесь может не быть вовсе. */
export type ListParents = Record<string, string | null>;

interface TreeRow {
  id: string;
  children?: TreeRow[];
  [key: string]: unknown;
}

/**
 * Родитель, до которого реально можно дойти: он есть в списке и не замыкает
 * кольцо. Иначе запись показывается в корне — пропасть из таблицы она не должна.
 */
function resolvedParent(id: string, ids: Set<string>, parents: ListParents): string | null {
  const parent = parents[id] ?? null;
  if (parent === null || !ids.has(parent)) return null;

  const seen = new Set<string>([id]);
  let current: string | null = parent;
  while (current !== null) {
    if (seen.has(current)) return null;
    seen.add(current);
    const next: string | null = parents[current] ?? null;
    current = next !== null && ids.has(next) ? next : null;
  }
  return parent;
}

/** Плоские строки → дерево по родителям. Порядок внутри уровня — как у раздела. */
export function nestRows<T extends TreeRow>(rows: T[], parents: ListParents): T[] {
  const ids = new Set(rows.map((row) => row.id));
  const nodes = new Map(rows.map((row) => [row.id, { ...row, children: [] as T[] }]));
  const roots: T[] = [];

  for (const row of rows) {
    const node = nodes.get(row.id) as T & { children: T[] };
    const parent = resolvedParent(row.id, ids, parents);
    if (parent === null) roots.push(node);
    else (nodes.get(parent) as T & { children: T[] }).children.push(node);
  }

  // Пустой `children` таблица приняла бы за раскрываемую строку
  for (const node of Array.from(nodes.values())) {
    if (node.children.length === 0) delete (node as TreeRow).children;
  }
  return roots;
}

/**
 * Варианты поля «Родитель»: все записи списка, кроме самой записи и вложенных
 * в неё, — с отступом по глубине, в порядке дерева.
 */
export function parentChoices(
  tree: TreeRow[],
  selfId: string | null,
  label: (row: TreeRow) => string,
): EditorSelectOption[] {
  const choices: EditorSelectOption[] = [];
  const walk = (rows: TreeRow[], depth: number) => {
    for (const row of rows) {
      // Саму запись и её ветку пропускаем целиком
      if (row.id === selfId) continue;
      choices.push({ value: row.id, label: `${'— '.repeat(depth)}${label(row)}` });
      if (row.children?.length) walk(row.children, depth + 1);
    }
  };
  walk(tree, 0);
  return choices;
}
