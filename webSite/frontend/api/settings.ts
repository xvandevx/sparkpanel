import { api, BrandDto, SettingsDto, UpdateSettingsDto } from '../src/api/client';

/**
 * Сетевой слой настроек сайта: название, хранилище файлов, логотип. Единственное место,
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

/** Название и адрес логотипа — маршрут без входа: им подписан и экран входа. */
export const fetchBrand = async (): Promise<BrandDto> => {
  const { data } = await api.settings.settingsControllerBrand();
  return data;
};
