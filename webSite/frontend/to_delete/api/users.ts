import {
  api,
  CreateUserDto,
  HistoryPageDto,
  HistoryRecordDto,
  UpdateUserDto,
  UserDto,
} from '../src/api/client';

/**
 * Сетевой слой раздела «Пользователи». Единственное место, где дергается
 * сгенерированный клиент; выше по стеку сюда ходят только thunks из redux/.
 *
 * Удаления учётной записи в API нет: доступ забирают флагом `isActive`.
 */

export const fetchUsers = async (): Promise<UserDto[]> => {
  const { data } = await api.users.usersControllerFindAll();
  return data;
};

export const createUser = async (dto: CreateUserDto): Promise<UserDto> => {
  const { data } = await api.users.usersControllerCreate(dto);
  return data;
};

export const updateUser = async (id: number, dto: UpdateUserDto): Promise<UserDto> => {
  const { data } = await api.users.usersControllerUpdate(id, dto);
  return data;
};

export const fetchUserHistory = async (id: number): Promise<HistoryRecordDto[]> => {
  const { data } = await api.users.usersControllerFindHistory(id);
  return data;
};

/** Общий журнал изменений раздела, страницами. */
export const fetchUsersJournal = async (
  limit: number,
  offset: number,
): Promise<HistoryPageDto> => {
  const { data } = await api.users.usersControllerFindJournal(limit, offset);
  return data;
};
