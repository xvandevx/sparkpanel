import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  fetchLinkSourcesThunk,
  fetchLinkTargetsThunk,
  fetchListSettingsThunk,
  removePropertyValuesThunk,
  savePropertyValuesThunk,
  saveListSettingsThunk,
} from '../../redux/action-creaters/listSettings';
import { emptyListSettingsEntry } from '../../redux/reducers/listSettingsReducer';
import type { ListPropertyDto, UpdateListSettingsDto } from '../../src/api/client';
import type { EditorHtmlBlock, EditorSelectOption } from '../editorForm';
import { toHtmlBlockOptions } from '../content/htmlBlockLinks';
import { useContentActions } from '../content/useContentActions';
import { htmlBlockChoices, linkTargetChoices } from './propertyFields';

const NO_PROPERTIES: ListPropertyDto[] = [];

/**
 * Действия настроек списков: только dispatch, без селекторов — хук можно звать
 * где угодно, не вызывая лишних перерисовок.
 */
export const useListSettingsActions = () => {
  const dispatch = useDispatch<AppDispatch>();

  const load = useCallback((listKey: string) => dispatch(fetchListSettingsThunk(listKey)), [dispatch]);

  /** Возвращает текст ошибки или null. */
  const saveSettings = useCallback(
    (listKey: string, dto: UpdateListSettingsDto): Promise<string | null> =>
      dispatch(saveListSettingsThunk(listKey, dto)),
    [dispatch],
  );

  /** Значения свойств и родитель записи; возвращает текст ошибки или null. */
  const saveValues = useCallback(
    (
      listKey: string,
      recordId: string,
      values: Record<string, unknown>,
      parentId: string | null,
    ): Promise<string | null> =>
      dispatch(savePropertyValuesThunk(listKey, recordId, values, parentId)),
    [dispatch],
  );

  const loadLinkTargets = useCallback(() => dispatch(fetchLinkTargetsThunk()), [dispatch]);

  const loadLinkSources = useCallback(() => dispatch(fetchLinkSourcesThunk()), [dispatch]);

  const removeValues = useCallback(
    (listKey: string, recordIds: string[]) =>
      dispatch(removePropertyValuesThunk(listKey, recordIds)),
    [dispatch],
  );

  return { load, saveSettings, saveValues, removeValues, loadLinkTargets, loadLinkSources };
};

/**
 * Загрузка настроек списка и значений свойств его записей. Перечитывается при
 * смене ключа: у записей разных инфоблоков свои свойства. Вызывается один раз —
 * провайдером редактора контента.
 */
export const useLoadListSettings = (listKey: string | null) => {
  const { load } = useListSettingsActions();

  useEffect(() => {
    if (listKey) load(listKey);
  }, [listKey, load]);
};

/** Настройки списка, значения его записей и флаги загрузки. */
export const useListSettings = (listKey: string | null) => {
  const entry = useSelector((state: RootState) =>
    listKey ? state.listSettings.lists[listKey] ?? emptyListSettingsEntry : emptyListSettingsEntry,
  );
  const { saving, valuesSaving } = useSelector((state: RootState) => state.listSettings);

  return {
    settings: entry.settings,
    properties: entry.settings?.properties ?? NO_PROPERTIES,
    /** Ключ записи → её значения; записей без значений здесь нет */
    values: entry.values,
    /** Ключ записи → её родитель (у древовидного списка) */
    parents: entry.parents,
    /** Списку без настроек ждать нечего; провал загрузки — тоже «готово», только без свойств */
    isReady: listKey === null || entry.loaded,
    error: entry.error,
    saving,
    valuesSaving,
  };
};

/**
 * HTML-блоки раздела «Контент» — варианты для свойства «HTML-блоки» и блоки
 * для вставки в «HTML». Список грузится, только если такое свойство в списке
 * есть, и один раз на сессию: сохранение блока в его разделе перечитывает
 * список само.
 */
export const usePropertyHtmlBlocks = (
  needed: boolean,
): { choices: EditorSelectOption[]; blocks: EditorHtmlBlock[] } => {
  const { items, loading, loaded } = useSelector((state: RootState) => state.content);
  const { load } = useContentActions();

  /** Попытка уже была: провалившийся запрос не опрашивается по кругу. */
  const attempted = useRef(false);

  useEffect(() => {
    if (!needed || loaded || loading || attempted.current) return;
    attempted.current = true;
    load();
  }, [load, loaded, loading, needed]);

  return useMemo(
    () => ({ choices: htmlBlockChoices(items), blocks: toHtmlBlockOptions(items) }),
    [items],
  );
};

/**
 * Записи для «Привязки к контенту». Перечитываются при каждом заходе в список,
 * где такое свойство есть: контент заводят и удаляют в других разделах.
 */
/**
 * Списки, которыми можно ограничить привязку в настройках свойства. Грузятся
 * при открытии окна настроек: инфоблок могли завести минуту назад.
 */
export const usePropertyLinkSources = (needed: boolean): EditorSelectOption[] => {
  const sources = useSelector((state: RootState) => state.listSettings.linkSources);
  const { loadLinkSources } = useListSettingsActions();

  useEffect(() => {
    if (needed) loadLinkSources();
  }, [loadLinkSources, needed]);

  return useMemo(
    () => [
      { value: '', label: 'Любая запись панели' },
      ...sources.map((source) => ({ value: source.listKey, label: source.name })),
    ],
    [sources],
  );
};

export const usePropertyLinkTargets = (
  needed: boolean,
  listKey: string | null,
): EditorSelectOption[] => {
  const targets = useSelector((state: RootState) => state.listSettings.linkTargets);
  const { loadLinkTargets } = useListSettingsActions();

  useEffect(() => {
    if (needed) loadLinkTargets();
  }, [listKey, loadLinkTargets, needed]);

  return useMemo(() => linkTargetChoices(targets), [targets]);
};
