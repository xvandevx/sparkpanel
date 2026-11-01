import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadDomainHistoryThunk,
  loadDomainsJournalThunk,
} from '../../redux/action-creaters/domains';
import type { CreateDomainDto, UpdateDomainDto } from '../../src/api/client';
import {
  toEditorHistoryPage,
  toEditorHistoryRecord,
  type ContentEditorController,
  type EditorRecord,
  type EditorRow,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import {
  DOMAIN_HISTORY_LABELS,
  domainColumns,
  domainFields,
  domainTabs,
  normalizeHost,
  toPosition,
} from './domainsFields';
import { useDomainsActions } from './useDomainsActions';

/**
 * Домены сайта для универсального редактора: данные из стора, описание полей,
 * сохранение и удаление. Редактор сам о доменах ничего не знает.
 *
 * Список плоский: поддомен — такая же запись, как основной домен, и отличается
 * только флагом `isMain`, поэтому `supportsNesting` не задаём.
 */
export const useDomainsController = (): ContentEditorController => {
  const { items, loading, saving, error } = useSelector((state: RootState) => state.domains);
  const { save: saveDomain, remove: removeDomain } = useDomainsActions();
  const dispatch = useDispatch<AppDispatch>();

  // Записи уже приходят в нужном порядке; редактору нужен только id строкой
  const rows = useMemo(() => items.map((item) => ({ ...item, id: String(item.id) })), [items]);

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      host: String(record.host ?? ''),
      isMain: record.isMain === true,
      // Поле только для чтения: в форме показываем словом, а не «да/нет»
      isMainLabel: record.isMain === true ? 'Основной домен' : 'Поддомен',
      note: String(record.note ?? ''),
      position: Number(record.position ?? 0),
      isActive: record.isActive !== false,
    }),
    [],
  );

  const emptyValues = useCallback(
    (): EditorValues => ({
      id: NEW_RECORD_ID,
      host: '',
      isMain: false,
      isMainLabel: 'Поддомен',
      note: '',
      position: nextPosition(items.map((item) => item.position)),
      isActive: true,
    }),
    [items],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const domain = await saveDomain(toDomainId(id), toDomainPayload(values));
      return domain ? String(domain.id) : null;
    },
    [saveDomain],
  );

  const remove = useCallback(
    async (record: EditorRow) => removeDomain(Number(record.id)),
    [removeDomain],
  );

  /** Основной домен — главное имя сайта: он заводится системой и не удаляется. */
  const canRemove = useCallback((record: EditorRow) => record.isMain !== true, []);

  const loadRecordHistory = useCallback(
    async (id: string) =>
      (await dispatch(loadDomainHistoryThunk(Number(id)))).map(toEditorHistoryRecord),
    [dispatch],
  );

  const loadJournal = useCallback(
    async (limit: number, offset: number) =>
      toEditorHistoryPage(await dispatch(loadDomainsJournalThunk(limit, offset))),
    [dispatch],
  );

  return {
    list: {
      title: 'Домены сайта',
      addLabel: 'Добавить домен',
      rows,
      columns: useMemo(domainColumns, []),
      isLoading: loading,
      isSaving: saving,
      error,
    },
    form: {
      fields: useMemo(domainFields, []),
      tabs: useMemo(domainTabs, []),
      emptyValues,
      valuesOf,
    },
    actions: {
      save,
      remove,
      canRemove,
    },
    history: {
      loadRecord: loadRecordHistory,
      loadJournal,
      fieldLabels: DOMAIN_HISTORY_LABELS,
    },
    settings: { key: ListKey.domains },
  };
};

/** Идентификатор в форме нового домена: настоящий выдаст бэкенд при сохранении. */
const NEW_RECORD_ID = 'будет присвоен при сохранении';

/** Шаг сортировки: между соседями остаётся место, чтобы вставить домен вручную. */
const POSITION_STEP = 100;

/** Следующий по списку порядок — тот же шаг, что и у бэкенда при создании без position. */
const nextPosition = (positions: number[]): number =>
  (positions.length ? Math.max(...positions) : 0) + POSITION_STEP;

/** У новой записи идентификатора ещё нет: в адресе страницы он появится после сохранения. */
const toDomainId = (id: string | null): number | null => {
  const value = Number(id);
  return id && Number.isFinite(value) ? value : null;
};

const text = (value: unknown): string => String(value ?? '').trim();

/**
 * Значения формы → тело запроса. Пустое примечание — это null, а не "".
 * `isMain` не отправляем: основной домен назначает система.
 */
function toDomainPayload(values: EditorValues): CreateDomainDto | UpdateDomainDto {
  return {
    host: normalizeHost(values.host),
    note: text(values.note) || null,
    isActive: values.isActive !== false,
    position: toPosition(values.position),
  };
}
