import type { SettingsDto } from '../../src/api/client';

/** Настройки сайта: как они лежат в базе. Черновик формы живёт в самой форме. */

export const SETTINGS_REQUEST = 'SETTINGS_REQUEST';
export const SETTINGS_SUCCESS = 'SETTINGS_SUCCESS';
export const SETTINGS_ERROR = 'SETTINGS_ERROR';

export interface SettingsState {
  /** null — ещё не пришли */
  settings: SettingsDto | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SettingsState = { settings: null, isLoading: false, error: null };

export type SettingsAction =
  | { type: typeof SETTINGS_REQUEST }
  | { type: typeof SETTINGS_SUCCESS; payload: SettingsDto }
  | { type: typeof SETTINGS_ERROR; payload: string };

export const settingsReducer = (
  state: SettingsState = initialState,
  action: SettingsAction,
): SettingsState => {
  switch (action.type) {
    case SETTINGS_REQUEST:
      return { ...state, isLoading: true, error: null };
    case SETTINGS_SUCCESS:
      return { settings: action.payload, isLoading: false, error: null };
    case SETTINGS_ERROR:
      return { ...state, isLoading: false, error: action.payload };
    default:
      return state;
  }
};
