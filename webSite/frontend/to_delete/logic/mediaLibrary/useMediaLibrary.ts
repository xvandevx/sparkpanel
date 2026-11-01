import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import { fetchFileSectionsThunk } from '../../redux/action-creaters/files';
import {
  fetchMediaLibraryThunk,
  uploadMediaThunk,
} from '../../redux/action-creaters/mediaLibrary';
import type { FileDto } from '../../src/api/client';
import type { EditorMediaRules } from '../editorForm';
import { useLoadFileSections } from '../files/useLoadFiles';
import { filterMedia, toMediaItem, type MediaItem } from './mediaItems';
import { checksResolution, mediaRuleError, readImageSize, resolutionError } from './mediaRules';

/** Файл в окне выбора и то, почему его нельзя выбрать (null — можно). */
export type MediaChoice = MediaItem & { blocked: string | null };

/**
 * Можно ли взять файл в поле: формат и вес — сразу, разрешение картинки — загрузив
 * её. Возвращает текст ошибки или null.
 */
async function checkMedia(
  facts: { name: string; mimeType: string; size: number },
  imageSource: string | File | null,
  rules: EditorMediaRules | undefined,
): Promise<string | null> {
  const invalid = mediaRuleError(facts, rules);
  if (invalid) return `«${facts.name}»: ${invalid}`;
  if (imageSource && checksResolution(rules)) {
    const size = await readImageSize(imageSource);
    const tooLarge = size ? resolutionError(size, rules) : null;
    if (tooLarge) return `«${facts.name}»: ${tooLarge}`;
  }
  return null;
}

/** Действия медиатеки: только dispatch, без селекторов. */
export const useMediaLibraryActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback(() => dispatch(fetchMediaLibraryThunk()), [dispatch]);

  /**
   * Медиатека вместе с разделами — перед выбором файла: и файлы, и разделы могли
   * появиться в «Файлах» уже после первой загрузки.
   */
  const refresh = useCallback(() => {
    dispatch(fetchMediaLibraryThunk());
    dispatch(fetchFileSectionsThunk());
  }, [dispatch]);

  const upload = useCallback(
    (sectionId: number, file: File): Promise<FileDto | null> =>
      dispatch(uploadMediaThunk(sectionId, file)),
    [dispatch],
  );

  return { load, refresh, upload };
};

/**
 * Медиатека для выбора файла: грузится один раз на сессию, когда поле
 * «файл» впервые появилось на экране. Загрузка из шторки перечитывает список
 * сама — «уже загружено» значит «в сторе лежит актуальное».
 */
export const useLoadMediaLibrary = () => {
  const { load } = useMediaLibraryActions();
  const { loading, loaded } = useSelector((state: RootState) => state.mediaLibrary);
  // Разделы нужны подписям файлов и выбору, куда загружать новый
  useLoadFileSections();

  /** Попытка уже была: провалившийся запрос не опрашивается по кругу. */
  const attempted = useRef(false);

  useEffect(() => {
    if (loaded || loading || attempted.current) return;
    attempted.current = true;
    load();
  }, [load, loaded, loading]);
};

/** Файлы медиатеки, уже подготовленные к показу, и выбор раздела для загрузки. */
export const useMediaLibrary = () => {
  const { items, loading, uploading, error } = useSelector(
    (state: RootState) => state.mediaLibrary,
  );
  const sections = useSelector((state: RootState) => state.files.sections);
  const { upload } = useMediaLibraryActions();

  const byId = useMemo(() => {
    const map = new Map<number, MediaItem>();
    for (const file of items) map.set(file.id, toMediaItem(file, sections));
    return map;
  }, [items, sections]);

  /**
   * Поиск по медиатеке: имя, описание и раздел. Файлы, которые не подходят под
   * ограничения поля, остаются в списке, но с причиной — чтобы было видно, почему
   * нужной картинки нельзя выбрать.
   */
  const search = useCallback(
    (query: string, sectionId: number | null, rules?: EditorMediaRules): MediaChoice[] =>
      filterMedia(items, query, sectionId).map((file) => {
        const item = byId.get(file.id) as MediaItem;
        return { ...item, blocked: mediaRuleError(item, rules) };
      }),
    [byId, items],
  );

  /** Проверка выбранного в медиатеке файла — с разрешением картинки. */
  const checkPick = useCallback(
    (item: MediaItem, rules?: EditorMediaRules) =>
      checkMedia(item, item.isImage ? item.url : null, rules),
    [],
  );

  /** Проверка файла с диска до загрузки: в медиатеку не должно попасть то, что поле не примет. */
  const checkUpload = useCallback(
    (file: File, rules?: EditorMediaRules) =>
      checkMedia(
        { name: file.name, mimeType: file.type, size: file.size },
        file.type.startsWith('image/') ? file : null,
        rules,
      ),
    [],
  );

  const sectionOptions = useMemo(
    () => sections.map((section) => ({ value: section.id, label: section.name })),
    [sections],
  );

  return {
    /** Номер файла → готовая к показу карточка; файла нет — его удалили из медиатеки */
    byId,
    search,
    sectionOptions,
    isLoading: loading,
    uploading,
    error,
    upload,
    checkPick,
    checkUpload,
  };
};
