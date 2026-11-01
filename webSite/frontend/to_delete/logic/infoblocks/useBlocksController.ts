import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadInfoblockHistoryThunk,
  loadInfoblocksJournalThunk,
} from '../../redux/action-creaters/infoblocks';
import type { CreateInfoblockDto, UpdateInfoblockDto } from '../../src/api/client';
import {
  EditorRowActionIcon,
  toEditorHistoryPage,
  toEditorHistoryRecord,
  type ContentEditorController,
  type EditorRecord,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import { blockColumns, blockFields, blockTabs } from './blockFields';
import {
  DEFAULT_ELEMENT_NAME,
  NEW_RECORD_ID,
  blockRecordId,
  blocksOfSection,
  nextBlockPosition,
  parseBlockRecordId,
  text,
  toNumericId,
  toPosition,
} from './infoblockIds';
import { INFOBLOCKS_HISTORY_LABELS } from './historyLabels';
import { useInfoblocksActions } from './useInfoblocksActions';
import { useInfoblocksRoute } from './useInfoblocksRoute';

/**
 * Инфоблоки одного типа — второй экран (`/admin/infoblocks/2`). Список
 * плоский: записи инфоблока живут на его собственной странице, куда ведёт
 * кнопка в строке.
 */
export const useBlocksController = (): ContentEditorController => {
  const { sections, loading, saving, error } = useSelector(
    (state: RootState) => state.infoblocks,
  );
  const { saveBlock, removeBlock } = useInfoblocksActions();
  const { sectionId, openBlock } = useInfoblocksRoute();
  const dispatch = useDispatch<AppDispatch>();

  const blocks = useMemo(() => blocksOfSection(sections, sectionId), [sections, sectionId]);

  /** Ключ строки — тот же, что у записи в журнале: ссылки из него работают без перевода. */
  const rows = useMemo(
    () => blocks.map((block) => ({ ...block, id: blockRecordId(block.id) })),
    [blocks],
  );

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      code: String(record.code ?? ''),
      name: String(record.name ?? ''),
      elementName: String(record.elementName ?? ''),
      sectionId: record.sectionId === undefined ? null : String(record.sectionId),
      description: String(record.description ?? ''),
      position: Number(record.position ?? 0),
      isActive: record.isActive !== false,
    }),
    [],
  );

  const emptyValues = useCallback(
    (): EditorValues => ({
      id: NEW_RECORD_ID,
      code: '',
      name: '',
      elementName: '',
      // Новый инфоблок заводится в открытом типе; сменить его можно тут же
      sectionId: sectionId === null ? null : String(sectionId),
      description: '',
      position: nextBlockPosition(sections, sectionId),
      isActive: true,
    }),
    [sectionId, sections],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const target = toNumericId(values.sectionId);
      if (target === null) return null;
      const block = await saveBlock(parseBlockRecordId(id), toBlockPayload(values, target));
      return block ? blockRecordId(block.id) : null;
    },
    [saveBlock],
  );

  const remove = useCallback(
    async (record: EditorRecord) => {
      const number = parseBlockRecordId(record.id);
      if (number === null) return false;
      return removeBlock(number);
    },
    [removeBlock],
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

  const fields = useMemo(() => blockFields(sections), [sections]);

  return {
    list: {
      title: 'Инфоблоки',
      addLabel: 'Добавить инфоблок',
      rows,
      columns: useMemo(blockColumns, []),
      isLoading: loading,
      isSaving: saving,
      error,
    },
    form: {
      fields,
      tabs: useMemo(blockTabs, []),
      valuesOf,
      emptyValues,
    },
    actions: {
      save,
      remove,
      rowAction: {
        icon: EditorRowActionIcon.Enter,
        title: (record) => `Записи инфоблока «${String(record.name ?? '')}»`,
        run: (record) => {
          const number = parseBlockRecordId(record.id);
          // Переходим в тот тип, которому запись принадлежит сейчас:
          // инфоблок могли перенести, не уходя с этой страницы
          const target = toNumericId(record.sectionId) ?? sectionId;
          if (number !== null && target !== null) openBlock(target, number);
        },
      },
    },
    history: {
      loadRecord: loadRecordHistory,
      loadJournal,
      // Журнал общий на весь раздел: типы и записи в нём тоже есть,
      // но строк для них в этой таблице нет — ссылку им не даём
      canOpenRecord: (entityId) => {
        const number = parseBlockRecordId(entityId);
        return number !== null && blocks.some((block) => block.id === number);
      },
      fieldLabels: INFOBLOCKS_HISTORY_LABELS,
    },
    // У инфоблоков каждого типа свои свойства
    settings: sectionId === null ? undefined : { key: ListKey.infoblocks(sectionId) },
  };
};

/** Значения формы → тело запроса. Пустая заметка — это null, а не "". */
function toBlockPayload(
  values: EditorValues,
  sectionId: number,
): CreateInfoblockDto | UpdateInfoblockDto {
  return {
    sectionId,
    code: text(values.code),
    name: text(values.name),
    description: text(values.description) || null,
    // Пустое значение бэкенд заменит своим «Элемент» — тем же, что здесь
    elementName: text(values.elementName) || DEFAULT_ELEMENT_NAME,
    isActive: values.isActive !== false,
    position: toPosition(values.position),
  };
}
