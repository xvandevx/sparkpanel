import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import { fetchSettingsThunk, saveSettingsThunk } from '../../redux/action-creaters/settings';
import type { SettingsDto, UpdateSettingsDto } from '../../src/api/client';

/** Действия раздела «Настройки»: только dispatch, без селекторов. */
export const useSettingsActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback(() => dispatch(fetchSettingsThunk()), [dispatch]);

  const save = useCallback(
    (dto: UpdateSettingsDto): Promise<SettingsDto | null> => dispatch(saveSettingsThunk(dto)),
    [dispatch],
  );

  return { load, save };
};
