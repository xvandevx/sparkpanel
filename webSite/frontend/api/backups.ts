import {
  api,
  BackupCheckDto,
  BackupDto,
  RestoreBackupDtoModeEnum,
} from '../src/api/client';

/**
 * Резервные копии списка: снять, загрузить из файла, скачать, проверить
 * и вернуть. Копия — снимок настроек и записей одного списка; как её вернуть,
 * решает сервер, здесь только маршруты.
 */

export type RestoreMode = `${RestoreBackupDtoModeEnum}`;

/** Что вернуть из копии и как. */
export interface RestoreBody {
  mode: RestoreMode;
  isRecords: boolean;
  isSettings: boolean;
}

export const fetchBackups = async (listKey: string): Promise<BackupDto[]> => {
  const { data } = await api.infoblockBackups.backupsControllerFindAll(listKey);
  return data;
};

export const createBackup = async (listKey: string, note: string): Promise<BackupDto> => {
  const { data } = await api.infoblockBackups.backupsControllerCreate(listKey, { note });
  return data;
};

/** Загрузить копию из файла: `data` — содержимое файла, как его отдал `fetchBackupFile`. */
export const uploadBackup = async (
  listKey: string,
  note: string,
  file: Record<string, unknown>,
): Promise<BackupDto> => {
  const { data } = await api.infoblockBackups.backupsControllerUpload(listKey, { note, data: file });
  return data;
};

/** Копия целиком — для файла. */
export const fetchBackupFile = async (listKey: string, id: number): Promise<Record<string, unknown>> => {
  const { data } = await api.infoblockBackups.backupsControllerFile(listKey, id);
  return data;
};

export const fetchBackupCheck = async (listKey: string, id: number): Promise<BackupCheckDto> => {
  const { data } = await api.infoblockBackups.backupsControllerCheck(listKey, id);
  return data;
};

/** Вернуть копию; ответ — копия того, что было до восстановления. */
export const restoreBackup = async (
  listKey: string,
  id: number,
  body: RestoreBody,
): Promise<BackupDto> => {
  const { data } = await api.infoblockBackups.backupsControllerRestore(listKey, id, {
    ...body,
    mode: body.mode as RestoreBackupDtoModeEnum,
  });
  return data;
};

export const removeBackup = async (listKey: string, id: number): Promise<void> => {
  await api.infoblockBackups.backupsControllerRemove(listKey, id);
};
