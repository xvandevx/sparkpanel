import type { BrandDto, SettingsDto } from '../../src/api/client';

/** Настройки сайта: как они лежат в базе. Черновик формы живёт в самой форме. */

export const SETTINGS_REQUEST = 'SETTINGS_REQUEST';
export const SETTINGS_SUCCESS = 'SETTINGS_SUCCESS';
export const SETTINGS_ERROR = 'SETTINGS_ERROR';
export const BRAND_SUCCESS = 'BRAND_SUCCESS';

export interface SettingsState {
  /** null — ещё не пришли */
  settings: SettingsDto | null;
  isLoading: boolean;
  error: string | null;
  /**
   * Чем подписана панель — название и логотип; читается и до входа.
   * null — ещё не пришло: логотип не рисуем, чтобы SparkPanel не мелькнул
   * перед своим.
   */
  brand: BrandDto | null;
}

const initialState: SettingsState = { settings: null, isLoading: false, error: null, brand: null };

export type SettingsAction =
  | { type: typeof SETTINGS_REQUEST }
  | { type: typeof SETTINGS_SUCCESS; payload: SettingsDto }
  | { type: typeof SETTINGS_ERROR; payload: string }
  | { type: typeof BRAND_SUCCESS; payload: BrandDto };

export const settingsReducer = (
  state: SettingsState = initialState,
  action: SettingsAction,
): SettingsState => {
  switch (action.type) {
    case SETTINGS_REQUEST:
      return { ...state, isLoading: true, error: null };
    case SETTINGS_SUCCESS:
      return { ...state, settings: action.payload, isLoading: false, error: null };
    case SETTINGS_ERROR:
      return { ...state, isLoading: false, error: action.payload };
    case BRAND_SUCCESS:
      return { ...state, brand: action.payload };
    default:
      return state;
  }
};
