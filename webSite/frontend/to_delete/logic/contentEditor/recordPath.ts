import type { EditorRow } from './types';

/**
 * Адрес записи в древовидном списке: цепочка кодов от корня до самой записи.
 * Общая механика, а не особенность страниц — адрес складывается из того же
 * `code`, который есть у любой записи, и из `parentId`, по которому редактор
 * и так строит дерево.
 *
 * Чистые функции: ни React, ни сети.
 */

/** Адрес корня. */
export const ROOT_PATH = '/';

/** Ключ записи → её адрес. Считается один раз на весь список. */
export function rowPaths(rows: EditorRow[]): Map<string, string> {
  const byId = new Map<string, EditorRow>();
  const walk = (list: EditorRow[]) => {
    for (const row of list) {
      byId.set(row.id, row);
      if (row.children?.length) walk(row.children);
    }
  };
  walk(rows);

  const paths = new Map<string, string>();

  const pathOf = (id: string, seen: Set<string>): string => {
    const known = paths.get(id);
    if (known !== undefined) return known;

    const row = byId.get(id);
    if (!row || seen.has(id)) return ROOT_PATH;
    seen.add(id);

    const parentId = row.parentId === undefined || row.parentId === null ? null : String(row.parentId);
    const parent = parentId !== null && byId.has(parentId) ? pathOf(parentId, seen) : ROOT_PATH;
    const path = join(parent, row.code);

    paths.set(id, path);
    return path;
  };

  byId.forEach((_row, id) => pathOf(id, new Set()));
  return paths;
}

/**
 * Адрес записи, которой ещё нет в списке, или той, у которой прямо сейчас
 * правят код: родитель берётся из значений формы, а не из записи.
 */
export function rowPath(rows: EditorRow[], parentId: unknown, code: unknown): string {
  const key = parentId === undefined || parentId === null ? null : String(parentId);
  const parent = key === null ? ROOT_PATH : rowPaths(rows).get(key) ?? ROOT_PATH;
  return join(parent, code);
}

/** Адрес родителя плюс сегмент; пустой код адреса не удлиняет. */
function join(parent: string, code: unknown): string {
  const segment = String(code ?? '').trim();
  if (!segment) return parent;
  return `${parent === ROOT_PATH ? '' : parent}/${segment}`;
}
