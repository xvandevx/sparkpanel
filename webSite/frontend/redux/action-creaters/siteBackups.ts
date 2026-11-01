import {
  createSiteBackup,
  fetchSiteBackupFile,
  fetchSiteBackups,
  removeSiteBackup,
  restoreSiteBackup,
  uploadSiteBackup,
} from '../../api/siteBackups';
import type { SiteBackupDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';

/** Откуда копия: кнопкой, перед восстановлением или из файла. */
export type SiteBackupKind = 'manual' | 'before-restore' | 'upload';

/** Копия сайта в списке копий — без самих данных. */
export interface SiteBackup {
  id: number;
  kind: SiteBackupKind;
  /** У загруженной — имя файла */
  note: string;
  tablesCount: number;
  rowsCount: number;
  /** Размер файла копии, байт */
  size: number;
  authorEmail: string;
  createdAt: string;
}

const toBackup = (dto: SiteBackupDto): SiteBackup => ({
  ...dto,
  kind: dto.kind as SiteBackupKind,
  createdAt: String(dto.createdAt),
});

/**
 * Копии сайта, как и копии списка, в стор не кладутся: их видит один экран
 * и читает при каждом показе. Ошибку бросают текстом.
 */
const backupCall = async <T>(run: () => Promise<T>, failure: string): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw new Error(apiErrorMessage(error, failure));
  }
};

export const loadSiteBackupsThunk =
  () =>
  async (): Promise<{ backups: SiteBackup[]; databaseSize: number }> =>
    backupCall(async () => {
      const { items, databaseSize } = await fetchSiteBackups();
      return { backups: items.map(toBackup), databaseSize };
    }, 'Не удалось загрузить копии');

export const createSiteBackupThunk = () => async (): Promise<SiteBackup> =>
  backupCall(async () => toBackup(await createSiteBackup()), 'Не удалось создать копию');

export const uploadSiteBackupThunk = (file: File) => async (): Promise<SiteBackup> =>
  backupCall(async () => toBackup(await uploadSiteBackup(file)), 'Не удалось загрузить копию');

export const loadSiteBackupFileThunk = (id: number) => async (): Promise<Blob> =>
  backupCall(() => fetchSiteBackupFile(id), 'Не удалось скачать копию');

/** Вернуть базу к копии. Всё, что лежит в сторе, после этого устарело — перечитывает страница целиком. */
export const restoreSiteBackupThunk = (id: number) => async (): Promise<SiteBackup> =>
  backupCall(async () => toBackup(await restoreSiteBackup(id)), 'Не удалось восстановить сайт');

export const removeSiteBackupThunk = (id: number) => async (): Promise<void> =>
  backupCall(() => removeSiteBackup(id), 'Не удалось удалить копию');
