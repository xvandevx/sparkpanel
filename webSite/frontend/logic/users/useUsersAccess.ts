import { useIsRoot } from '../auth';
import { rolesApi, rolesViewApi } from './rolesApi';
import { usersApi, usersViewApi } from './usersApi';

/**
 * Раздел «Пользователи» глазами того, кто вошёл. Пользователей и роли правит
 * только главный администратор; остальным достаётся Api на просмотр — без
 * `create`/`update`/`remove` редактор сам уберёт «Добавить», «Сохранить»
 * и корзину. Права всё равно проверяет сервер: это лишь то, что показать.
 */
export function useUsersAccess() {
  const isRoot = useIsRoot();
  return {
    isRoot,
    usersApi: isRoot ? usersApi : usersViewApi,
    rolesApi: isRoot ? rolesApi : rolesViewApi,
  };
}
