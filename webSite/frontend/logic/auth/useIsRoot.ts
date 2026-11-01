import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';

/**
 * Вошёл ли главный администратор. Управление панелью (пользователи, роли)
 * правит только он; роль сервер проверяет сам — это лишь то, что показать.
 */
export const useIsRoot = (): boolean =>
  useSelector((state: RootState) => state.auth.user?.isRoot === true);
