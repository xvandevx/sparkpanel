import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { useFilesActions } from './useFilesActions';
import { useFilesRoute } from './useFilesRoute';

/**
 * Разделы медиатеки. Нужны обоим уровням раздела — и списку разделов, и
 * странице файлов (хлебные крошки, выбор раздела при переносе), поэтому
 * грузятся один раз: повторные вызовы ничего не запрашивают.
 *
 * Сохранение перечитывает список само, так что «уже загружено» здесь
 * означает «в сторе лежит актуальное».
 */
export const useLoadFileSections = () => {
  const { loadSections } = useFilesActions();
  const { loading, loaded, error } = useSelector((state: RootState) => state.files);

  /** Попытка уже была: провалившийся запрос не опрашивается по кругу. */
  const attempted = useRef(false);

  useEffect(() => {
    if (loaded || loading || attempted.current) return;
    attempted.current = true;
    loadSections();
  }, [loadSections, loaded, loading]);

  return { isLoading: loading, loadFailed: !loaded && !loading && error !== null, error };
};

/** Файлы открытого раздела. Перечитываются при каждой смене раздела в адресе. */
export const useLoadSectionFiles = () => {
  const { loadFiles } = useFilesActions();
  const { sectionId } = useFilesRoute();
  const itemsSectionId = useSelector((state: RootState) => state.files.itemsSectionId);

  /**
   * За чьими файлами уже сходили в этот заход. Нужен отдельно от стора:
   * по нему видно, что попытка была и провалилась. Без него упавший запрос
   * либо перезапрашивался бы по кругу, либо не повторялся бы уже никогда.
   */
  const attempted = useRef<number | null>(null);

  useEffect(() => {
    // Ушли со страницы файлов — забываем попытку: вернуться в тот же раздел
    // и тем самым перезапросить файлы должно быть можно
    if (sectionId === null) {
      attempted.current = null;
      return;
    }
    // Файлы этого раздела уже в сторе: сохранение обновляет их само,
    // и лишний запрос затирал бы свежий ответ старым
    if (sectionId === itemsSectionId) return;
    if (sectionId === attempted.current) return;

    attempted.current = sectionId;
    loadFiles(sectionId);
  }, [itemsSectionId, loadFiles, sectionId]);
};
