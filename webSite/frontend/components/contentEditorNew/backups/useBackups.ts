import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveTextFile } from '../../../logic/csv';
import type { AppDispatch, RootState } from '../../../redux';
import {
  checkEditorBackupThunk,
  createEditorBackupThunk,
  loadEditorBackupFileThunk,
  loadEditorBackupsThunk,
  removeEditorBackupThunk,
  restoreEditorBackupThunk,
  uploadEditorBackupThunk,
  type EditorBackup,
  type EditorBackupCheck,
  type EditorRestoreBody,
} from '../../../redux/action-creaters/contentEditorNew';
import type { EditorListApi } from '../useLoadEditor';
import { backupFileName } from './backupFormat';

/**
 * Резервные копии списка глазами шторки. Как журнал, в стор не кладутся:
 * читаются при каждом открытии и забываются с закрытием. После своей правки
 * (создали, загрузили, удалили, восстановили) список копий перечитывается.
 *
 * Действия бросают ошибку текстом — сообщение показывает тот, кто нажимал.
 */
export function useBackups(listKey: string, isOpen: boolean) {
  const dispatch = useDispatch<AppDispatch>();
  const code = useSelector((state: RootState) => state.contentEditorNew[listKey]?.settings?.code ?? null);
  const [backups, setBackups] = useState<EditorBackup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      setBackups(await dispatch(loadEditorBackupsThunk(listKey)));
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить копии');
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, listKey]);

  useEffect(() => {
    if (isOpen) void reload();
  }, [isOpen, reload]);

  const create = async (note: string): Promise<void> => {
    await dispatch(createEditorBackupThunk(listKey, note));
    await reload();
  };

  /** Файл копии с диска: читается как JSON и уходит на сервер, проверяет его сервер. */
  const upload = async (file: File): Promise<void> => {
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(await file.text()) as Record<string, unknown>;
    } catch {
      throw new Error('Это не файл резервной копии: в нём не JSON');
    }
    await dispatch(uploadEditorBackupThunk(listKey, file.name, data));
    await reload();
  };

  const download = async (backup: EditorBackup): Promise<void> => {
    const data = await dispatch(loadEditorBackupFileThunk(listKey, backup.id));
    saveTextFile(
      backupFileName(code || listKey, backup),
      JSON.stringify(data, null, 2),
      'application/json;charset=utf-8',
    );
  };

  const remove = async (backup: EditorBackup): Promise<void> => {
    await dispatch(removeEditorBackupThunk(listKey, backup.id));
    await reload();
  };

  return { backups, isLoading, error, reload, create, upload, download, remove };
}

/**
 * Проверить и вернуть копию — для окна восстановления. Только действия,
 * без состояния: список копий держит шторка.
 */
export function useRestoreActions(listKey: string, api: EditorListApi) {
  const dispatch = useDispatch<AppDispatch>();

  const check = useCallback(
    (backupId: number): Promise<EditorBackupCheck> => dispatch(checkEditorBackupThunk(listKey, backupId)),
    [dispatch, listKey],
  );

  /** Вернуть копию; таблицу, настройки и свойства перечитывает сам thunk. */
  const restore = async (backupId: number, body: EditorRestoreBody): Promise<void> => {
    await dispatch(restoreEditorBackupThunk(listKey, backupId, body, api.list));
  };

  return { check, restore };
}
