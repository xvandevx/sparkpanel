import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';
import type { UserDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { usersViewApi } from './usersApi';

/**
 * Кто завёл запись — для карточки, под датами. Запись отдаёт только номер
 * автора (`authorId`), имя берётся из списка учётных записей: он тот же, что
 * на экране «Пользователи», читать его может любой. Грузится один раз.
 * У записи без автора (файлы, домены, роли) — null: строки не будет.
 */
export function useAuthorName(authorId: unknown): string | null {
  const dispatch = useDispatch<AppDispatch>();
  const users = useSelector((state: RootState) => state.contentEditorNew[ListKey.users]) ?? emptyNewEditorList;
  const hasAuthor = typeof authorId === 'number';
  const isNeeded = hasAuthor && !users.isLoaded && !users.isLoading;

  useEffect(() => {
    if (isNeeded) dispatch(loadEditorListThunk(ListKey.users, usersViewApi.list));
  }, [dispatch, isNeeded]);

  return useMemo(
    () => (hasAuthor && users.isLoaded ? authorLabel(users.items as UserDto[], authorId as number) : null),
    [hasAuthor, users.isLoaded, users.items, authorId],
  );
}

/** Имя автора, а нет имени — email; учётную запись удалили — так и пишем. */
export const authorLabel = (users: UserDto[], authorId: number): string => {
  const user = users.find((item) => item.id === authorId);
  if (!user) return 'Удалённый пользователь';
  return user.name ? `${user.name} (${user.email})` : user.email;
};
