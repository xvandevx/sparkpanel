import type { SettingsDto, UpdateSettingsDto } from '../../src/api/client';

/**
 * Черновик формы настроек и что из него уходит на сервер. Чистые функции:
 * ни React, ни сети.
 */
export interface SettingsDraft {
  siteName: string;
  /** Хранилище для новых файлов: номер строкой, пусто — встроенное (выбору так проще) */
  storageId: string;
  /**
   * Логотип: адрес сохранённого, data URI выбранного с диска или пусто —
   * SparkPanel. Оба вида годятся в `<img src>`, поэтому форма показывает его как есть
   */
  logo: string;
}

export const draftOf = (settings: SettingsDto): SettingsDraft => ({
  siteName: settings.siteName,
  storageId: settings.storageId === null ? '' : String(settings.storageId),
  logo: settings.logoUrl,
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
    // Не трогали — в черновике адрес сохранённого, и он не уходит. `null` —
    // вернуть логотип SparkPanel
    ...(draft.logo !== saved.logo ? { logo: draft.logo === '' ? null : draft.logo } : {}),
  };
};
