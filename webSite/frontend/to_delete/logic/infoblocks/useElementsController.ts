import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadInfoblockHistoryThunk,
  loadInfoblocksJournalThunk,
} from '../../redux/action-creaters/infoblocks';
import type {
  CreateInfoblockElementDto,
  UpdateInfoblockElementDto,
} from '../../src/api/client';
import {
  toEditorHistoryPage,
  toEditorHistoryRecord,
  type ContentEditorController,
  type EditorRecord,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import { useHtmlBlockOptions } from '../content';
import { elementColumns, elementFields, elementTabs } from './elementFields';
import {
  DEFAULT_ELEMENT_NAME,
  NEW_RECORD_ID,
  elementRecordId,
  findBlock,
  nextElementPosition,
  parseElementRecordId,
  text,
  toPosition,
} from './infoblockIds';
import { INFOBLOCKS_HISTORY_LABELS } from './historyLabels';
import { useInfoblocksActions } from './useInfoblocksActions';
import { useInfoblocksRoute } from './useInfoblocksRoute';

/**
 * Записи одного инфоблока — третий экран (`/admin/infoblocks/2/3`). Список
 * плоский: вложенности у записей нет, поэтому `supportsNesting` не задаём.
 */
export const useElementsController = (): ContentEditorController => {
  const { sections, elements, elementsBlockId, loadingElements, saving, elementsError } =
    useSelector((state: RootState) => state.infoblocks);
  const { saveElement, removeElement } = useInfoblocksActions();
  const { blockId } = useInfoblocksRoute();
  const dispatch = useDispatch<AppDispatch>();
  // Блоки для подключения в анонс и текст; грузит их экран (`useLoadHtmlBlocks`)
  const htmlBlocks = useHtmlBlockOptions();

  const block = useMemo(() => findBlock(sections, blockId), [sections, blockId]);

  /**
   * Записи показываем, только пока в сторе лежат записи именно этого инфоблока.
   * Запрос за новыми уходит из эффекта, то есть уже после отрисовки: без этой
   * проверки под заголовком нового списка успевал мелькнуть предыдущий.
   */
  const isOwnElements = elementsBlockId === blockId;

  /** Ключ строки — тот же, что у записи в журнале: ссылки из него работают без перевода. */
  const rows = useMemo(
    () =>
      isOwnElements ? elements.map((item) => ({ ...item, id: elementRecordId(item.id) })) : [],
    [elements, isOwnElements],
  );

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      code: String(record.code ?? ''),
      name: String(record.name ?? ''),
      preview: String(record.preview ?? ''),
      content: String(record.content ?? ''),
      image: String(record.image ?? ''),
      date: String(record.date ?? ''),
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
      preview: '',
      content: '',
      image: '',
      date: '',
      // Порядок считаем только по своим записям — чужие сдвинули бы его мимо
      position: nextElementPosition(isOwnElements ? elements : []),
      isActive: true,
    }),
    [elements, isOwnElements],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      if (blockId === null) return null;
      const element = await saveElement(
        blockId,
        parseElementRecordId(id),
        toElementPayload(values),
      );
      return element ? elementRecordId(element.id) : null;
    },
    [blockId, saveElement],
  );

  const remove = useCallback(
    async (record: EditorRecord) => {
      const number = parseElementRecordId(record.id);
      if (blockId === null || number === null) return false;
      return removeElement(blockId, number);
    },
    [blockId, removeElement],
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

  const elementName = block?.elementName?.trim() || DEFAULT_ELEMENT_NAME;

  return {
    list: {
      title: block?.name ?? 'Записи',
      addLabel: 'Добавить запись',
      rows,
      columns: useMemo(elementColumns, []),
      // Пока записей этого инфоблока нет, экран ждёт их — но не тогда, когда
      // запрос уже провалился: иначе таблица осталась бы под индикатором навсегда
      isLoading: loadingElements || (!isOwnElements && elementsError === null),
      isSaving: saving,
      error: elementsError,
    },
    form: {
      // Список блоков меняется — описание полей пересобирается вместе с ним
      fields: useMemo(() => elementFields(htmlBlocks), [htmlBlocks]),
      tabs: useMemo(() => elementTabs(elementName), [elementName]),
      valuesOf,
      emptyValues,
    },
    actions: {
      save,
      remove,
    },
    history: {
      loadRecord: loadRecordHistory,
      loadJournal,
      // Журнал общий на весь раздел: типы и инфоблоки в нём тоже есть,
      // но строк для них на этом экране нет — ссылку им не даём
      canOpenRecord: (entityId) => {
        const number = parseElementRecordId(entityId);
        return number !== null && isOwnElements && elements.some((item) => item.id === number);
      },
      fieldLabels: INFOBLOCKS_HISTORY_LABELS,
    },
    // У записей каждого инфоблока свои свойства: у новости — одни, у товара — другие
    settings: blockId === null ? undefined : { key: ListKey.infoblockElements(blockId) },
  };
};

const toElementPayload = (
  values: EditorValues,
): CreateInfoblockElementDto | UpdateInfoblockElementDto => ({
  code: text(values.code),
  name: text(values.name),
  // Пустой анонс, текст, картинка и дата — это null, а не ""
  preview: text(values.preview) || null,
  content: text(values.content) || null,
  image: text(values.image) || null,
  date: text(values.date) || null,
  isActive: values.isActive !== false,
  position: toPosition(values.position),
});
