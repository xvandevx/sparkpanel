import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../redux';
import {
  createFileSectionThunk,
  fetchFileSectionsThunk,
  fetchFilesThunk,
  removeFileSectionThunk,
  removeFileThunk,
  updateFileSectionThunk,
  updateFileThunk,
  uploadFilesThunk,
} from '../../redux/action-creaters/files';
import type {
  CreateFileSectionDto,
  FileDto,
  FileSectionDto,
  UpdateFileDto,
  UpdateFileSectionDto,
} from '../../src/api/client';

/** Действия раздела «Файлы»: только dispatch, без селекторов. */
export const useFilesActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const loadSections = useCallback(() => dispatch(fetchFileSectionsThunk()), [dispatch]);

  const loadFiles = useCallback(
    (sectionId: number) => dispatch(fetchFilesThunk(sectionId)),
    [dispatch],
  );

  const createSection = useCallback(
    (dto: CreateFileSectionDto): Promise<FileSectionDto | null> =>
      dispatch(createFileSectionThunk(dto)),
    [dispatch],
  );

  const updateSection = useCallback(
    (id: number, dto: UpdateFileSectionDto): Promise<FileSectionDto | null> =>
      dispatch(updateFileSectionThunk(id, dto)),
    [dispatch],
  );

  const removeSection = useCallback(
    (id: number): Promise<boolean> => dispatch(removeFileSectionThunk(id)),
    [dispatch],
  );

  const uploadFiles = useCallback(
    (sectionId: number, files: File[], description?: string): Promise<FileDto[]> =>
      dispatch(uploadFilesThunk(sectionId, files, description)),
    [dispatch],
  );

  const updateFile = useCallback(
    (id: number, dto: UpdateFileDto): Promise<FileDto | null> =>
      dispatch(updateFileThunk(id, dto)),
    [dispatch],
  );

  const removeFile = useCallback(
    (id: number, sectionId: number): Promise<boolean> =>
      dispatch(removeFileThunk(id, sectionId)),
    [dispatch],
  );

  return {
    loadSections,
    loadFiles,
    createSection,
    updateSection,
    removeSection,
    uploadFiles,
    updateFile,
    removeFile,
  };
};
