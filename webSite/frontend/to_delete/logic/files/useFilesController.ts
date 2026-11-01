import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import type { FileDto } from '../../src/api/client';
import {
  EditorRowActionIcon,
  type ContentEditorController,
  type EditorRecord,
  type EditorRow,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import { fileColumns, fileFields, fileTabs } from './fileFields';
import { pickedFiles, text, toNumericId } from './fileValues';
import {
  absoluteFileUrl,
  fileKind,
  fileKindLabel,
  formatFileDate,
  formatFileSize,
} from './filesFormat';
import { useFilesActions } from './useFilesActions';
import { useFilesRoute } from './useFilesRoute';

/**
 * Файлы открытого раздела — второй экран (`/admin/files/2`).
 *
 * Запись здесь заводится самим файлом: «добавить» открывает шторку с полем
 * выбора файлов, и сохранение — это загрузка. Дальше правится только карточка
 * (описание и раздел): содержимое файла перезаливают заново.
 */
export const useFilesController = (): ContentEditorController => {
  const { items, itemsSectionId, sections, filesLoading, uploading, saving, error } = useSelector(
    (state: RootState) => state.files,
  );
  const { loadFiles, uploadFiles, updateFile, removeFile } = useFilesActions();
  const { sectionId } = useFilesRoute();

  // В сторе может лежать список прошлого раздела — показывать его как файлы
  // нового нельзя: до ответа сервера таблица просто грузится.
  const isCurrent = sectionId !== null && itemsSectionId === sectionId;

  const rows = useMemo<EditorRow[]>(() => (isCurrent ? items.map(toRow) : []), [isCurrent, items]);

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      files: [],
      name: String(record.name ?? ''),
      url: String(record.url ?? ''),
      sizeLabel: String(record.sizeLabel ?? ''),
      dateLabel: String(record.dateLabel ?? ''),
      description: String(record.description ?? ''),
      sectionId: record.sectionId === undefined ? null : String(record.sectionId),
    }),
    [],
  );

  const emptyValues = useCallback(
    (): EditorValues => ({
      files: [],
      description: '',
      // Новый файл попадает в открытый раздел; сменить его можно тут же
      sectionId: sectionId === null ? null : String(sectionId),
    }),
    [sectionId],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const target = toNumericId(values.sectionId) ?? sectionId;
      if (target === null) return null;

      const number = toNumericId(id);

      if (number === null) {
        const uploaded = await uploadFiles(target, pickedFiles(values), text(values.description));
        // Пачку заливаем разом, а открыть можно одну запись — берём последнюю
        return uploaded.length > 0 ? String(uploaded[uploaded.length - 1].id) : null;
      }

      const saved = await updateFile(number, {
        description: text(values.description),
        sectionId: target,
      });
      if (!saved) return null;

      // Файл уехал в другой раздел — в открытом ему больше не место:
      // список перечитываем, иначе он остался бы в таблице до перезагрузки
      if (sectionId !== null && target !== sectionId) loadFiles(sectionId);

      return String(saved.id);
    },
    [loadFiles, sectionId, updateFile, uploadFiles],
  );

  const remove = useCallback(
    async (record: EditorRecord) => {
      const number = toNumericId(record.id);
      if (number === null || sectionId === null) return false;
      return removeFile(number, sectionId);
    },
    [removeFile, sectionId],
  );

  const fields = useMemo(() => fileFields(sections), [sections]);

  return {
    list: {
      title: 'Файлы',
      addLabel: 'Загрузить файлы',
      rows,
      columns: useMemo(fileColumns, []),
      isLoading: sectionId !== null && (filesLoading || !isCurrent),
      isSaving: saving || uploading,
      error,
    },
    form: {
      fields,
      tabs: useMemo(fileTabs, []),
      valuesOf,
      emptyValues,
    },
    actions: {
      save,
      remove,
      rowAction: {
        icon: EditorRowActionIcon.Open,
        title: (record) => `Открыть «${String(record.name ?? '')}»`,
        run: (record) => {
          const url = String(record.url ?? '');
          if (url) window.open(absoluteFileUrl(url), '_blank', 'noopener');
        },
      },
    },
    // У файлов каждого раздела свои свойства
    settings: sectionId === null ? undefined : { key: ListKey.files(sectionId) },
  };
};

/** Файл → строка таблицы: размер, дата и вид уже посчитаны, таблица их только рисует. */
const toRow = (file: FileDto): EditorRow => ({
  ...file,
  id: String(file.id),
  description: file.description ?? '',
  sizeLabel: formatFileSize(file.size),
  dateLabel: formatFileDate(file.createdAt),
  kindLabel: fileKindLabel(fileKind(file.mimeType, file.name)),
});
