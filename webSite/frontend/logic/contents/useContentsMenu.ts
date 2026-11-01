import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';
import type { ContentDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { contentsApi } from './contentsApi';

/** Пункт меню типа: путь на его элементы и вложенные типы — та же форма, что у меню. */
export interface ContentsMenuItem {
  key: string;
  label: string;
  children?: ContentsMenuItem[];
}

/**
 * Типы контента подпунктами «Контента» в левом меню — деревом, как в списке.
 * Типы лежат в ячейке редактора контента: добавили или переименовали тип
 * в списке — редактор перечитал ячейку, и меню поменялось само.
 */
export function useContentsMenu(): ContentsMenuItem[] {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector(
    (state: RootState) => (state.contentEditorNew[ListKey.contents] ?? emptyNewEditorList).items,
  );

  useEffect(() => {
    dispatch(loadEditorListThunk(ListKey.contents, contentsApi.list));
  }, [dispatch]);

  return useMemo(() => contentsMenu(items as ContentDto[]), [items]);
}

/**
 * Плоский список типов → дерево пунктов. Порядок — как пришли (по алфавиту).
 * Тип с потерянным родителем встаёт в корень, кольцо в родителях обрывается:
 * пункт меню не должен пропасть или зациклить отрисовку.
 */
export function contentsMenu(types: ContentDto[]): ContentsMenuItem[] {
  const ids = new Set(types.map((type) => type.id));
  const childrenOf = new Map<number | null, ContentDto[]>();
  for (const type of types) {
    const parentId = type.parentId !== null && ids.has(type.parentId) ? type.parentId : null;
    childrenOf.set(parentId, [...(childrenOf.get(parentId) ?? []), type]);
  }

  const seen = new Set<number>();
  const build = (parentId: number | null): ContentsMenuItem[] =>
    (childrenOf.get(parentId) ?? [])
      .filter((type) => !seen.has(type.id))
      .map((type) => {
        seen.add(type.id);
        const children = build(type.id);
        return {
          key: `/admin/contents/${type.id}`,
          label: type.name,
          ...(children.length > 0 ? { children } : {}),
        };
      });

  const tree = build(null);
  // Типы в кольце до корня не дошли — ставим их в корень, а не теряем
  for (const type of types) {
    if (!seen.has(type.id)) {
      childrenOf.set(-type.id, [type]);
      tree.push(...build(-type.id));
    }
  }
  return tree;
}
