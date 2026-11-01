import { api, SettingsDto, UpdateSettingsDto } from '../src/api/client';

/**
 * Сетевой слой раздела «Настройки». Единственное место, где дергается
 * сгенерированный клиент; выше по стеку сюда ходят только thunks из redux/.
 */

export const fetchSettings = async (): Promise<SettingsDto> => {
  const { data } = await api.settings.settingsControllerFind();
  return data;
};

/** Частичное обновление: отправляем только изменённые поля. */
export const updateSettings = async (dto: UpdateSettingsDto): Promise<SettingsDto> => {
  const { data } = await api.settings.settingsControllerUpdate(dto);
  return data;
};
