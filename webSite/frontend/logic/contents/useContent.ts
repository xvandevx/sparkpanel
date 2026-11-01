import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';
import type { ContentDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { contentItemsApi } from './contentItemsApi';
import { contentsApi } from './contentsApi';

/**
 * Открытый тип контента: номер из адреса (`/admin/contents/2`), сам тип,
 * путь до него от корня — для крошек — и Api его элементов для редактора.
 *
 * Типы — список редактора контента, и лежат они в его ячейке: тот же список,
 * что на корне «Контента». Сюда можно прийти и по прямой ссылке, минуя корень,
 * поэтому список перечитывается при показе.
 */
export function useContent() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const list =
    useSelector((state: RootState) => state.contentEditorNew[ListKey.contents]) ??
    emptyNewEditorList;

  useEffect(() => {
    dispatch(loadEditorListThunk(ListKey.contents, contentsApi.list));
  }, [dispatch]);

  const rawId = Number(router.query.contentId);
  const contentId = Number.isInteger(rawId) && rawId > 0 ? rawId : null;

  const path = useMemo(
    () => (contentId === null ? [] : contentPath(list.items as ContentDto[], contentId)),
    [list.items, contentId],
  );
  const content = path.length > 0 ? path[path.length - 1] : null;

  // Api собирается раз на тип: редактор следит за ключом списка, а не за объектом
  const itemsApi = useMemo(
    () => (contentId === null ? null : contentItemsApi(contentId)),
    [contentId],
  );

  return {
    /** Номер типа из адреса; null — адрес ещё не разобран или в нём не число */
    contentId,
    content,
    /** Типы от корня до открытого включительно */
    path,
    itemsApi,
    isLoaded: list.isLoaded,
    error: list.error,
  };
}

/** Тип и его предки, от корня. Кольцо в родителях данные сломать не должно. */
export function contentPath(contents: ContentDto[], id: number): ContentDto[] {
  const byId = new Map(contents.map((content) => [content.id, content]));
  const path: ContentDto[] = [];
  const seen = new Set<number>();

  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}
