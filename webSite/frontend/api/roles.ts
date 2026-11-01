import { api, CreateRoleDto, RoleDto, UpdateRoleDto } from '../src/api/client';

/**
 * Сетевой слой ролей пользователей (`/api/infoblocks/roles` — список
 * редактора контента). Единственное место, где дергается сгенерированный клиент.
 */

export const fetchRoles = async (): Promise<RoleDto[]> => {
  const { data } = await api.infoblockRoles.rolesControllerFindAll();
  return data;
};

export const createRole = async (dto: CreateRoleDto): Promise<RoleDto> => {
  const { data } = await api.infoblockRoles.rolesControllerCreate(dto);
  return data;
};

export const updateRole = async (id: number, dto: UpdateRoleDto): Promise<RoleDto> => {
  const { data } = await api.infoblockRoles.rolesControllerUpdate(id, dto);
  return data;
};

/** Удаляет роль, которую никому не назначили: назначенную сервер не отдаст (409). */
export const removeRole = async (id: number): Promise<void> => {
  await api.infoblockRoles.rolesControllerRemove(id);
};
