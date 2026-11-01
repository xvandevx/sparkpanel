import { api, SettingsDto, UpdateSettingsDto } from '../src/api/client';

/**
 * Сетевой слой настроек сайта: название и хранилище файлов. Единственное место,
 * где дергается сгенерированный клиент.
 */

export const fetchSettings = async (): Promise<SettingsDto> => {
  const { data } = await api.settings.settingsControllerFind();
  return data;
};

/** Частичное обновление: уходит только изменённое. */
export const saveSettings = async (dto: UpdateSettingsDto): Promise<SettingsDto> => {
  const { data } = await api.settings.settingsControllerUpdate(dto);
  return data;
};
