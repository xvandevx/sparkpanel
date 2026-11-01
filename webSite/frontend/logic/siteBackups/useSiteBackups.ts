import { useCallback, useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  createSiteBackupThunk,
  loadSiteBackupFileThunk,
  loadSiteBackupsThunk,
  removeSiteBackupThunk,
  restoreSiteBackupThunk,
  uploadSiteBackupThunk,
  type SiteBackup,
} from '../../redux/action-creaters/siteBackups';
import { saveBlobFile } from '../csv';
import { siteBackupFileName } from './siteBackupFormat';

/**
 * Резервные копии сайта глазами экрана «Резервные копии». В стор не кладутся:
 * читаются при открытии экрана и после каждой своей правки. Действия бросают
 * ошибку текстом — сообщение показывает тот, кто нажимал.
 */
export function useSiteBackups() {
  const dispatch = useDispatch<AppDispatch>();
  const [backups, setBackups] = useState<SiteBackup[]>([]);
  const [databaseSize, setDatabaseSize] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await dispatch(loadSiteBackupsThunk());
      setBackups(loaded.backups);
      setDatabaseSize(loaded.databaseSize);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить копии');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const create = async (): Promise<void> => {
    await dispatch(createSiteBackupThunk());
    await reload();
  };

  /** Файл копии с диска уходит на сервер как есть — проверяет его сервер. */
  const upload = async (file: File): Promise<void> => {
    await dispatch(uploadSiteBackupThunk(file));
    await reload();
  };

  const download = async (backup: SiteBackup): Promise<void> => {
    saveBlobFile(siteBackupFileName(backup), await dispatch(loadSiteBackupFileThunk(backup.id)));
  };

  const remove = async (backup: SiteBackup): Promise<void> => {
    await dispatch(removeSiteBackupThunk(backup.id));
    await reload();
  };

  /**
   * Вернуть базу к копии. После этого устарело всё, что панель держит
   * в сторе, — от меню до открытых списков, поэтому страница загружается
   * заново. Сессия та же: токен остаётся, пока его владелец есть в базе.
   */
  const restore = async (backup: SiteBackup): Promise<void> => {
    await dispatch(restoreSiteBackupThunk(backup.id));
    window.location.reload();
  };

  return { backups, databaseSize, isLoading, error, create, upload, download, remove, restore };
}
