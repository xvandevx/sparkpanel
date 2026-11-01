import type { SettingsDto } from '../../src/api/client';

export const SETTINGS_REQUEST = 'SETTINGS_REQUEST';
export const SETTINGS_SUCCESS = 'SETTINGS_SUCCESS';
export const SETTINGS_ERROR = 'SETTINGS_ERROR';
export const SETTINGS_SAVING = 'SETTINGS_SAVING';
export const SETTINGS_SAVED = 'SETTINGS_SAVED';

export interface SettingsState {
  /** Настройки сайта; до загрузки — пустые значения, а не null */
  values: SettingsDto;
  /** Идёт загрузка настроек */
  loading: boolean;
  /** Идёт сохранение */
  saving: boolean;
  /** Настройки уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  values: { siteName: '' },
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export type SettingsAction =
  | { type: typeof SETTINGS_REQUEST }
  | { type: typeof SETTINGS_SUCCESS; payload: SettingsDto }
  | { type: typeof SETTINGS_ERROR; payload: string }
  | { type: typeof SETTINGS_SAVING }
  | { type: typeof SETTINGS_SAVED };

export const settingsReducer = (
  state = initialState,
  action: SettingsAction,
): SettingsState => {
  switch (action.type) {
    case SETTINGS_REQUEST:
      return { ...state, loading: true, error: null };
    case SETTINGS_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, values: action.payload };
    case SETTINGS_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case SETTINGS_SAVING:
      return { ...state, saving: true, error: null };
    case SETTINGS_SAVED:
      return { ...state, saving: false };
    default:
      return state;
  }
};
