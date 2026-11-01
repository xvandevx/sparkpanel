import type { EditorValues } from '../editorForm';
import type { SettingsDto, UpdateSettingsDto } from '../../src/api/client';

/** Чем закончилось сохранение — по этому компонент решает, что показать. */
export type SettingsSaveStatus = 'saved' | 'unchanged' | 'error';

export const validateSiteName = (value: unknown): string | null =>
  String(value ?? '').trim().length > 255 ? 'Название длиннее 255 символов' : null;

/** Настройки с бэкенда — в значения формы. */
export const settingsToValues = (settings: SettingsDto): EditorValues => ({
  siteName: settings.siteName ?? '',
});

/** Значения формы — в каноничный вид: так они и сохранятся. */
export const valuesToSettings = (values: EditorValues): SettingsDto => ({
  siteName: String(values.siteName ?? '').trim(),
});

/** Патч только из изменённых полей: на бэкенд уходит то, что реально правили. */
export const buildSettingsPatch = (
  current: SettingsDto,
  values: EditorValues,
): UpdateSettingsDto => {
  const next = valuesToSettings(values);
  const patch: UpdateSettingsDto = {};
  if (next.siteName !== current.siteName) patch.siteName = next.siteName;
  return patch;
};
