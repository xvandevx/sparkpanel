import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { useAuthActions } from './useAuthActions';

/** Логика первичной настройки: создание единственной учётной записи администратора. */
export const useRootSetup = () => {
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const { createRoot } = useAuthActions();

  return { loading, error, submit: createRoot };
};
