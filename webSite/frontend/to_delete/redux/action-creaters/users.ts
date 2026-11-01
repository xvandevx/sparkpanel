import type { Dispatch } from 'redux';
import * as usersApi from '../../api/users';
import type { CreateUserDto, UpdateUserDto, UserDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  USERS_ERROR,
  USERS_REQUEST,
  USERS_SAVED,
  USERS_SAVING,
  USERS_SUCCESS,
  UsersAction,
} from '../reducers/usersReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchUsersThunk = () => async (dispatch: Dispatch<UsersAction>) => {
  dispatch({ type: USERS_REQUEST });
  try {
    dispatch({ type: USERS_SUCCESS, payload: await usersApi.fetchUsers() });
  } catch (error) {
    dispatch({
      type: USERS_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить список пользователей'),
    });
  }
};

/**
 * Создание и изменение — один thunk: форма шторки одна и та же, отличается
 * только наличием идентификатора. Возвращает сохранённую запись или null.
 */
export const saveUserThunk =
  (id: number | null, dto: CreateUserDto | UpdateUserDto) =>
  async (dispatch: Dispatch<UsersAction>): Promise<UserDto | null> => {
    dispatch({ type: USERS_SAVING });
    try {
      const user = id
        ? await usersApi.updateUser(id, dto as UpdateUserDto)
        : await usersApi.createUser(dto as CreateUserDto);
      dispatch({ type: USERS_SAVED });
      // Перечитываем список целиком: у созданной записи идентификатор выдаёт бэкенд
      dispatch({ type: USERS_SUCCESS, payload: await usersApi.fetchUsers() });
      return user;
    } catch (error) {
      dispatch({
        type: USERS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить пользователя'),
      });
      return null;
    }
  };

/**
 * История читается только на время открытой шторки и в общий стейт не кладётся —
 * но запрос всё равно уходит отсюда: api/ дергается только из thunks.
 */
export const loadUserHistoryThunk = (id: number) => () => usersApi.fetchUserHistory(id);

export const loadUsersJournalThunk =
  (limit: number, offset: number) => () =>
    usersApi.fetchUsersJournal(limit, offset);
