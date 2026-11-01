import { api, SiteBackupDto, SiteBackupsDto } from '../src/api/client';

/**
 * Резервные копии всего сайта (`/api/site-backups`): база целиком, без файлов.
 * Снять, загрузить из файла, скачать, вернуть и удалить — только маршруты,
 * как вернуть копию, решает сервер.
 */

export const fetchSiteBackups = async (): Promise<SiteBackupsDto> => {
  const { data } = await api.siteBackups.siteBackupsControllerFindAll();
  return data;
};

export const createSiteBackup = async (): Promise<SiteBackupDto> => {
  const { data } = await api.siteBackups.siteBackupsControllerCreate();
  return data;
};

/** Файл копии с диска — multipart, его собирает сгенерированный клиент. */
export const uploadSiteBackup = async (file: File): Promise<SiteBackupDto> => {
  const { data } = await api.siteBackups.siteBackupsControllerUpload(file);
  return data;
};

/** Копия файлом: сжатый JSON, как его отдаёт сервер. */
export const fetchSiteBackupFile = async (id: number): Promise<Blob> => {
  const { data } = await api.siteBackups.siteBackupsControllerFile(id, { responseType: 'blob' });
  return data as unknown as Blob;
};

/** Вернуть базу к копии; ответ — копия того, что было до восстановления. */
export const restoreSiteBackup = async (id: number): Promise<SiteBackupDto> => {
  const { data } = await api.siteBackups.siteBackupsControllerRestore(id);
  return data;
};

export const removeSiteBackup = async (id: number): Promise<void> => {
  await api.siteBackups.siteBackupsControllerRemove(id);
};
