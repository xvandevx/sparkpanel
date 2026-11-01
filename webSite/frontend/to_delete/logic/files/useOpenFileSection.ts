import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import { useFilesRoute } from './useFilesRoute';
import { useLoadFileSections } from './useLoadFiles';

/**
 * Открытый раздел медиатеки: он сам плюс признаки «ещё грузится» и «такого нет».
 * По ним страница решает, показывать список файлов, индикатор или отказ.
 */
export const useOpenFileSection = () => {
  const { sections, loaded } = useSelector((state: RootState) => state.files);
  const { sectionId, isReady, backToSections } = useFilesRoute();
  const { isLoading, loadFailed, error } = useLoadFileSections();

  const section = useMemo(
    () => sections.find((item) => item.id === sectionId) ?? null,
    [sectionId, sections],
  );

  return {
    section,
    // Пока роутер не отдал номер и разделы не приехали, судить не о чем
    isLoading: !isReady || isLoading || (!loaded && !loadFailed),
    loadFailed,
    error,
    /** Разделы загружены, а этого в них нет — удалили или адрес неверный */
    isMissing: loaded && isReady && section === null,
    backToSections,
  };
};
