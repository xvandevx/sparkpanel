import { createUser, fetchUsers, removeUser, updateUser } from '../../api/users';
import type { CreateUserDto, UpdateUserDto } from '../../src/api/client';

/**
 * Где лежат учётные записи панели. Главного администратора сервер присылает
 * с `isBlocked` — вместо корзины у него замок, удалить его нельзя.
 *
 * Пароль уходит, только если его набрали: пустое поле у сохранённой записи
 * значит «оставить прежний», а пустой строки сервер не примет.
 */
const toUserPayload = ({ password, ...payload }: Record<string, unknown>) => ({
  ...payload,
  ...(typeof password === 'string' && password !== '' ? { password } : {}),
});

export const usersApi = {
  list: fetchUsers,
  create: (payload: Record<string, unknown>) =>
    createUser(toUserPayload(payload) as unknown as CreateUserDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateUser(Number(id), toUserPayload(payload) as UpdateUserDto),
  remove: (id: string) => removeUser(Number(id)),
};

/** То же на просмотр: учётные записи правит только главный администратор. */
export const usersViewApi = { list: fetchUsers };
