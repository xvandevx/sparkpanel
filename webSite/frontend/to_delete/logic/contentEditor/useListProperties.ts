import { useCallback, useMemo } from 'react';
import { EditorFieldType, type EditorFieldDef, type EditorValues } from '../editorForm';
import {
  ListPropertyType,
  PROPERTIES_GROUP_KEY,
  nestRows,
  parentChoices,
  RECORD_META_KEY,
  RECORD_META_TAB_KEY,
  propertiesGroups,
  propertyFields,
  propertyFormValues,
  propertyHistoryLabels,
  propertyPayload,
  recordMetaFields,
  recordMetaFormValues,
  recordMetaGroups,
  recordMetaHistoryLabels,
  recordMetaPayload,
  useListSettings,
  useListSettingsActions,
  useLoadListSettings,
  usePropertyHtmlBlocks,
  usePropertyLinkTargets,
  type ListSettingsTarget,
} from '../listSettings';
import type { ListSettingsDto } from '../../src/api/client';
import { CODE_FIELD, applyCodePolicy } from './codePolicy';
import type { ContentEditorController, EditorRecord, EditorRow, EditorTabDef } from './types';
import { flattenRows } from './useEditorState';

const NO_ROWS: EditorRow[] = [];
const NO_TABS: ListSettingsDto['tabs'] = [];

/** Ключ вкладки свойств в шторке. */
export const PROPERTIES_TAB_KEY = PROPERTIES_GROUP_KEY;

/** Поле «Родитель» у записей древовидного списка и служебный ключ самой записи. */
const PARENT_KEY = 'tree.parentId';
const SELF_KEY = 'tree.recordId';

/** Что редактор знает о настройках своего списка: окно настроек открывается по этому. */
export interface EditorListSettings extends ListSettingsTarget {
  /** Раздел открыт только на просмотр — настраивать его тоже нечем */
  editable: boolean;
}

/** Подпись записи в поле «Родитель»: название, а без него — ключ. */
const rowLabel = (row: { id: string; [key: string]: unknown }): string =>
  String(row.name ?? '') || row.id;

/**
 * Свойства записей и дерево поверх контроллера раздела. Раздел называет только
 * ключ своего списка (`settings.key`), а сюда подмешиваются поля свойств, вкладка
 * «Свойства», их значения в форме и подписи в истории. Заголовок списка — имя из
 * настроек, если его задали.
 *
 * С настройкой «Древовидная структура» плоский список становится деревом: строки
 * вкладываются по родителям из настроек, в строках есть «добавить внутрь», в
 * карточке — «Родитель». У раздела со своей вложенностью дерево не включается.
 *
 * Значения свойств и родитель хранятся отдельно от записи, поэтому сохраняются
 * вторым запросом — после того как раздел сохранил запись и выдал её ключ.
 */
export function useListProperties(
  controller: ContentEditorController,
  /** Какая запись открыта; null — новая. Нужно политике символьного кода */
  selectedId: string | null,
) {
  // Ключ списка — он же ключ Api раздела: настройки, свойства записей и сами
  // записи адресуются одним и тем же ключом
  const listKey = controller.listKey;
  const applies = controller.settings?.appliesTo;
  const ownNesting = Boolean(controller.list.isNested);

  useLoadListSettings(listKey);
  const {
    settings,
    properties,
    values: stored,
    parents,
    isReady,
    error,
    valuesSaving,
  } = useListSettings(listKey);
  const { saveValues, removeValues } = useListSettingsActions();

  const htmlBlocks = usePropertyHtmlBlocks(
    properties.some(
      (property) =>
        property.type === ListPropertyType.HtmlBlocks || property.type === ListPropertyType.Html,
    ),
  );
  const linkTargets = usePropertyLinkTargets(
    properties.some((property) => property.type === ListPropertyType.ContentLink),
    listKey,
  );

  const hasProperties = properties.length > 0;
  const isTree = settings?.isTree === true && !ownNesting;
  /** Мета записи: отдельная вкладка с H1 / Title / Description у каждой записи */
  const useRecordMeta = settings?.useRecordMeta === true;
  const settingsTabs = settings?.tabs ?? NO_TABS;

  const rows = useMemo(
    () => (isTree ? nestRows(controller.list.rows, parents) : controller.list.rows),
    [controller.list.rows, isTree, parents],
  );

  const parentField = useMemo<EditorFieldDef>(
    () => ({
      key: PARENT_KEY,
      label: 'Родитель',
      type: EditorFieldType.Select,
      nullable: true,
      placeholder: 'В корне списка',
      note: 'Запись появится внутри выбранной',
      options: (values) => parentChoices(rows, (values[SELF_KEY] as string | null) ?? null, rowLabel),
    }),
    [rows],
  );

  /**
   * Коды остальных записей списка: по ним проверяется уникальность и по ним же
   * подбирается код из названия, чтобы второй «Акции» не получил тот же `akcii`.
   */
  const otherCodes = useCallback(
    (values: EditorValues): string[] => {
      const self = String(values.id ?? '');
      return flattenRows(rows)
        .filter((row) => row.id !== self)
        // В «Веб-формах» в таблице две сущности: строки-поля несут свои коды,
        // и сверять с ними код формы нельзя. Кто в списке «свой» — знает раздел
        .filter((row) => !applies || applies(row as EditorValues))
        .map((row) => String(row.code ?? '').trim())
        .filter(Boolean);
    },
    [applies, rows],
  );

  /** Политика символьного кода записей — из настроек списка. */
  const codePolicy = useMemo(
    () => ({
      useCode: settings?.useCode !== false,
      required: settings?.codeRequired === true,
      unique: settings?.codeUnique === true,
      // Запись ещё не сохранена: в адресе страницы её нет
      isNew: selectedId === null,
    }),
    [selectedId, settings?.codeRequired, settings?.codeUnique, settings?.useCode],
  );

  const fields = useMemo(() => {
    const own = hasProperties
      ? propertyFields(properties, {
          htmlBlockChoices: htmlBlocks.choices,
          htmlBlocks: htmlBlocks.blocks,
          linkTargets,
          applies,
        })
      : [];
    return [
      ...applyCodePolicy(controller.form.fields, codePolicy, otherCodes),
      ...(isTree ? [parentField] : []),
      ...own,
      ...(useRecordMeta ? recordMetaFields() : []),
    ];
  }, [
    applies,
    codePolicy,
    controller.form.fields,
    hasProperties,
    htmlBlocks,
    isTree,
    linkTargets,
    otherCodes,
    parentField,
    properties,
    useRecordMeta,
  ]);

  const tabs = useMemo<EditorTabDef[]>(() => {
    // «Родитель» — первым полем первой вкладки, как «Родительская страница» у страниц
    const base = isTree
      ? controller.form.tabs.map((tab, index) =>
          index === 0
            ? { ...tab, groups: [{ key: 'tree', fields: [PARENT_KEY] }, ...tab.groups] }
            : tab,
        )
      : controller.form.tabs;
    const own: EditorTabDef[] = [];

    // Свойства без вкладки — на общей «Свойства», она идёт первой
    const plain = properties.filter((property) => !property.tab);
    if (plain.length > 0) {
      own.push({ key: PROPERTIES_TAB_KEY, label: 'Свойства', groups: propertiesGroups(plain) });
    }

    // Вкладки из настроек — в их порядке; пустую вкладку не показываем
    for (const tab of settingsTabs) {
      const onTab = properties.filter((property) => property.tab === tab.code);
      if (onTab.length === 0) continue;
      own.push({
        key: `tab-${tab.code}`,
        label: tab.name,
        groups: propertiesGroups(onTab, tab.code),
      });
    }

    if (useRecordMeta) {
      own.push({ key: RECORD_META_TAB_KEY, label: 'Мета', groups: recordMetaGroups() });
    }

    return [...base, ...own];
  }, [controller.form.tabs, isTree, properties, settingsTabs, useRecordMeta]);

  const { valuesOf: ownValuesOf, emptyValues: ownEmptyValues } = controller.form;
  const ownRemove = controller.actions.remove;

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      ...ownValuesOf(record),
      ...propertyFormValues(properties, stored[record.id]),
      ...(useRecordMeta ? recordMetaFormValues(stored[record.id]?.[RECORD_META_KEY]) : {}),
      ...(isTree ? { [PARENT_KEY]: parents[record.id] ?? null, [SELF_KEY]: record.id } : {}),
    }),
    [isTree, ownValuesOf, parents, properties, stored, useRecordMeta],
  );

  const emptyValues = useCallback(
    (parentId: string | null): EditorValues => ({
      ...ownEmptyValues(parentId),
      ...propertyFormValues(properties, undefined),
      ...(useRecordMeta ? recordMetaFormValues(undefined) : {}),
      // «Добавить внутрь» у дерева — это уже выбранный родитель
      ...(isTree ? { [PARENT_KEY]: parentId, [SELF_KEY]: null } : {}),
    }),
    [isTree, ownEmptyValues, properties, useRecordMeta],
  );

  /**
   * Удаление уносит и значения свойств. У раздела со своей вложенностью (страница
   * уходит с дочерними) — значения всей ветки; у дерева из настроек — только самой
   * записи: вложенные раздел не удалял, сервер поднимет их на уровень выше.
   */
  const remove = useCallback(
    async (record: EditorRow): Promise<boolean> => {
      if (!ownRemove) return false;
      const removed = await ownRemove(record);
      if (removed && listKey) {
        const ids = isTree
          ? [record.id]
          : [record, ...flattenRows(record.children ?? [])]
              .map((row) => row.id)
              .filter((id) => stored[id]);
        removeValues(listKey, ids);
      }
      return removed;
    },
    [isTree, listKey, ownRemove, removeValues, stored],
  );

  const labels = useMemo(
    () => ({
      ...controller.labels,
      ...(hasProperties ? propertyHistoryLabels(properties) : {}),
      ...(useRecordMeta ? recordMetaHistoryLabels() : {}),
      ...(isTree ? { [PARENT_KEY]: 'Родитель' } : {}),
    }),
    [controller.labels, hasProperties, isTree, properties, useRecordMeta],
  );

  /** Кода нет — нет и колонки с ним: в таблице осталась бы пустая полоса. */
  const columns = useMemo(
    () =>
      codePolicy.useCode
        ? controller.list.columns
        : controller.list.columns.filter((column) => column.key !== CODE_FIELD),
    [codePolicy.useCode, controller.list.columns],
  );

  const editorController: ContentEditorController = {
    ...controller,
    list: {
      ...controller.list,
      title: settings?.name || controller.list.title,
      columns,
      // Пока свойства не пришли, записи не показываем: открытая по адресу запись
      // прочиталась бы без них, и сохранение стёрло бы её значения
      rows: isReady ? rows : NO_ROWS,
      isLoading: controller.list.isLoading || !isReady,
      isSaving: controller.list.isSaving || valuesSaving,
      error: controller.list.error ?? error,
      isNested: ownNesting || isTree,
      isRemoveKeepingChildren: isTree || undefined,
    },
    form: { ...controller.form, fields, tabs, valuesOf, emptyValues },
    // Правки пишутся в журнал не у всех списков (у медиатеки его нет) — тогда
    // в карточке нет вкладки «История», а на экране переключателя журнала
    history: settings?.hasJournal ? controller.history : undefined,
    actions: { ...controller.actions, remove: ownRemove ? remove : undefined },
    labels,
  };

  /**
   * Сохранить свойства и место в дереве — после того как раздел сохранил запись.
   * Возвращает текст ошибки или null; записи без свойств и дерева сюда не доходят.
   */
  const saveProperties = useCallback(
    async (recordId: string, values: EditorValues): Promise<string | null> => {
      if (!listKey) return null;
      const withProperties = hasProperties && (!applies || applies(values));
      if (!withProperties && !isTree && !useRecordMeta) return null;
      return saveValues(
        listKey,
        recordId,
        {
          ...(withProperties ? propertyPayload(properties, values) : {}),
          ...(useRecordMeta ? { [RECORD_META_KEY]: recordMetaPayload(values) } : {}),
        },
        isTree ? ((values[PARENT_KEY] as string | null) ?? null) : null,
      );
    },
    [applies, hasProperties, isTree, listKey, properties, saveValues, useRecordMeta],
  );

  const listSettings: EditorListSettings | null = useMemo(
    () =>
      listKey
        ? { listKey, fallbackName: controller.list.title, editable: !controller.list.isReadOnly, ownNesting }
        : null,
    [controller.list.isReadOnly, controller.list.title, listKey, ownNesting],
  );

  return { controller: editorController, saveProperties, listSettings };
}
