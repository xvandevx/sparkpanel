import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadInfoblockHistoryThunk,
  loadInfoblocksJournalThunk,
} from '../../redux/action-creaters/infoblocks';
import type {
  CreateInfoblockSectionDto,
  UpdateInfoblockSectionDto,
} from '../../src/api/client';
import {
  EditorRowActionIcon,
  toEditorHistoryPage,
  toEditorHistoryRecord,
  type ContentEditorController,
  type EditorRecord,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import {
  NEW_RECORD_ID,
  nextSectionPosition,
  parseSectionRecordId,
  sectionRecordId,
  text,
  toPosition,
} from './infoblockIds';
import { INFOBLOCKS_HISTORY_LABELS } from './historyLabels';
import { sectionColumns, sectionFields, sectionTabs } from './sectionFields';
import { useInfoblocksActions } from './useInfoblocksActions';
import { useInfoblocksRoute } from './useInfoblocksRoute';

/**
 * Типы инфоблоков для универсального редактора контента — первый экран
 * раздела (`/admin/infoblocks`). Список плоский: вложенности у типов нет,
 * а инфоблоки живут на странице своего типа, куда ведёт кнопка в строке.
 */
export const useSectionsController = (): ContentEditorController => {
  const { sections, loading, saving, error } = useSelector(
    (state: RootState) => state.infoblocks,
  );
  const { saveSection, removeSection } = useInfoblocksActions();
  const { openSection } = useInfoblocksRoute();
  const dispatch = useDispatch<AppDispatch>();

  /** Ключ строки — тот же, что у записи в журнале: ссылки из него работают без перевода. */
  const rows = useMemo(
    () =>
      sections.map((section) => ({
        ...section,
        id: sectionRecordId(section.id),
        blocksCount: (section.blocks ?? []).length,
      })),
    [sections],
  );

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      code: String(record.code ?? ''),
      name: String(record.name ?? ''),
      description: String(record.description ?? ''),
      position: Number(record.position ?? 0),
    }),
    [],
  );

  const emptyValues = useCallback(
    (): EditorValues => ({
      id: NEW_RECORD_ID,
      code: '',
      name: '',
      description: '',
      position: nextSectionPosition(sections),
    }),
    [sections],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const section = await saveSection(parseSectionRecordId(id), toSectionPayload(values));
      return section ? sectionRecordId(section.id) : null;
    },
    [saveSection],
  );

  const remove = useCallback(
    async (record: EditorRecord) => {
      const number = parseSectionRecordId(record.id);
      if (number === null) return false;
      return removeSection(number);
    },
    [removeSection],
  );

  const loadRecordHistory = useCallback(
    async (id: string) =>
      (await dispatch(loadInfoblockHistoryThunk(id))).map(toEditorHistoryRecord),
    [dispatch],
  );

  const loadJournal = useCallback(
    async (limit: number, offset: number) =>
      toEditorHistoryPage(await dispatch(loadInfoblocksJournalThunk(limit, offset))),
    [dispatch],
  );

  return {
    list: {
      title: 'Типы инфоблоков',
      addLabel: 'Добавить тип',
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
      rowAction: {
        icon: EditorRowActionIcon.Enter,
        title: (record) => `Инфоблоки типа «${String(record.name ?? '')}»`,
        run: (record) => {
          const number = parseSectionRecordId(record.id);
          if (number !== null) openSection(number);
        },
      },
    },
    history: {
      loadRecord: loadRecordHistory,
      loadJournal,
      // Журнал общий на весь раздел: инфоблоки и записи в нём тоже есть,
      // но строк для них в этой таблице нет — ссылку им не даём
      canOpenRecord: (entityId) => parseSectionRecordId(entityId) !== null,
      fieldLabels: INFOBLOCKS_HISTORY_LABELS,
    },
    settings: { key: ListKey.infoblockSections },
  };
};

/** Значения формы → тело запроса. Пустое пояснение — это null, а не "". */
function toSectionPayload(
  values: EditorValues,
): CreateInfoblockSectionDto | UpdateInfoblockSectionDto {
  return {
    code: text(values.code),
    name: text(values.name),
    description: text(values.description) || null,
    position: toPosition(values.position),
  };
}
