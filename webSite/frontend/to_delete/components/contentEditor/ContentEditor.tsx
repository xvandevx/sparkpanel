import { useCallback, useMemo } from 'react';
import { Alert } from 'antd';
import { EditorFormProvider } from '../../logic/editorForm';
import {
  defaultColumns,
  emptyRecordValues,
  fieldLabels,
  listHistory,
  recordPayload,
  recordValues,
  standardFields,
  standardTab,
  useEditorState,
  useListData,
  useListProperties,
  useRecordRoute,
  type ContentEditorController,
  type EditorActionsDef,
  type EditorApi,
  type EditorColumnDef,
  type EditorFormDef,
  type EditorHistoryDef,
  type EditorListSettingsDef,
  type EditorRecord,
  type EditorRow,
  type EditorValues,
} from '../../logic/contentEditor';
import styles from './contentEditor.module.scss';
import { ContentEditorDrawer, UnsavedChangesModal } from './drawer';
import { EditorHeader } from './header';
import { HistoryJournal } from './history';
import { ContentEditorTable } from './table';

/**
 * Универсальный редактор контента: таблица записей плюс шторка редактирования.
 * О разделе, в котором работает, ничего не знает.
 *
 * Раздел отдаёт **Api** (где лежат записи) и **описание** (как они выглядят).
 * Всё остальное редактор делает сам:
 *
 * - **данные** — `useListData`: загрузка при первом показе, общий срез
 *   `state.lists`, перечитывание после записи;
 * - **значения карточки** — `recordValues` по описанию полей; раздел пишет свои
 *   только там, где значение не лежит в записи (`form.derive`);
 * - **состояние** (что открыто, что набрано, что изменено) — `state.contentEditor`;
 * - **открытая запись** — из адреса страницы (`useRecordRoute`), одинаково у всех.
 *
 * Свойства из настроек списка `useListProperties` подмешивает к полям раздела заранее,
 * поэтому дальше ни таблица, ни шторка о свойствах не знают ничего.
 */
export default function ContentEditor<T>({
  api,
  isNested = false,
  isReadOnly = false,
  labels: ownLabels,
  columns: ownColumns,
  form = {},
  actions,
  history,
  settings,
}: {
  /** Где лежат записи: загрузка, запись, удаление, история */
  api: EditorApi<T>;
  /**
   * Записи вкладываются друг в друга. Свойство раздела целиком, а не таблицы:
   * от него зависят и дерево строк, и адрес записи, и «добавить внутрь»
   * в строке, и текст подтверждения удаления.
   */
  isNested?: boolean;
  /**
   * Раздел открыт только на просмотр: кнопок «добавить» и «сохранить» нет.
   * Права раздел решает сам (в «Пользователях» правит только root) — редактор
   * лишь убирает то, чем всё равно нельзя воспользоваться.
   */
  isReadOnly?: boolean;
  /**
   * Подписи полей раздела: ключ поля → название. Нужны истории изменений,
   * где поле видно без карточки. Стандартные (название, код, адрес, порядок,
   * активность) редактор знает сам — здесь только свои и то, что названо иначе.
   */
  labels?: Record<string, string>;
  /**
   * Свои колонки таблицы. Не заданы — редактор возьмёт стандартные: название,
   * код, адрес (у вложенного списка), сортировка и активность.
   */
  columns?: EditorColumnDef[];
  /** Своё в карточке записи: поля и вкладки сверх стандартных. Не задано — только стандартные */
  form?: EditorFormDef<T>;
  /** Что ещё можно сделать со строкой; не задано — только правка и удаление */
  actions?: EditorActionsDef;
  /**
   * Правила журнала: какие его записи открываются на этом экране. Сам журнал
   * редактор читает по ключу списка — раздел его не отдаёт.
   */
  history?: EditorHistoryDef;
  /** Настройки списка; не заданы — кнопки «Настройки» и свойств записи нет */
  settings?: EditorListSettingsDef;
}) {
  const route = useRecordRoute();
  // Журнал изменений — отдельная сущность, одна на всю панель: раздел о нём
  // не рассказывает ничего, редактор читает историю по ключу своего списка
  const journal = useMemo(() => listHistory(api.key), [api.key]);
  const data = useListData(api, isNested);

  const items = data.items as T[];

  const rows = data.rows;

  // Описание полей раздел может считать по самим записям: у страницы
  // в «Родителе» перечислены остальные страницы
  const ownFields = useMemo(
    () => (typeof form.fields === 'function' ? form.fields(items) : form.fields ?? []),
    [form.fields, items],
  );

  const labels = useMemo(() => fieldLabels(ownLabels), [ownLabels]);

  /**
   * Стандартные поля записи редактор добавляет сам: они одинаковы у любого
   * списка, и раздел описывает только то, чем отличается.
   */
  const fields = useMemo(
    () => [
      ...standardFields({ isNested, rows, selectedId: route.selectedId, labels }),
      ...ownFields,
    ],
    [isNested, labels, ownFields, route.selectedId, rows],
  );

  const tabs = useMemo(
    () => [standardTab(fields), ...(form.tabs ?? [])],
    [fields, form.tabs],
  );

  /** Колонки раздел может не описывать: стандартные поля редактор знает сам. */
  const columns = useMemo(
    () => ownColumns ?? defaultColumns(fields, isNested, labels),
    [fields, isNested, labels, ownColumns],
  );

  const { derive, deriveNew } = form;

  /** Значения карточки: по описанию полей, плюс то, что раздел считает сам. */
  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      ...recordValues(fields, record),
      ...(derive?.(record, items) ?? {}),
    }),
    [derive, fields, items],
  );

  const emptyValues = useCallback(
    (parentId: string | null): EditorValues => ({
      ...emptyRecordValues(fields, rows, parentId),
      ...(deriveNew?.(parentId, items) ?? {}),
    }),
    [deriveNew, fields, items, rows],
  );

  const save = useCallback(
    ({ id, values }: { id: string | null; values: EditorValues }) =>
      data.save(id, recordPayload(fields, values)),
    [data, fields],
  );

  const removeRecord = useCallback(
    (record: EditorRow) => data.remove?.(record.id) ?? Promise.resolve(false),
    [data],
  );

  const controller = useMemo<ContentEditorController>(
    () => ({
      list: {
        title: labels.title,
        addLabel: labels.add,
        columns,
        rows,
        isReadOnly,
        isNested: isNested,
        isLoading: data.isLoading,
        isSaving: data.isSaving,
        error: data.error,
      },
      form: { ...form, fields, tabs, valuesOf, emptyValues },
      actions: { ...actions, save, remove: data.remove ? removeRecord : undefined },
      history: { ...history, ...journal },
      labels,
      listKey: api.key,
      settings,
    }),
    [
      actions,
      api.key,
      columns,
      data,
      emptyValues,
      fields,
      form,
      history,
      journal,
      labels,
      isNested,
      isReadOnly,
      ownColumns,
      removeRecord,
      rows,
      save,
      settings,
      tabs,
      valuesOf,
    ],
  );

  const {
    controller: merged,
    listSettings,
    saveProperties,
  } = useListProperties(controller, route.selectedId);
  const editor = useEditorState(merged, route, saveProperties);

  const selectedId = editor.selectedRecord?.id ?? null;
  const recordLabels = merged.labels;

  return (
    // Значения полей общий слой формы раздаёт сам: поля лежат глубоко внутри вкладок
    <EditorFormProvider value={editor.form}>
      <div className={styles.screen}>
        <EditorHeader
          title={merged.list.title}
          addLabel={merged.list.addLabel}
          hasJournal={Boolean(merged.history?.loadJournal)}
          canCreate={!merged.list.isReadOnly}
          listSettings={listSettings}
          viewMode={editor.viewMode}
          onViewMode={editor.setViewMode}
          onCreate={editor.startCreate}
        />

        {merged.list.error && <Alert type="error" showIcon title={merged.list.error} />}

        {editor.viewMode === 'list' ? (
          <ContentEditorTable
            rows={editor.rows}
            columns={merged.list.columns}
            isLoading={merged.list.isLoading}
            selectedId={selectedId}
            onOpen={editor.openRecord}
            actions={{
              isNested: merged.list.isNested,
              isRemoveKeepingChildren: merged.list.isRemoveKeepingChildren,
              rowAction: merged.actions.rowAction,
              error: merged.list.error,
              remove: merged.actions.remove,
              canRemove: merged.actions.canRemove,
              onOpen: editor.openRecord,
              onCreateChild: editor.startCreate,
              onRowAction: editor.runRowAction,
            }}
          />
        ) : (
          <HistoryJournal
            load={merged.history?.loadJournal}
            fieldLabels={recordLabels}
            onOpenRecord={editor.openRecord}
            canOpenRecord={merged.history?.canOpenRecord}
          />
        )}

        <ContentEditorDrawer
          open={editor.isOpen}
          title={
            editor.isCreating
              ? 'Новая запись'
              : String(editor.selectedRecord?.name ?? 'Редактирование')
          }
          isCreating={editor.isCreating}
          isChanged={editor.isChanged}
          isSaving={merged.list.isSaving}
          isReadOnly={merged.list.isReadOnly}
          tabs={editor.tabs}
          warnings={editor.warnings}
          history={{ recordId: selectedId, load: merged.history?.loadRecord, fieldLabels: recordLabels }}
          onClose={editor.closeEditor}
          onReset={editor.resetChanges}
          onSubmit={editor.submit}
        />

        <UnsavedChangesModal
          open={editor.confirmDiscard}
          onDiscard={editor.discardChanges}
          onKeep={editor.keepEditing}
        />
      </div>
    </EditorFormProvider>
  );
}
