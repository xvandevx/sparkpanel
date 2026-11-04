import { useCallback, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { UploadTarget } from '../../api/files';
import type { AppDispatch, RootState } from '../../redux';
import {
  importFileThunk,
  loadFilesThunk,
  removeFileThunk,
  uploadFileThunk,
} from '../../redux/action-creaters/files';

/**
 * Файлы пользователя — один список на раздел «Файлы» и на поле файла в карточке
 * записи. Перечитывается при каждом показе: файлы загружают и удаляют из разных
 * мест, и вернувшись в раздел, человек должен видеть то, что лежит на сервере.
 * Запрос, который уже в полёте, второй раз не уходит — это держит thunk.
 *
 * `isEnabled` выключает загрузку там, где файлы нужны не всегда: таблица
 * списка читает их, только если в ней видна колонка файла или изображения.
 */
export function useFiles(isEnabled = true) {
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, isLoaded, error } = useSelector((state: RootState) => state.files);

  useEffect(() => {
    if (isEnabled) dispatch(loadFilesThunk());
  }, [dispatch, isEnabled]);

  const fileById = useMemo(() => new Map(items.map((file) => [file.id, file])), [items]);

  return { files: items, fileById, isLoading, isLoaded, error };
}

/**
 * Что делают с файлом: загрузить, забрать внешний по адресу и удалить. Ошибку возвращают текстом —
 * показывает её тот, кто звал: у раздела и у карточки слова разные.
 */
export function useFileActions() {
  const dispatch = useDispatch<AppDispatch>();

  const upload = useCallback(
    (file: File, target: UploadTarget) => dispatch(uploadFileThunk(file, target)),
    [dispatch],
  );
  const importUrl = useCallback(
    (url: string, target: UploadTarget) => dispatch(importFileThunk(url, target)),
    [dispatch],
  );
  const remove = useCallback((id: number) => dispatch(removeFileThunk(id)), [dispatch]);

  return { upload, importUrl, remove };
}
