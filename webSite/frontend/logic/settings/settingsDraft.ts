import type { SettingsDto, UpdateSettingsDto } from '../../src/api/client';

/**
 * Черновик формы настроек и что из него уходит на сервер. Чистые функции:
 * ни React, ни сети.
 */
export interface SettingsDraft {
  siteName: string;
  /** Хранилище для новых файлов: номер строкой, пусто — встроенное (выбору так проще) */
  storageId: string;
}

export const draftOf = (settings: SettingsDto): SettingsDraft => ({
  siteName: settings.siteName,
  storageId: settings.storageId === null ? '' : String(settings.storageId),
});

/** Только изменённое: правка названия не должна трогать выбор хранилища. */
export const changesOf = (draft: SettingsDraft, settings: SettingsDto): UpdateSettingsDto => {
  const saved = draftOf(settings);
  return {
    ...(draft.siteName.trim() !== saved.siteName.trim() ? { siteName: draft.siteName.trim() } : {}),
    // `null` — осознанный выбор встроенного хранилища
    ...(draft.storageId !== saved.storageId
      ? { storageId: draft.storageId === '' ? null : Number(draft.storageId) }
      : {}),
  };
};
