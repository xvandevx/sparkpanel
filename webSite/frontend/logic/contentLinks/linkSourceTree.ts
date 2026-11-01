import type { EditorLinkSource } from '../../redux/action-creaters/contentEditorNew';
import { withId } from './linkOptions';

/** Узел выбора источника: так его ждёт `TreeSelect`. */
export interface LinkSourceNode {
  value: string;
  /** Что видно в раскрытом дереве — своё имя: родитель и так над ним */
  title: string;
  /** Что видно в закрытом поле — полное имя, дерева там уже нет */
  label: string;
  /** Группу не выбирают: она только собирает свои источники */
  selectable?: boolean;
  children?: LinkSourceNode[];
}

/** Значение группы — не ключ списка: выбрать её нельзя, но ключ узлу нужен. */
const groupValue = (group: string): string => `group:${group}`;

/**
 * Источники привязки — деревом для выбора. Без группы — верхним уровнем,
 * с группой — внутри её узла («Контент»), а там по `parentKey`: вложенный
 * тип контента виден под своим родителем. Порядок — как прислал сервер;
 * группа встаёт там, где встретился её первый источник. «Любой записи панели»
 * нет: такой выбор тянул бы все записи разом и повесил бы карточку.
 */
export function linkSourceTree(sources: EditorLinkSource[]): LinkSourceNode[] {
  // У списков, заведённых под тип контента, — номер типа: как у записей в выборе
  const nodeOf = (source: EditorLinkSource): LinkSourceNode => ({
    value: source.listKey,
    title: source.id === null ? source.name : withId(source.name, source.id),
    label: source.id === null ? source.label : withId(source.label, source.id),
  });
  const nodes = new Map(sources.map((source) => [source.listKey, nodeOf(source)]));

  const top: LinkSourceNode[] = [];
  const groups = new Map<string, LinkSourceNode>();

  for (const source of sources) {
    const node = nodes.get(source.listKey)!;
    const parent = source.parentKey === null ? undefined : nodes.get(source.parentKey);
    if (parent) {
      parent.children = [...(parent.children ?? []), node];
      continue;
    }
    if (source.group === null) {
      top.push(node);
      continue;
    }
    let group = groups.get(source.group);
    if (!group) {
      group = {
        value: groupValue(source.group),
        title: source.group,
        label: source.group,
        selectable: false,
        children: [],
      };
      groups.set(source.group, group);
      top.push(group);
    }
    group.children!.push(node);
  }
  return top;
}
