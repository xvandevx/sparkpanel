import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  applyFieldChange,
  collectWarnings,
  validateValues,
  valuesEqual,
  visibleGroups,
  type EditorFieldDef,
  type EditorFormValue,
  type EditorValues,
} from '../editorForm';
import type { RootState } from '../../redux';
import {
  EMPTY_EDITOR_SESSION,
  type EditorPendingAction,
} from '../../redux/reducers/contentEditorReducer';
import { ContentEditorController, EditorRow, EditorTabDef } from './types';
import { useEditorActions } from './useEditorActions';

export type { EditorViewMode } from '../../redux/reducers/contentEditorReducer';

/** Вкладка истории добавляется редактором, а не разделом: она у всех одинаковая. */
export const HISTORY_TAB_KEY = 'history';

/** Номер захода в редактор: новый на каждое монтирование, разным разделам не совпасть. */
let sessionCounter = 0;

/**
 * Состояние редактора: что открыто, что в форме, что изменено.
 *
 * Само состояние лежит в сторе (`state.contentEditor`) — там его видно в devtools
 * и оттуда его берёт этот хук. Здесь — только производные от него величины
 * (вкладки, предупреждения, «есть правки») и порядок действий. Данные и
 * сохранение — в контроллере раздела, он приходит пропсом в `<ContentEditor>`.
 */
export function useEditorState(
  controller: ContentEditorController,
  /**
   * Открытая запись из адреса страницы (`useRecordRoute`): у всех разделов одинаково.
   * Имя не `record` намеренно — строку таблицы ниже тоже зовут record, и она бы его перекрыла.
   */
  route: { selectedId: string | null; select: (id: string | null) => void },
  /**
   * Сохранение того, что хранится отдельно от записи (свойства списка), — уже
   * с ключом записи, который выдал раздел. Возвращает текст ошибки или null.
   */
  saveExtras?: (recordId: string, values: EditorValues) => Promise<string | null>,
) {
  const actions = useEditorActions();

  /** Этот заход в редактор: ref живёт ровно столько, сколько смонтирован редактор */
  const sessionId = useRef('');
  if (!sessionId.current) sessionId.current = `editor-${(sessionCounter += 1)}`;

  const slice = useSelector((state: RootState) => state.contentEditor);

  /**
   * Срез один на все разделы и переживает уход с экрана, а чистится эффектом —
   * то есть кадром позже. Пока он принадлежит прошлому заходу, работаем с пустым
   * состоянием: иначе новый раздел на первом кадре рисовал бы чужой журнал,
   * чужую шторку «Новая запись» и успевал бы отправить лишний запрос.
   */
  const stored = slice.sessionId === sessionId.current ? slice : EMPTY_EDITOR_SESSION;

  useEffect(() => {
    actions.startSession(sessionId.current);
  }, [actions]);

  const { isCreating, createParentId, viewMode, pending } = stored;

  const rows = controller.list.rows;
  const flatRecords = useMemo(() => flattenRows(rows), [rows]);

  const selectedRecord = useMemo(
    () => flatRecords.find((record) => record.id === route.selectedId) ?? null,
    [flatRecords, route.selectedId],
  );

  /**
   * Ключ формы: пока он не меняется, введённое в форме остаётся на месте.
   * Меняется — форма перечитывается из записи (или готовится под новую).
   */
  const formKey = isCreating ? `new:${createParentId ?? ''}` : selectedRecord?.id ?? '';

  const { emptyValues, valuesOf } = controller.form;

  const readValues = useCallback((): EditorValues => {
    if (!formKey) return {};
    return isCreating ? emptyValues(createParentId) : valuesOf(selectedRecord as EditorRow);
  }, [createParentId, emptyValues, formKey, isCreating, selectedRecord, valuesOf]);

  /**
   * Стор догоняет новый ключ эффектом, то есть на кадр позже. Этот кадр форму
   * показываем прочитанной напрямую из записи — иначе шторка моргала бы пустыми
   * полями при каждом открытии.
   */
  const isStale = stored.formKey !== formKey;
  const values = isStale ? readValues() : stored.values;
  const initialValues = isStale ? values : stored.initialValues;

  useEffect(() => {
    if (!isStale) return;
    actions.readForm(formKey, readValues());
  }, [actions, formKey, isStale, readValues]);

  /**
   * Последнее состояние формы для обработчиков. Нужен именно ref: два поля,
   * изменённые в одном такте (каскад или быстрый ввод), иначе затёрли бы
   * друг друга — до перерисовки стор ещё отдаёт прежние значения.
   */
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const isOpen = isCreating || selectedRecord !== null;
  const isChanged = isOpen && !valuesEqual(values, initialValues);

  const fieldByKey = useMemo(() => {
    const map = new Map<string, EditorFieldDef>();
    for (const field of controller.form.fields) map.set(field.key, field);
    return map;
  }, [controller.form.fields]);

  const setFieldValue = useCallback(
    (key: string, value: unknown) => {
      const field = fieldByKey.get(key);
      if (!field) return;
      const next = applyFieldChange(field, value, valuesRef.current);
      valuesRef.current = next;
      actions.changeValues(next);
    },
    [actions, fieldByKey],
  );

  /** Всё, что нужно компонентам формы для отрисовки. */
  const form: EditorFormValue = useMemo(
    () => ({
      fields: controller.form.fields,
      groups: visibleGroups(
        controller.form.tabs.flatMap((tab) => tab.groups),
        controller.form.fields,
        values,
      ),
      values,
      setFieldValue,
    }),
    [controller.form.fields, controller.form.tabs, setFieldValue, values],
  );

  const warnings = useMemo(
    () => collectWarnings(controller.form.fields, values),
    [controller.form.fields, values],
  );

  /** Вкладки раздела плюс «История» — она есть, если раздел умеет её отдавать. */
  const tabs: EditorTabDef[] = useMemo(() => {
    const own = controller.form.tabs
      .map((tab) => ({ ...tab, groups: visibleGroups(tab.groups, controller.form.fields, values) }))
      .filter((tab) => tab.groups.length > 0);

    if (!controller.history?.loadRecord || isCreating || !selectedRecord) return own;
    return [...own, { key: HISTORY_TAB_KEY, label: 'История', groups: [] }];
  }, [
    controller.form.fields,
    controller.history?.loadRecord,
    controller.form.tabs,
    isCreating,
    selectedRecord,
    values,
  ]);

  const { select: onSelectedChange } = route;
  const { rowAction } = controller.actions;

  /** Открыть запись на редактирование; её идентификатор уходит в адрес страницы. */
  const openRecord = useCallback(
    (id: string) => {
      actions.endCreate();
      onSelectedChange(id);
    },
    [actions, onSelectedChange],
  );

  /**
   * Новая запись. Идентификатора у неё ещё нет, поэтому адрес страницы не меняется —
   * он получит id только после сохранения.
   */
  const beginCreate = useCallback(
    (parentId: string | null) => {
      actions.startCreate(parentId);
      onSelectedChange(null);
    },
    [actions, onSelectedChange],
  );

  const closeEditor = useCallback(() => {
    actions.endCreate();
    onSelectedChange(null);
  }, [actions, onSelectedChange]);

  /**
   * Переход внутрь записи. Идёт через ту же очередь, что открытие и создание:
   * уход с экрана — тоже переключение, и несохранённые правки он терять не должен.
   */
  const openInside = useCallback(
    (record: EditorRow) => {
      actions.endCreate();
      rowAction?.run(record);
    },
    [actions, rowAction],
  );

  /** Выполнить отложенное действие. Строка ищется по ключу: в сторе лежит он. */
  const runPending = useCallback(
    (action: EditorPendingAction) => {
      if (action.type === 'select') {
        openRecord(action.id);
        return;
      }
      if (action.type === 'create') {
        beginCreate(action.parentId);
        return;
      }
      if (action.type === 'rowAction') {
        const record = flatRecords.find((row) => row.id === action.recordId);
        if (record) openInside(record);
        return;
      }
      closeEditor();
    },
    [beginCreate, closeEditor, flatRecords, openInside, openRecord],
  );

  /** Любое переключение с несохранёнными правками сначала спрашивает подтверждение. */
  const request = useCallback(
    (action: EditorPendingAction) => {
      if (isChanged) {
        actions.askDiscard(action);
        return;
      }
      runPending(action);
    },
    [actions, isChanged, runPending],
  );

  const requestSelect = useCallback(
    (id: string | null) => request(id === null ? { type: 'close' } : { type: 'select', id }),
    [request],
  );

  const requestCreate = useCallback(
    (parentId: string | null) => request({ type: 'create', parentId }),
    [request],
  );

  const requestClose = useCallback(() => request({ type: 'close' }), [request]);

  const requestRowAction = useCallback(
    (record: EditorRow) => request({ type: 'rowAction', recordId: record.id }),
    [request],
  );

  const discardChanges = useCallback(() => {
    const action = pending ?? { type: 'close' as const };
    actions.cancelDiscard();
    runPending(action);
  }, [actions, pending, runPending]);

  const keepEditing = useCallback(() => actions.cancelDiscard(), [actions]);

  /** «Отменить»: вернуть форму к тому, что было при открытии записи. */
  const resetChanges = useCallback(() => {
    if (isCreating) {
      closeEditor();
      return;
    }
    actions.resetForm();
  }, [actions, closeEditor, isCreating]);

  const { save } = controller.actions;

  /**
   * Сохранение. Возвращает текст ошибки или null: сообщение показывает компонент,
   * логика ничего не рисует.
   */
  const submit = useCallback(async (): Promise<string | null> => {
    const invalid = validateValues(controller.form.fields, values);
    if (invalid) return invalid;

    const savedId = await save({ id: isCreating ? null : selectedRecord?.id ?? null, values });
    if (!savedId) return controller.list.error ?? 'Не удалось сохранить';

    // Запись уже сохранена — даже если свойства не прошли, повторное «Сохранить»
    // не должно создать её второй раз. Поэтому новая запись открывается в любом случае.
    const extrasError = saveExtras ? await saveExtras(savedId, values) : null;

    if (isCreating) {
      // Запись создана: адрес страницы получает её идентификатор, форма
      // перечитается из сохранённой записи по смене ключа формы.
      actions.endCreate();
      onSelectedChange(savedId);
    } else if (!extrasError) {
      // Свойства не сохранились — форма остаётся изменённой, их можно отправить ещё раз
      actions.commitForm(values);
    }

    return extrasError ? `Запись сохранена, а свойства — нет: ${extrasError}` : null;
  }, [
    actions,
    controller.list.error,
    controller.form.fields,
    isCreating,
    onSelectedChange,
    save,
    saveExtras,
    selectedRecord,
    values,
  ]);

  return {
    /** Таблица */
    rows,
    viewMode,
    setViewMode: actions.setViewMode,

    /** Что открыто */
    isOpen,
    isCreating,
    selectedRecord,
    createParentId,

    /** Форма: значения для компонентов полей отдаёт EditorFormProvider */
    form,
    values,
    isChanged,
    tabs,
    warnings,

    /** Действия */
    openRecord: requestSelect,
    startCreate: requestCreate,
    runRowAction: requestRowAction,
    closeEditor: requestClose,
    resetChanges,
    submit,

    /** Подтверждение отказа от правок */
    confirmDiscard: pending !== null,
    discardChanges,
    keepEditing,
  };
}

/** Дерево строк в плоский список — чтобы найти запись по идентификатору из адреса. */
export function flattenRows(rows: EditorRow[]): EditorRow[] {
  const result: EditorRow[] = [];
  const walk = (list: EditorRow[]) => {
    for (const row of list) {
      result.push(row);
      if (row.children?.length) walk(row.children);
    }
  };
  walk(rows);
  return result;
}

/** Ключи строк, у которых есть вложенные: только их таблица умеет раскрывать. */
export function expandableRowKeys(rows: EditorRow[]): string[] {
  return flattenRows(rows)
    .filter((row) => Boolean(row.children?.length))
    .map((row) => row.id);
}
