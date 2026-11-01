import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ListOptionDto } from '../../src/api/client';
import { useEditorFormState } from '../editorForm';
import {
  hasConfig,
  hasFileRules,
  hasLinkSource,
  hasOptions,
  hasResolution,
  hasTableConfig,
  supportsMultiple,
} from './propertyTypes';
import {
  DEFAULT_TAB_KEY,
  SETTINGS_GROUPS,
  draftsChanged,
  droppedValuesWarning,
  moveTabDraft,
  newDraft,
  newTabDraft,
  nextSort,
  patchDraft,
  setOption,
  sortedDrafts,
  settingsFields,
  tableHeaders,
  settingsFormValues,
  tabChoices,
  tabCodeFromName,
  tabsChanged,
  toDrafts,
  toSettingsPayload,
  toTabDrafts,
  validateDrafts,
  validateTabs,
  type PropertyDraft,
  type TabDraft,
} from './settingsForm';
import { useListSettings, useListSettingsActions } from './useListSettings';

/** Какой список настраивается: его ключ и заголовок экрана — имя по умолчанию. */
export interface ListSettingsTarget {
  listKey: string;
  fallbackName: string;
  /** У раздела своя вложенность (страницы, поля форм): древовидность ему не настраивают */
  ownNesting: boolean;
}

/**
 * Состояние окна настроек списка: имя и код — обычной формой, свойства —
 * списком черновиков. При каждом открытии окно перечитывается из сохранённого:
 * брошенные в прошлый раз правки не всплывают.
 */
export function useListSettingsForm(target: ListSettingsTarget, open: boolean) {
  const { listKey, fallbackName, ownNesting } = target;
  const { settings, saving } = useListSettings(listKey);
  const { saveSettings } = useListSettingsActions();
  const saved = useMemo(() => settings?.properties ?? [], [settings]);
  const savedTabs = useMemo(() => settings?.tabs ?? [], [settings]);

  const fields = useMemo(() => settingsFields(ownNesting), [ownNesting]);

  const form = useEditorFormState({
    fields,
    groups: SETTINGS_GROUPS,
    formKey: open ? `open:${listKey}` : '',
    read: () => settingsFormValues(settings, listKey, fallbackName, ownNesting),
  });

  const [drafts, setDrafts] = useState<PropertyDraft[]>([]);
  const [tabs, setTabs] = useState<TabDraft[]>([]);
  /** Какая вкладка открыта в окне: её свойства и показываются в таблице */
  const [activeTab, setActiveTab] = useState<string>(DEFAULT_TAB_KEY);

  useEffect(() => {
    if (!open) return;
    const tabDrafts = toTabDrafts(settings?.tabs ?? []);
    setTabs(tabDrafts);
    setDrafts(toDrafts(settings?.properties ?? [], tabDrafts));
    setActiveTab(DEFAULT_TAB_KEY);
    // Черновики собираются при открытии окна, а не при каждом обновлении стора:
    // иначе фоновая перезагрузка настроек стёрла бы набранное
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, listKey]);

  /** Новое свойство заводится на открытой вкладке — там его и ждут увидеть. */
  const addProperty = useCallback(
    () =>
      setDrafts((list) => [
        ...list,
        { ...newDraft(), tab: activeTab, sort: nextSort(list, activeTab) },
      ]),
    [activeTab],
  );

  /**
   * Новая вкладка заводится из попапа — с готовым названием и кодом — и сразу
   * открывается: её только что создали, на неё и будут класть свойства.
   */
  const addTab = useCallback(
    (name: string) => {
      // Код не вводят — он генерируется из названия и дальше живёт как внутренний
      // ключ: по нему свойство привязано к вкладке и переживает переименование
      const taken = tabs.map((tab) => tab.code.trim()).filter(Boolean);
      const tab = newTabDraft(name, tabCodeFromName(name, taken));
      // Вкладка готовится здесь, а не внутри setTabs: обновление состояния должно
      // быть чистым, иначе повторный вызов апдейтера заведёт вторую такую же
      setTabs((list) => [...list, tab]);
      setActiveTab(tab.uid);
    },
    [tabs],
  );

  const updateTab = useCallback(
    (uid: string, patch: Partial<TabDraft>) =>
      setTabs((list) => list.map((tab) => (tab.uid === uid ? { ...tab, ...patch } : tab))),
    [],
  );

  /** Удаление вкладки возвращает её свойства на общую «Свойства» — иначе они пропадут из карточки. */
  const removeTab = useCallback((uid: string) => {
    setTabs((list) => {
      const gone = list.find((tab) => tab.uid === uid);
      if (gone?.code) {
        setDrafts((properties) =>
          properties.map((draft) =>
            draft.tab === gone.code ? { ...draft, tab: DEFAULT_TAB_KEY } : draft,
          ),
        );
      }
      return list.filter((tab) => tab.uid !== uid);
    });
    // Смотреть на удалённую вкладку нечего — возвращаемся на общую
    setActiveTab((current) => (current === uid ? DEFAULT_TAB_KEY : current));
  }, []);

  const moveTab = useCallback(
    (uid: string, step: -1 | 1) =>
      setTabs((list) => moveTabDraft(list, list.findIndex((tab) => tab.uid === uid), step)),
    [],
  );

  const updateProperty = useCallback(
    (uid: string, patch: Partial<PropertyDraft>) =>
      setDrafts((list) => list.map((draft) => (draft.uid === uid ? patchDraft(draft, patch) : draft))),
    [],
  );

  /** Варианты списка правятся в окне параметров — по одному полю за раз. */
  const updateOption = useCallback(
    (uid: string, index: number, patch: Partial<ListOptionDto>) =>
      setDrafts((list) =>
        list.map((draft) =>
          draft.uid === uid ? patchDraft(draft, { options: setOption(draft.options, index, patch) }) : draft,
        ),
      ),
    [],
  );

  const addOption = useCallback(
    (uid: string) =>
      setDrafts((list) =>
        list.map((draft) =>
          draft.uid === uid
            ? patchDraft(draft, { options: [...draft.options, { code: '', name: '' }] })
            : draft,
        ),
      ),
    [],
  );

  const removeOption = useCallback(
    (uid: string, index: number) =>
      setDrafts((list) =>
        list.map((draft) =>
          draft.uid === uid
            ? patchDraft(draft, { options: draft.options.filter((_option, at) => at !== index) })
            : draft,
        ),
      ),
    [],
  );

  /** Заголовок одного столбца таблицы. */
  const updateHeader = useCallback(
    (uid: string, index: number, text: string) =>
      setDrafts((list) =>
        list.map((draft) =>
          draft.uid === uid
            ? patchDraft(draft, {
                headers: tableHeaders(draft.headers, draft.columns ?? 0).map((header, at) =>
                  at === index ? text : header,
                ),
              })
            : draft,
        ),
      ),
    [],
  );

  const removeProperty = useCallback(
    (uid: string) => setDrafts((list) => list.filter((draft) => draft.uid !== uid)),
    [],
  );

  /**
   * Строки таблицы: только свойства открытой вкладки — остальные видны на своих.
   * К черновику добавляется то, какие настройки у его типа вообще есть.
   */
  const properties = useMemo(
    () =>
      sortedDrafts(drafts)
        .filter((draft) => draft.tab === activeTab)
        .map((draft) => ({
          ...draft,
          canBeMultiple: supportsMultiple(draft.type),
          needsOptions: hasOptions(draft.type),
          hasFileRules: hasFileRules(draft.type),
          hasResolution: hasResolution(draft.type),
          hasTableConfig: hasTableConfig(draft.type),
          hasLinkSource: hasLinkSource(draft.type),
          /** Есть ли что открывать в окне параметров */
          hasConfig: hasConfig(draft.type),
        })),
    [activeTab, drafts],
  );

  /** Сколько свойств на каждой вкладке — счётчик в её заголовке. */
  const countByTab = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const draft of drafts) counts[draft.tab] = (counts[draft.tab] ?? 0) + 1;
    return counts;
  }, [drafts]);

  /** Открытая вкладка, если это не общая «Свойства»: у неё правят название и код. */
  const activeTabDraft = useMemo(
    () => tabs.find((tab) => tab.uid === activeTab) ?? null,
    [activeTab, tabs],
  );

  const isChanged =
    form.isChanged || draftsChanged(saved, drafts, tabs) || tabsChanged(savedTabs, tabs);
  const warning = useMemo(() => droppedValuesWarning(saved, drafts), [drafts, saved]);

  /** Сохранение; возвращает текст ошибки или null — сообщение покажет компонент. */
  const submit = useCallback(async (): Promise<string | null> => {
    const invalid = form.validate() ?? validateTabs(tabs, drafts) ?? validateDrafts(drafts);
    if (invalid) return invalid;
    return saveSettings(listKey, toSettingsPayload(form.values, drafts, tabs, ownNesting));
  }, [drafts, form, listKey, ownNesting, saveSettings, tabs]);

  return {
    /** Имя и код: кладутся в EditorFormProvider и рисуются общей формой */
    form: form.form,
    properties,
    addProperty,
    updateProperty,
    removeProperty,
    /** Параметры свойства: варианты списка и заголовки столбцов таблицы */
    addOption,
    updateOption,
    removeOption,
    updateHeader,
    /** Вкладки карточки записи и варианты выбора для свойства */
    tabs,
    tabChoices: tabChoices(tabs),
    countByTab,
    /** Какая вкладка открыта в окне; '' — общая «Свойства» */
    activeTab,
    setActiveTab,
    /** Открытая вкладка, если она не общая: у неё правят название и код */
    activeTabDraft,
    addTab,
    updateTab,
    removeTab,
    moveTab,
    isChanged,
    /** Что станет со значениями записей после сохранения; сохранять не мешает */
    warning,
    isSaving: saving,
    submit,
  };
}

/** Результат хука — для компонентов окна, которые получают его через контекст. */
export type ListSettingsFormState = ReturnType<typeof useListSettingsForm>;
