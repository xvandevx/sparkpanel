import type { EditorLinkTarget } from '../../redux/action-creaters/contentEditorNew';
import { ListKey, PropertyType } from '../listSettings';
import { linkKeyOf } from './linkKey';

/** Список типов раздела «Контент» — из него выбирает привязка к типу контента. */
export const CONTENT_TYPES_LIST = ListKey.contents;

export interface LinkOption {
  value: string;
  label: string;
  /** Уровень в дереве записей: 0 — верхний. Нет — список плоский */
  depth?: number;
  /** Полное имя путём от корня: им ищут и подписывают выбранное, где дерева не видно */
  path?: string;
  /** Значения всех вложенных записей: отметили марку — отмечены и её модели с кузовами */
  descendants?: string[];
}

export interface LinkOptionGroup {
  label: string;
  options: LinkOption[];
}

/** Узел дерева выбора: так его ждёт `TreeSelect`. */
export interface LinkTreeNode {
  value: string;
  /** Что видно в раскрытом дереве: родитель и так над записью */
  title: string;
  /**
   * Что видно в выбранном значении — путь от корня: дерева там уже нет, и два
   * «Седана» у разных моделей иначе не различить
   */
  label: string;
  children?: LinkTreeNode[];
}

/**
 * Подпись записи в любом выборе — с номером: одноимённые записи («Новости»
 * в двух местах) различаются только им, и по нему же запись ищут в разделе.
 */
export const withId = (name: string, id: string | number): string => `${name} #${id}`;

/**
 * Откуда свойство берёт записи: у привязки к типу контента — всегда типы,
 * у привязки к записям — её источник. Пусто — выбирать не из чего: у свойств,
 * заведённых до того, как источник стал обязательным.
 */
export const linkListOf = (property: { type: string; linkList?: unknown }): string =>
  property.type === PropertyType.ContentTypeLink
    ? CONTENT_TYPES_LIST
    : property.type === PropertyType.ContentLink
      ? String(property.linkList ?? '')
      : '';

/**
 * Что предложить в фильтре по привязке: записи списка-источника в порядке дерева —
 * родитель, под ним его ветка, у каждой уровень, путь и вложенные записи.
 */
export function linkOptions(targets: EditorLinkTarget[], linkList: string): LinkOption[] {
  const options: LinkOption[] = [];
  /** Обход ветки: добавляет её варианты и отдаёт значения всех вложенных. */
  const visit = (node: LinkTreeNode, depth: number): string[] => {
    const option: LinkOption = { value: node.value, label: node.title, depth, path: node.label };
    options.push(option);
    option.descendants = (node.children ?? []).flatMap((child) => [child.value, ...visit(child, depth + 1)]);
    return option.descendants;
  };
  for (const root of linkTree(targets, linkList)) visit(root, 0);
  return options;
}

/**
 * Название каждой записи путём от корня её списка: «Kia / Rio / Седан». Так запись
 * подписана там, где дерева не видно, — в выбранном значении и в ячейке таблицы.
 * Кольцо в родителях обход не зацикливает. Ключ — «список/запись».
 */
export function linkPaths(targets: EditorLinkTarget[]): Map<string, string> {
  const byKey = new Map(targets.map((target) => [linkKeyOf(target) ?? '', target]));
  const parentOf = (target: EditorLinkTarget) =>
    target.parentId === null ? undefined : byKey.get(`${target.listKey}/${target.parentId}`);

  return new Map(
    targets.map((target) => {
      const path = [target.name];
      const seen = new Set([target.recordId]);
      let parent = parentOf(target);
      while (parent && !seen.has(parent.recordId)) {
        seen.add(parent.recordId);
        path.unshift(parent.name);
        parent = parentOf(parent);
      }
      return [linkKeyOf(target) ?? '', path.join(' / ')];
    }),
  );
}

/**
 * То же, но деревом — для поля привязки в карточке. Записи вложены по родителю
 * в своём списке: страница под страницей, «Уникальные описания товаров» под
 * «SEO». Запись, чей родитель не пришёл, встаёт на верхний уровень.
 */
export function linkTree(targets: EditorLinkTarget[], linkList: string): LinkTreeNode[] {
  const shown = targets.filter((target) => linkList !== '' && target.listKey === linkList);
  const paths = linkPaths(shown);

  const nodes = new Map(
    shown.map((target) => [
      target.recordId,
      {
        value: linkKeyOf(target) ?? '',
        title: withId(target.name, target.recordId),
        label: withId(paths.get(linkKeyOf(target) ?? '') ?? target.name, target.recordId),
      } as LinkTreeNode,
    ]),
  );

  const roots: LinkTreeNode[] = [];
  for (const target of shown) {
    const node = nodes.get(target.recordId)!;
    const parent = target.parentId === null ? undefined : nodes.get(target.parentId);
    if (parent && parent !== node) parent.children = [...(parent.children ?? []), node];
    else roots.push(node);
  }
  return roots;
}
