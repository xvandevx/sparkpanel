import { createRole, fetchRoles, removeRole, updateRole } from '../../api/roles';
import type { CreateRoleDto, UpdateRoleDto } from '../../src/api/client';

/**
 * Где лежат роли пользователей. Назначенную роль сервер не удалит — она
 * приходит с `isBlocked`, и редактор вместо корзины покажет замок.
 *
 * Ключ записи у редактора строковый; в базе роль адресуется числом.
 */
export const rolesApi = {
  list: fetchRoles,
  create: (payload: Record<string, unknown>) => createRole(payload as unknown as CreateRoleDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateRole(Number(id), payload as UpdateRoleDto),
  remove: (id: string) => removeRole(Number(id)),
};

/** То же на просмотр: роли правит только главный администратор. */
export const rolesViewApi = { list: fetchRoles };
