import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../redux';
import {
  EditorRowActionIcon,
  type ContentEditorController,
  type EditorRecord,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import { text, toNumericId } from './fileValues';
import { sectionColumns, sectionFields, sectionTabs } from './sectionFields';
import { useFilesActions } from './useFilesActions';
import { useFilesRoute } from './useFilesRoute';

/**
 * Разделы медиатеки — первый экран раздела (`/admin/files`). Список плоский:
 * файлы живут на собственной странице раздела, куда ведёт кнопка в строке.
 */
export const useFileSectionsController = (): ContentEditorController => {
  const { sections, loading, saving, error } = useSelector((state: RootState) => state.files);
  const { createSection, updateSection, removeSection } = useFilesActions();
  const { openSection } = useFilesRoute();

  const rows = useMemo(
    () => sections.map((section) => ({ ...section, id: String(section.id) })),
    [sections],
  );

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      code: String(record.code ?? ''),
      name: String(record.name ?? ''),
    }),
    [],
  );

  const emptyValues = useCallback((): EditorValues => ({ code: '', name: '' }), []);

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const payload = { code: text(values.code), name: text(values.name) };
      const number = toNumericId(id);

      const section =
        number === null ? await createSection(payload) : await updateSection(number, payload);
      return section ? String(section.id) : null;
    },
    [createSection, updateSection],
  );

  const remove = useCallback(
    async (record: EditorRecord) => {
      const number = toNumericId(record.id);
      return number === null ? false : removeSection(number);
    },
    [removeSection],
  );

  return {
    list: {
      title: 'Разделы медиатеки',
      addLabel: 'Добавить раздел',
      rows,
      columns: useMemo(sectionColumns, []),
      isLoading: loading,
      isSaving: saving,
      error,
    },
    form: {
      fields: useMemo(sectionFields, []),
      tabs: useMemo(sectionTabs, []),
      valuesOf,
      emptyValues,
    },
    actions: {
      save,
      remove,
      // Непустой раздел удалить нельзя — это же проверяет и сервер (409)
      canRemove: (record) => Number(record.filesCount ?? 0) === 0,
      rowAction: {
        icon: EditorRowActionIcon.Enter,
        title: (record) => `Файлы раздела «${String(record.name ?? '')}»`,
        run: (record) => {
          const number = toNumericId(record.id);
          if (number !== null) openSection(number);
        },
      },
    },
    settings: { key: ListKey.fileSections },
  };
};
