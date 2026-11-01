import type { Dispatch } from 'redux';
import * as settingsApi from '../../api/settings';
import type { SettingsDto, UpdateSettingsDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  SETTINGS_ERROR,
  SETTINGS_REQUEST,
  SETTINGS_SAVED,
  SETTINGS_SAVING,
  SETTINGS_SUCCESS,
  SettingsAction,
} from '../reducers/settingsReducer';

/** Thunks — единственное место, откуда вызывается api/. */

export const fetchSettingsThunk = () => async (dispatch: Dispatch<SettingsAction>) => {
  dispatch({ type: SETTINGS_REQUEST });
  try {
    dispatch({ type: SETTINGS_SUCCESS, payload: await settingsApi.fetchSettings() });
  } catch (error) {
    dispatch({
      type: SETTINGS_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить настройки'),
    });
  }
};

/** Возвращает сохранённые настройки или null, если сервер их не принял. */
export const saveSettingsThunk =
  (dto: UpdateSettingsDto) =>
  async (dispatch: Dispatch<SettingsAction>): Promise<SettingsDto | null> => {
    dispatch({ type: SETTINGS_SAVING });
    try {
      // Ответ сервера уже нормализован (домен без протокола) — им и обновляем стейт
      const values = await settingsApi.updateSettings(dto);
      dispatch({ type: SETTINGS_SAVED });
      dispatch({ type: SETTINGS_SUCCESS, payload: values });
      return values;
    } catch (error) {
      dispatch({
        type: SETTINGS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить настройки'),
      });
      return null;
    }
  };
