import { api, CreateUserDto, UpdateUserDto, UserDto } from '../src/api/client';

/**
 * Сетевой слой учётных записей панели (`/api/users`). Главного администратора
 * сервер не удалит — он приходит с `isBlocked`.
 */

export const fetchUsers = async (): Promise<UserDto[]> => {
  const { data } = await api.users.usersControllerFindAll();
  return data;
};

/** Заводит обычного пользователя: роль `root` через API не выдаётся. */
export const createUser = async (dto: CreateUserDto): Promise<UserDto> => {
  const { data } = await api.users.usersControllerCreate(dto);
  return data;
};

/** Правка учётной записи; пароля в теле нет — он остаётся прежним. */
export const updateUser = async (id: number, dto: UpdateUserDto): Promise<UserDto> => {
  const { data } = await api.users.usersControllerUpdate(id, dto);
  return data;
};

/** Удаляет учётную запись вместе с её ролью; главного администратора — нет (409). */
export const removeUser = async (id: number): Promise<void> => {
  await api.users.usersControllerRemove(id);
};
