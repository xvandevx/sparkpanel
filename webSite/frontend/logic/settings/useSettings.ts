import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { loadSettingsThunk, saveSettingsThunk } from '../../redux/action-creaters/settings';
import type { UpdateSettingsDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { storagesApi } from './storagesApi';

/** Настройки сайта, как они лежат в базе. Перечитываются при каждом показе экрана. */
export function useSettings() {
  const dispatch = useDispatch<AppDispatch>();
  const { settings, isLoading, error } = useSelector((state: RootState) => state.settings);

  useEffect(() => {
    dispatch(loadSettingsThunk());
  }, [dispatch]);

  return { settings, isLoading, error };
}

/**
 * Сохранение изменённого; возвращает текст ошибки или null. Сменили хранилище
 * для новых файлов — список хранилищ перечитывается: выбранное нельзя удалить,
 * и замок в его строке должен переехать вслед за выбором.
 */
export function useSettingsActions() {
  const dispatch = useDispatch<AppDispatch>();
  const save = useCallback(
    async (changes: UpdateSettingsDto): Promise<string | null> => {
      const error = await dispatch(saveSettingsThunk(changes));
      if (error === null && changes.storageId !== undefined) {
        dispatch(loadEditorListThunk(ListKey.storages, storagesApi.list));
      }
      return error;
    },
    [dispatch],
  );
  return { save };
}
