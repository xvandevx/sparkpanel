/**
 * Какие настройки есть у сайта и их значения по умолчанию. Ключ здесь — ключ
 * строки в таблице `settings`; новая настройка — новая строчка в этом списке,
 * а не новая колонка в базе. Ключ, которого здесь нет, не читается и не пишется.
 */
export const SETTINGS_DEFAULTS = {
  siteName: '',
  /**
   * Куда загружаются новые файлы: номер хранилища из `infoblock_storages`,
   * пусто — встроенное. Сами хранилища — своя таблица, здесь только выбор.
   */
  storageId: '',
};

export type SettingsValues = typeof SETTINGS_DEFAULTS;
export type SettingsKey = keyof SettingsValues;

export const SETTINGS_KEYS = Object.keys(SETTINGS_DEFAULTS) as SettingsKey[];

/** Ключ выбранного хранилища: его читают и хранилища — выбранное не удаляется. */
export const SELECTED_STORAGE_KEY: SettingsKey = 'storageId';

/** Строки из базы — в настройки: чего нет, то по умолчанию; незнакомые ключи мимо. */
export function settingsFrom(rows: { key: string; value: string }[]): SettingsValues {
  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const values: SettingsValues = { ...SETTINGS_DEFAULTS };
  for (const key of SETTINGS_KEYS) {
    const value = stored.get(key);
    if (value !== undefined) values[key] = value;
  }
  return values;
}

/** Номер хранилища из значения настройки; пусто или мусор — встроенное (null). */
export const storageIdOf = (value: string): number | null => {
  const id = Number(value);
  return value !== '' && Number.isInteger(id) && id > 0 ? id : null;
};
