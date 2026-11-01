import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import { fetchUsersThunk, saveUserThunk } from '../../redux/action-creaters/users';
import type { CreateUserDto, UpdateUserDto, UserDto } from '../../src/api/client';

/**
 * Действия раздела «Пользователи»: только dispatch, без селекторов — хук можно звать
 * где угодно, в том числе в строках таблицы, не вызывая лишних перерисовок.
 *
 * Удаления нет: учётную запись не удаляют, а отключают (`isActive`).
 */
export const useUsersActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback(() => dispatch(fetchUsersThunk()), [dispatch]);

  const save = useCallback(
    (id: number | null, dto: CreateUserDto | UpdateUserDto): Promise<UserDto | null> =>
      dispatch(saveUserThunk(id, dto)),
    [dispatch],
  );

  return { load, save };
};
