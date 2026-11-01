import type { Dispatch } from 'redux';
import { fetchSettings, saveSettings } from '../../api/settings';
import type { UpdateSettingsDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  SETTINGS_ERROR,
  SETTINGS_REQUEST,
  SETTINGS_SUCCESS,
  type SettingsAction,
} from '../reducers/settingsReducer';

export const loadSettingsThunk =
  () =>
  async (dispatch: Dispatch<SettingsAction>): Promise<void> => {
    dispatch({ type: SETTINGS_REQUEST });
    try {
      dispatch({ type: SETTINGS_SUCCESS, payload: await fetchSettings() });
    } catch (error) {
      dispatch({
        type: SETTINGS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось загрузить настройки'),
      });
    }
  };

/**
 * Сохранение изменённого. Ответ сервера — сохранённые настройки целиком: они
 * и ложатся в стор. Возвращает текст ошибки или null — показывает её форма.
 */
export const saveSettingsThunk =
  (dto: UpdateSettingsDto) =>
  async (dispatch: Dispatch<SettingsAction>): Promise<string | null> => {
    try {
      dispatch({ type: SETTINGS_SUCCESS, payload: await saveSettings(dto) });
      return null;
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось сохранить настройки');
    }
  };
