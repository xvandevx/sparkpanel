import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { loadEditorListThunk } from '../../redux/action-creaters/contentEditorNew';
import { emptyNewEditorList } from '../../redux/reducers/contentEditorNewReducer';
import type { StorageDto } from '../../src/api/client';
import { ListKey } from '../listSettings';
import { storagesApi } from './storagesApi';

/** Встроенное хранилище в выборе: у него нет строки, его значение — пусто. */
export const BUILTIN_STORAGE = '';

/**
 * Из чего выбирают хранилище для новых файлов: встроенное и внешние.
 * Внешние — список редактора контента, тот же, что на экране «Хранилища»:
 * добавили там хранилище — оно появляется и здесь. Экран могут не открывать
 * вовсе, поэтому список грузится при показе выбора.
 */
export function useStorageOptions() {
  const dispatch = useDispatch<AppDispatch>();
  const list =
    useSelector((state: RootState) => state.contentEditorNew[ListKey.storages]) ??
    emptyNewEditorList;

  useEffect(() => {
    dispatch(loadEditorListThunk(ListKey.storages, storagesApi.list));
  }, [dispatch]);

  const options = useMemo(() => storageOptions(list.items as StorageDto[]), [list.items]);
  return { options, isLoading: list.isLoading };
}

/** Выключенное хранилище видно, но не выбирается: сервер его всё равно не примет. */
export const storageOptions = (
  storages: StorageDto[],
): { value: string; label: string; disabled?: boolean }[] => [
  { value: BUILTIN_STORAGE, label: 'Встроенное (MinIO панели)' },
  ...storages.map((storage) => ({
    value: String(storage.id),
    label: storage.isActive ? storage.name : `${storage.name} (выключено)`,
    disabled: !storage.isActive,
  })),
];
