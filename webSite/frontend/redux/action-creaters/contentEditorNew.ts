import type { Dispatch } from 'redux';
import {
  createInfoblockProperty,
  createInfoblockTab,
  fetchInfoblockProperties,
  fetchInfoblockTabs,
  fetchListColumns,
  fetchListFilters,
  removeInfoblockProperty,
  fetchLinkSources,
  fetchLinkTargets,
  fetchOptionSources,
  fetchListSettings,
  removeInfoblockTab,
  renameInfoblockTab,
  resetListColumns,
  saveListColumns,
  saveListFilters,
  saveListSettings,
  updateInfoblockProperty,
} from '../../api/infoblockSettings';
import { fetchRecordValues, savePropertyValues } from '../../api/infoblockValues';
import {
  discardRecordDraft,
  fetchRecordDraft,
  publishRecordDraft,
  saveRecordDraft,
  type DraftBody,
} from '../../api/drafts';
import {
  createBackup,
  fetchBackupCheck,
  fetchBackupFile,
  fetchBackups,
  removeBackup,
  restoreBackup,
  uploadBackup,
  type RestoreBody,
} from '../../api/backups';
import { fetchDomains } from '../../api/domains';
import { fetchRecordsPage, type RecordsPageQuery } from '../../api/records';
import { clearHistory, fetchListJournal, fetchRecordHistory } from '../../api/history';
import type {
  BackupCheckDto,
  BackupDto,
  HistoryRecordDto,
  InfoblockSettingsDto,
  RecordDraftDto,
  UpdateInfoblockSettingsDto,
} from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import type { EditorDraft, EditorProperty, EditorTab } from '../reducers/contentEditorNewReducer';
import {
  NEW_EDITOR_COLUMNS,
  NEW_EDITOR_ERROR,
  NEW_EDITOR_FILTERS,
  NEW_EDITOR_PAGE,
  NEW_EDITOR_PAGE_ERROR,
  NEW_EDITOR_PAGE_REQUEST,
  NEW_EDITOR_REQUEST,
  NEW_EDITOR_SETTINGS,
  NEW_EDITOR_SETTINGS_REQUEST,
  NEW_EDITOR_SETTINGS_SAVING,
  NEW_EDITOR_SUCCESS,
  NEW_EDITOR_PROPERTIES,
  NEW_EDITOR_RECORD_DRAFT,
  NEW_EDITOR_RECORD_VALUES,
  NEW_EDITOR_RESTORED,
  NEW_EDITOR_TABS,
  type ContentEditorNewAction,
  type ContentEditorNewState,
  type EditorListSettings,
  type EditorTableColumn,
  type EditorValues,
} from '../reducers/contentEditorNewReducer';

/**
 * Сквозной номер запроса списка: по нему редьюсер отличает отставший ответ
 * от свежего. Общий на все списки — сравнивается он только внутри ячейки.
 */
let requestSeq = 0;

/**
 * Загрузка списка для нового редактора. Куда ходить, знает Api раздела — сюда
 * оно приходит ключом списка и функцией загрузки; thunk остаётся единственным
 * местом, откуда дёргается слой `api/`.
 */
export const loadEditorListThunk =
  (key: string, list: () => Promise<unknown[]>) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    const request = (requestSeq += 1);
    dispatch({ type: NEW_EDITOR_REQUEST, payload: { key, request } });
    try {
      dispatch({ type: NEW_EDITOR_SUCCESS, payload: { key, request, items: await list() } });
    } catch (error) {
      dispatch({
        type: NEW_EDITOR_ERROR,
        payload: { key, error: apiErrorMessage(error, 'Не удалось загрузить список') },
      });
    }
  };

/** Что thunk-ам страницы нужно из стора: сам срез редактора. */
type GetEditorState = () => { contentEditorNew: ContentEditorNewState };

/**
 * Страница таблицы: поиск, фильтр, сортировку и саму страницу ведёт сервер,
 * одним маршрутом на все списки. Запрос остаётся в сторе — им же страница
 * перечитывается после правки записи.
 */
export const loadEditorPageThunk =
  (key: string, query: RecordsPageQuery) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    const request = (requestSeq += 1);
    dispatch({ type: NEW_EDITOR_PAGE_REQUEST, payload: { key, request, query } });
    try {
      const page = await fetchRecordsPage(key, query);
      // Значения — у каждой записи страницы: у записи без значений они пустые,
      // а не прежние из стора — их могли стереть
      const values: EditorValues = Object.fromEntries(page.items.map((item) => [String(item.id), {}]));
      page.values.forEach((record) => {
        values[record.recordId] = valuesOf(record.values);
      });
      // Черновики — так же: у записи страницы без черновика он null, а не прежний
      const drafts: Record<string, EditorDraft | null> = Object.fromEntries(
        page.items.map((item) => [String(item.id), null]),
      );
      page.drafts.forEach((draft) => {
        drafts[draft.recordId] = draftOf(draft);
      });
      dispatch({
        type: NEW_EDITOR_PAGE,
        payload: {
          key,
          request,
          items: page.items,
          total: page.total,
          values,
          drafts,
          draftsCount: page.draftsCount,
        },
      });
    } catch (error) {
      dispatch({
        type: NEW_EDITOR_PAGE_ERROR,
        payload: { key, request, error: apiErrorMessage(error, 'Не удалось загрузить список') },
      });
    }
  };

/**
 * Перечитать страницу тем же запросом — после правки мимо карточки (загрузили
 * файлы кнопкой над списком). Таблица её ещё не просила — перечитывать нечего.
 */
export const reloadEditorPageThunk =
  (key: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>, getState: GetEditorState): Promise<void> => {
    const query = getState().contentEditorNew[key]?.page?.query;
    if (query) await loadEditorPageThunk(key, query)(dispatch);
  };

/** Записей за запрос при выгрузке: больше сервер на страницу не отдаёт. */
const EXPORT_PAGE_SIZE = 100;

/** Все записи выгрузки и значения их свойств — как их держит стор. */
export interface EditorExport {
  items: unknown[];
  values: EditorValues;
}

/**
 * Все записи списка тем же отбором, что у таблицы (поиск, фильтр, сортировка), —
 * для выгрузки в файл. Своего маршрута у выгрузки нет: страницы таблицы по 100
 * подряд, плоским списком — в файле дерева нет. В стор не кладётся: таблица
 * показывает свою страницу, а выгрузка живёт, пока пишется файл.
 */
export const exportEditorRecordsThunk =
  (key: string, query: RecordsPageQuery) =>
  async (): Promise<EditorExport> => {
    const items: unknown[] = [];
    const values: EditorValues = {};
    try {
      for (let page = 1; ; page += 1) {
        const result = await fetchRecordsPage(key, {
          ...query,
          page,
          pageSize: EXPORT_PAGE_SIZE,
          isTree: false,
        });
        items.push(...result.items);
        result.values.forEach((record) => {
          values[record.recordId] = valuesOf(record.values);
        });
        if (result.items.length < EXPORT_PAGE_SIZE || items.length >= result.total) break;
      }
    } catch (error) {
      throw new Error(apiErrorMessage(error, 'Не удалось выгрузить записи'));
    }
    return { items, values };
  };

/**
 * Настройки списка — одна таблица на всю панель, строка на код списка.
 * Загружаются один раз на раздел: свойства записей нужны и карточке, и таблице,
 * и окну настроек.
 *
 * Не пришли — не беда: список записей работает и без них, поэтому ошибка
 * загрузки гасится, а настройки остаются `null`.
 */
export const loadEditorSettingsThunk =
  (listKey: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    dispatch({ type: NEW_EDITOR_SETTINGS_REQUEST, payload: { key: listKey, isLoading: true } });
    try {
      dispatch({
        type: NEW_EDITOR_SETTINGS,
        payload: { key: listKey, settings: toSettings(await fetchListSettings(listKey)) },
      });
    } catch {
      // Настройки не пришли — записи всё равно показываем, а запрос можно повторить
      dispatch({ type: NEW_EDITOR_SETTINGS_REQUEST, payload: { key: listKey, isLoading: false } });
    }
  };

/** Что уходит на сервер при сохранении настроек; имя и код списка окно не правит. */
export interface EditorSettingsPayload {
  useCode?: boolean;
  codeRequired?: boolean;
  codeUnique?: boolean;
  /** Уровней вложенности: 1 — плоский список, null — дерево без ограничения */
  maxDepth?: number | null;
  /** Вести журнал изменений списка */
  isHistoryEnabled?: boolean;
  /** Сохранять правки черновиком */
  isDraftEnabled?: boolean;
}

/** Сохранение настроек целиком; возвращает текст ошибки или null. */
export const saveEditorSettingsThunk =
  (listKey: string, payload: EditorSettingsPayload) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> => {
    dispatch({ type: NEW_EDITOR_SETTINGS_SAVING, payload: { key: listKey, isSaving: true } });
    try {
      const saved = await saveListSettings(listKey, payload as unknown as UpdateInfoblockSettingsDto);
      dispatch({ type: NEW_EDITOR_SETTINGS, payload: { key: listKey, settings: toSettings(saved) } });
      return null;
    } catch (error) {
      dispatch({ type: NEW_EDITOR_SETTINGS_SAVING, payload: { key: listKey, isSaving: false } });
      return apiErrorMessage(error, 'Не удалось сохранить настройки списка');
    }
  };

/** Ответ сервера — в то, что держит стор: только сами настройки списка. */
const toSettings = (dto: InfoblockSettingsDto): EditorListSettings => ({
  name: dto.name,
  code: dto.code,
  useCode: dto.useCode,
  codeRequired: dto.codeRequired,
  codeUnique: dto.codeUnique,
  isHistoryEnabled: dto.isHistoryEnabled,
  isDraftEnabled: dto.isDraftEnabled,
  maxDepth: dto.maxDepth ?? null,
});

/** Настройки списка из стора — тип для тех, кто их читает. */
export type { EditorListSettings };

/** Список-источник привязки к записям: страницы, элементы типа контента, роли, формы. */
export interface EditorLinkSource {
  /** Номер типа контента, под который заведён список; null — у постоянных списков */
  id: number | null;
  listKey: string;
  name: string;
  /** Полное имя для закрытого выбора; нет — хватает `name` */
  label: string;
  /** Группа в выборе («Контент»); null — без группы */
  group: string | null;
  /** Родительский источник в дереве группы; null — верхний уровень */
  parentKey: string | null;
}

/**
 * Списки, из которых свойство «Привязка к контенту» берёт записи. Нужны только
 * при настройке такого свойства, поэтому в общий стейт не кладутся — но запрос
 * всё равно уходит отсюда: `api/` дёргается только из thunks.
 */
export const loadEditorLinkSourcesThunk = () => async (): Promise<EditorLinkSource[]> =>
  (await fetchLinkSources()).map((source) => ({
    id: source.id ?? null,
    listKey: source.listKey,
    name: source.name,
    label: source.label ?? source.name,
    group: source.group ?? null,
    parentKey: source.parentKey ?? null,
  }));

/** Свойство-«Список», на варианты которого может смотреть привязка к значениям списка. */
export interface EditorOptionSource {
  propertyId: number;
  name: string;
  listKey: string;
  /** Имя списка — группа в выборе */
  listName: string;
}

/** Свойства-«Списки» всех доступных списков — для настройки привязки к значениям списка. */
export const loadEditorOptionSourcesThunk = () => async (): Promise<EditorOptionSource[]> =>
  (await fetchOptionSources()).map((source) => ({
    propertyId: source.propertyId,
    name: source.name,
    listKey: source.listKey,
    listName: source.listName,
  }));

/** Запись, которую можно выбрать в поле «Привязка к контенту». */
export interface EditorLinkTarget {
  listKey: string;
  recordId: string;
  /** Родитель в том же списке — ключом записи; null — верхний уровень */
  parentId: string | null;
  name: string;
  /** Откуда запись — группа в выборе: «Страницы», «Роли» */
  group: string;
}

/**
 * Записи для поля привязки в карточке — только из названных списков. Как и
 * источники, в общий стейт не кладутся: нужны открытой карточке и меняются
 * вместе с другими списками (завели роль — она должна появиться в выборе),
 * поэтому читаются при открытии.
 */
export const loadEditorLinkTargetsThunk =
  (listKeys: string[]) => async (): Promise<EditorLinkTarget[]> =>
  (await fetchLinkTargets(listKeys)).map((target) => ({
    listKey: target.listKey,
    recordId: target.recordId,
    parentId: target.parentId ?? null,
    name: target.name,
    group: target.group,
  }));

/** Домен сайта, каким его выбирают в мультидоменном свойстве. */
export interface EditorDomain {
  id: number;
  /** null — домен, иначе поддомен этого домена */
  parentId: number | null;
  /** Полный адрес: `ekb.farkop.ru` */
  address: string;
  isActive: boolean;
}

/**
 * Домены для мультидоменного свойства в карточке. Как и записи привязки,
 * в общий стейт не кладутся: читаются при открытии карточки, чтобы только
 * что заведённый домен сразу был в выборе.
 */
export const loadEditorDomainsThunk = () => async (): Promise<EditorDomain[]> =>
  (await fetchDomains()).map((domain) => ({
    id: domain.id,
    parentId: domain.parentId,
    address: domain.address,
    isActive: domain.isActive,
  }));

/** Что сделали с записью: завели, поправили, удалили. */
export type EditorHistoryAction = 'create' | 'update' | 'delete';

/** Одно изменённое поле: ключ (`name`, `props.price`) и значения до и после. */
export interface EditorHistoryChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Строка журнала изменений: кто, когда и что поменял в записи. */
export interface EditorHistoryRecord {
  id: number;
  /** Ключ записи — тот же, что у строки таблицы */
  recordId: string;
  /** Название и код записи на момент правки: удалённую иначе не назвать */
  recordName: string | null;
  recordCode: string | null;
  action: EditorHistoryAction;
  changes: EditorHistoryChange[];
  authorName: string | null;
  authorEmail: string | null;
  authorIp: string | null;
  createdAt: string;
}

/** Страница журнала: строки и сколько их всего. */
export interface EditorHistoryPage {
  items: EditorHistoryRecord[];
  total: number;
}

/**
 * Журнал списка, страницами, и история одной записи. Как и записи привязки,
 * в общий стейт не кладутся: журнал растёт с каждой правкой, и показывать его
 * надо свежим — поэтому читается при каждом показе, а держит его экран истории.
 */
export const loadEditorJournalThunk =
  (listKey: string, limit: number, offset: number) => async (): Promise<EditorHistoryPage> => {
    const page = await fetchListJournal(listKey, limit, offset);
    return { items: page.items.map(toHistoryRecord), total: page.total };
  };

export const loadEditorRecordHistoryThunk =
  (listKey: string, recordId: string) => async (): Promise<EditorHistoryRecord[]> =>
    (await fetchRecordHistory(listKey, recordId)).map(toHistoryRecord);

/**
 * Очистить журнал списка или, с ключом записи, историю одной записи.
 * Возвращает текст ошибки или null — как сохранение и удаление записи.
 */
export const clearEditorHistoryThunk =
  (listKey: string, recordId?: string) => async (): Promise<string | null> => {
    try {
      await clearHistory(listKey, recordId);
      return null;
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось очистить историю');
    }
  };

/**
 * Строка журнала с сервера — в то, что показывает редактор. Swagger отдаёт
 * `changes` просто массивом объектов, форма изменения восстанавливается здесь.
 */
const toHistoryRecord = (dto: HistoryRecordDto): EditorHistoryRecord => ({
  id: dto.id,
  recordId: dto.entityId,
  recordName: dto.entityName,
  recordCode: dto.entityCode,
  action: dto.action as EditorHistoryAction,
  changes: (dto.changes ?? []) as EditorHistoryChange[],
  authorName: dto.authorName,
  authorEmail: dto.authorEmail,
  authorIp: dto.authorIp,
  createdAt: dto.createdAt,
});

/**
 * Вкладки карточки записи. Правятся сразу, по одной: завели — запрос ушёл,
 * удалили — ушёл. Черновика у вкладок нет, в отличие от свойств: свойство
 * без кода и типа сохранять нечего, а вкладка это только название.
 */
export const loadEditorTabsThunk =
  (listKey: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    try {
      dispatch({
        type: NEW_EDITOR_TABS,
        payload: { key: listKey, tabs: await fetchInfoblockTabs(listKey) },
      });
    } catch {
      // Вкладки не пришли — настройки всё равно показываем
    }
  };

/** Заводит вкладку и возвращает её код или null при ошибке. */
export const createEditorTabThunk =
  (listKey: string, name: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> => {
    try {
      const tab = await createInfoblockTab(listKey, name);
      dispatch({
        type: NEW_EDITOR_TABS,
        payload: { key: listKey, tabs: await fetchInfoblockTabs(listKey) },
      });
      return tab.code;
    } catch {
      return null;
    }
  };

export const renameEditorTabThunk =
  (listKey: string, id: number, name: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<boolean> => {
    try {
      await renameInfoblockTab(listKey, id, name);
      dispatch({
        type: NEW_EDITOR_TABS,
        payload: { key: listKey, tabs: await fetchInfoblockTabs(listKey) },
      });
      return true;
    } catch {
      return false;
    }
  };

/** Удаляет вкладку; её свойства сервер переводит на общую «Свойства». */
export const removeEditorTabThunk =
  (listKey: string, id: number) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<boolean> => {
    try {
      await removeInfoblockTab(listKey, id);
      dispatch({
        type: NEW_EDITOR_TABS,
        payload: { key: listKey, tabs: await fetchInfoblockTabs(listKey) },
      });
      return true;
    } catch {
      return false;
    }
  };

/**
 * Вид таблицы списка: какие колонки видны, в каком порядке и какой ширины.
 * У каждого пользователя свой. Не пришёл — таблица покажет колонки раздела:
 * без вида она работает, поэтому ошибка гасится.
 */
export const loadEditorColumnsThunk =
  (listKey: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    let columns: EditorTableColumn[] = [];
    try {
      columns = toColumns(await fetchListColumns(listKey));
    } catch {
      // Вид не пришёл — колонки по умолчанию, а не вечная загрузка таблицы
    }
    dispatch({ type: NEW_EDITOR_COLUMNS, payload: { key: listKey, columns } });
  };

/** Сохраняет вид таблицы целиком; возвращает текст ошибки или null. */
export const saveEditorColumnsThunk =
  (listKey: string, columns: EditorTableColumn[]) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> => {
    try {
      const saved = await saveListColumns(listKey, columns);
      dispatch({ type: NEW_EDITOR_COLUMNS, payload: { key: listKey, columns: toColumns(saved) } });
      return null;
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось сохранить колонки');
    }
  };

/** Стирает сохранённый вид: таблица вернётся к колонкам раздела. */
export const resetEditorColumnsThunk =
  (listKey: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> => {
    try {
      await resetListColumns(listKey);
      dispatch({ type: NEW_EDITOR_COLUMNS, payload: { key: listKey, columns: [] } });
      return null;
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось вернуть колонки по умолчанию');
    }
  };

const toColumns = (dto: { key: string; width?: number | null }[]): EditorTableColumn[] =>
  dto.map((column) => ({ key: column.key, width: column.width ?? null }));

/**
 * Набор полей фильтра таблицы — один на список для всех. Не пришёл — таблица
 * без фильтра: работать она может и так, поэтому ошибка гасится.
 */
export const loadEditorFiltersThunk =
  (listKey: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    let filterKeys: string[] = [];
    try {
      filterKeys = await fetchListFilters(listKey);
    } catch {
      // Набор не пришёл — таблица без фильтра, а не вечная загрузка
    }
    dispatch({ type: NEW_EDITOR_FILTERS, payload: { key: listKey, filterKeys } });
  };

/** Сохраняет набор полей фильтра целиком; возвращает текст ошибки или null. */
export const saveEditorFiltersThunk =
  (listKey: string, keys: string[]) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> => {
    try {
      const filterKeys = await saveListFilters(listKey, keys);
      dispatch({ type: NEW_EDITOR_FILTERS, payload: { key: listKey, filterKeys } });
      return null;
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось сохранить поля фильтра');
    }
  };

/**
 * Свойства записей списка. Читаются и сохраняются своим запросом: в карточке
 * записи нужны они, а не имя и код списка.
 */
export const loadEditorPropertiesThunk =
  (listKey: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    try {
      const properties = await fetchInfoblockProperties(listKey);
      dispatch({
        type: NEW_EDITOR_PROPERTIES,
        payload: { key: listKey, properties: properties.map((property) => ({ ...property })) },
      });
    } catch {
      // Свойства не пришли — записи всё равно показываем
    }
  };

/**
 * Правка одного свойства: заводим, меняем или убираем. Соседей это не трогает —
 * каждое свойство живёт своей строкой. Возвращает текст ошибки или null.
 */
export const createEditorPropertyThunk =
  (listKey: string, property: unknown) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> =>
    refresh(dispatch, listKey, () => createInfoblockProperty(listKey, property as never), 'Не удалось завести свойство');

export const updateEditorPropertyThunk =
  (listKey: string, id: number, property: unknown) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> =>
    refresh(dispatch, listKey, () => updateInfoblockProperty(listKey, id, property as never), 'Не удалось сохранить свойство');

export const removeEditorPropertyThunk =
  (listKey: string, id: number) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> =>
    refresh(dispatch, listKey, () => removeInfoblockProperty(listKey, id), 'Не удалось удалить свойство');

/**
 * Значения одной записи — карточке, открытой не со страницы таблицы (из журнала):
 * записям страницы они приходят вместе с ней.
 *
 * Не пришли — не беда: поля раздела карточка покажет и без них, поэтому
 * ошибка гасится, а значения записи остаются пустыми.
 */
export const loadEditorRecordValuesThunk =
  (listKey: string, recordId: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    let values: Record<string, unknown> = {};
    try {
      values = valuesOf((await fetchRecordValues(listKey, recordId)).values);
    } catch {
      // Значения свойств не пришли — карточка покажет поля раздела
    }
    dispatch({ type: NEW_EDITOR_RECORD_VALUES, payload: { key: listKey, recordId, values } });
  };

/**
 * Черновик одной записи — карточке, открытой не со страницы таблицы. Не пришёл —
 * считаем, что черновика нет: карточка покажет опубликованное.
 */
export const loadEditorRecordDraftThunk =
  (listKey: string, recordId: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<void> => {
    let draft: EditorDraft | null = null;
    try {
      const state = await fetchRecordDraft(listKey, recordId);
      draft = state.draft ? draftOf(state.draft) : null;
    } catch {
      // Черновик не пришёл — карточка покажет опубликованное
    }
    dispatch({ type: NEW_EDITOR_RECORD_DRAFT, payload: { key: listKey, recordId, draft } });
  };

/** Черновик с сервера — как его держит стор: свойства по номеру, как и значения. */
const draftOf = (dto: RecordDraftDto): EditorDraft => ({
  fields: dto.fields,
  values: valuesOf(dto.values),
  isNew: dto.isNew,
  authorEmail: dto.authorEmail,
  updatedAt: dto.updatedAt,
});

/**
 * Сохранить черновик записи — что сейчас отличается от опубликованного —
 * и перечитать страницу: таблица ищет и сортирует уже с ним.
 */
export const saveEditorDraftThunk =
  (listKey: string, list: () => Promise<unknown[]>, recordId: string, body: DraftBody) =>
  async (dispatch: Dispatch<ContentEditorNewAction>, getState: GetEditorState): Promise<string | null> =>
    refreshList(
      dispatch,
      getState,
      listKey,
      list,
      async () => {
        const draft = draftOf(await saveRecordDraft(listKey, recordId, body));
        dispatch({ type: NEW_EDITOR_RECORD_DRAFT, payload: { key: listKey, recordId, draft } });
      },
      'Не удалось сохранить черновик',
    );

/** Удалить черновик: запись возвращается к опубликованному. */
export const discardEditorDraftThunk =
  (listKey: string, list: () => Promise<unknown[]>, recordId: string) =>
  async (dispatch: Dispatch<ContentEditorNewAction>, getState: GetEditorState): Promise<string | null> =>
    refreshList(
      dispatch,
      getState,
      listKey,
      list,
      async () => {
        await discardRecordDraft(listKey, recordId);
        dispatch({ type: NEW_EDITOR_RECORD_DRAFT, payload: { key: listKey, recordId, draft: null } });
      },
      'Не удалось удалить черновик',
    );

/** Что публикуется у записи: поля — маршрутом раздела, свойства — по номерам. */
export interface EditorPublication {
  recordId: string;
  /** Запись правкой раздела; null — поля записи не менялись */
  update: (() => Promise<unknown>) | null;
  /** Изменённые свойства: номер строкой → значение */
  values: Record<string, unknown>;
}

/**
 * Опубликовать черновики: у каждой записи — то же сохранение, что и без
 * черновика (поля маршрутом раздела, свойства — значениями, с их проверками
 * и журналом), а потом черновик снимается. Не прошло сохранение — черновик
 * остаётся: опубликовать его можно снова. Записи идут по одной, упавшая
 * не останавливает остальные, список перечитывается раз в конце.
 */
export const publishEditorDraftsThunk =
  (listKey: string, list: () => Promise<unknown[]>, items: EditorPublication[]) =>
  async (
    dispatch: Dispatch<ContentEditorNewAction>,
    getState: GetEditorState,
  ): Promise<{ done: number; errors: string[] }> => {
    let done = 0;
    const errors: string[] = [];
    for (const item of items) {
      try {
        if (item.update) await item.update();
        const values = Object.entries(item.values).map(([propertyId, value]) => ({
          propertyId: Number(propertyId),
          value,
        }));
        if (values.length > 0) await savePropertyValues(listKey, item.recordId, values);
        await publishRecordDraft(listKey, item.recordId);
        dispatch({ type: NEW_EDITOR_RECORD_DRAFT, payload: { key: listKey, recordId: item.recordId, draft: null } });
        done += 1;
      } catch (error) {
        errors.push(apiErrorMessage(error, 'Не удалось опубликовать черновик'));
      }
    }
    if (done > 0 || errors.length > 0) await reloadAfterWrite(dispatch, getState, listKey, list);
    return { done, errors };
  };

/** Значения записи с сервера — как их держит стор: номер свойства строкой → значение. */
const valuesOf = (items: { propertyId: number; value: unknown }[]): Record<string, unknown> =>
  Object.fromEntries(items.map((item) => [String(item.propertyId), item.value]));

/**
 * Значения свойств одной записи целиком: чего в теле нет, сервер сотрёт.
 * Уходят вторым запросом, после самой записи, — у новой записи ключ появляется
 * только после сохранения.
 */
export const saveEditorValuesThunk =
  (listKey: string, recordId: string, values: Record<string, unknown>) =>
  async (dispatch: Dispatch<ContentEditorNewAction>): Promise<string | null> => {
    try {
      // Родителя тут нет: он поле самой записи и уходит в её собственный запрос
      const saved = await savePropertyValues(
        listKey,
        recordId,
        Object.entries(values).map(([propertyId, value]) => ({
          propertyId: Number(propertyId),
          value,
        })),
      );
      dispatch({
        type: NEW_EDITOR_RECORD_VALUES,
        payload: { key: listKey, recordId, values: valuesOf(saved.values) },
      });
      return null;
    } catch (error) {
      return apiErrorMessage(error, 'Не удалось сохранить значения свойств');
    }
  };

/**
 * Сохранение записи: заводит новую или правит открытую — что именно, решает
 * вызывающий, передавая сюда готовое действие. Редактор знает о записи ровно
 * столько, сколько рассказал раздел своим Api.
 */
export const saveEditorRecordThunk =
  (listKey: string, list: () => Promise<unknown[]>, save: () => Promise<unknown>) =>
  async (
    dispatch: Dispatch<ContentEditorNewAction>,
    getState: GetEditorState,
  ): Promise<{ error: string | null; record: unknown }> => {
    let record: unknown = null;
    const error = await refreshList(
      dispatch,
      getState,
      listKey,
      list,
      async () => {
        // Ответ сервера нужен целиком: у заведённой записи только отсюда
        // и узнаешь ключ, под которым сохранять значения свойств
        record = await save();
      },
      'Не удалось сохранить запись',
    );
    return { error, record };
  };

/** Удаление записи — и сразу перечитанный список. */
export const removeEditorRecordThunk =
  (listKey: string, list: () => Promise<unknown[]>, remove: () => Promise<unknown>) =>
  async (dispatch: Dispatch<ContentEditorNewAction>, getState: GetEditorState): Promise<string | null> =>
    refreshList(dispatch, getState, listKey, list, remove, 'Не удалось удалить запись');

/**
 * Выполнить правку и перечитать список: сервер мог поправить запись по-своему
 * (позиция, код, адрес), и в таблице должно лежать сохранённое, а не отправленное.
 * Перечитывается страница таблицы — тем же запросом, а весь список — только если
 * его уже грузили: иначе он никому не нужен (выбор родителя, меню).
 *
 * Два `try` подряд, а не один: запись уже на сервере, и упавшее перечитывание —
 * беда списка, а не правки. Скажи об этом «не удалось сохранить» — пользователь
 * нажмёт «Сохранить» ещё раз и заведёт вторую такую же запись.
 */
async function refreshList(
  dispatch: Dispatch<ContentEditorNewAction>,
  getState: GetEditorState,
  listKey: string,
  list: () => Promise<unknown[]>,
  run: () => Promise<unknown>,
  failure: string,
): Promise<string | null> {
  try {
    await run();
  } catch (error) {
    return apiErrorMessage(error, failure);
  }

  await reloadAfterWrite(dispatch, getState, listKey, list);
  return null;
}

/**
 * Пачка правок над выбранными записями — быстрые действия таблицы: удалить,
 * включить, выключить. Правки идут по одной и маршрутами раздела, как из
 * карточки: у каждой записи свои проверки и свой след в журнале. Упавшая
 * не останавливает остальные — в ответе сколько прошло и почему не прошли
 * остальные. Список перечитывается один раз, в конце.
 */
export const runEditorBatchThunk =
  (listKey: string, list: () => Promise<unknown[]>, tasks: (() => Promise<unknown>)[], failure: string) =>
  async (
    dispatch: Dispatch<ContentEditorNewAction>,
    getState: GetEditorState,
  ): Promise<{ done: number; errors: string[] }> => {
    let done = 0;
    const errors: string[] = [];
    for (const task of tasks) {
      try {
        await task();
        done += 1;
      } catch (error) {
        errors.push(apiErrorMessage(error, failure));
      }
    }
    if (done > 0) await reloadAfterWrite(dispatch, getState, listKey, list);
    return { done, errors };
  };

/**
 * Перечитать после правки: страницу таблицы — тем же запросом, весь список —
 * только если его уже грузили. Упавшее перечитывание — беда списка, а не правки:
 * таблица покажет его своим предупреждением.
 */
async function reloadAfterWrite(
  dispatch: Dispatch<ContentEditorNewAction>,
  getState: GetEditorState,
  listKey: string,
  list: () => Promise<unknown[]>,
): Promise<void> {
  const entry = getState().contentEditorNew[listKey];
  const pageReload = entry?.page ? loadEditorPageThunk(listKey, entry.page.query)(dispatch) : null;
  if (!entry?.isLoaded) {
    await pageReload;
    return;
  }

  try {
    // Перечитывание после правки — такой же запрос списка, и номер ему нужен
    // по той же причине: ответ может отстать от более свежего
    const request = (requestSeq += 1);
    dispatch({ type: NEW_EDITOR_SUCCESS, payload: { key: listKey, request, items: await list() } });
    await pageReload;
  } catch (error) {
    dispatch({
      type: NEW_EDITOR_ERROR,
      payload: { key: listKey, error: apiErrorMessage(error, 'Не удалось обновить список') },
    });
  }
}

/** Выполнить правку и перечитать свойства списка: в таблице должна быть база. */
async function refresh(
  dispatch: Dispatch<ContentEditorNewAction>,
  listKey: string,
  run: () => Promise<unknown>,
  failure: string,
): Promise<string | null> {
  try {
    await run();
    const properties = await fetchInfoblockProperties(listKey);
    dispatch({
      type: NEW_EDITOR_PROPERTIES,
      payload: { key: listKey, properties: properties.map((property) => ({ ...property })) },
    });
    return null;
  } catch (error) {
    return apiErrorMessage(error, failure);
  }
}

/** Откуда копия: кнопкой, перед восстановлением или из файла. */
export type EditorBackupKind = 'manual' | 'before-restore' | 'upload';

/** Резервная копия списка — в списке копий, без самих данных. */
export interface EditorBackup {
  id: number;
  kind: EditorBackupKind;
  note: string;
  recordsCount: number;
  propertiesCount: number;
  /** Размер, байт */
  size: number;
  authorEmail: string;
  createdAt: string;
}

/** Что изменится, если вернуть копию. */
export type EditorBackupCheck = BackupCheckDto;

export type { RestoreBody as EditorRestoreBody };

const toBackup = (dto: BackupDto): EditorBackup => ({
  ...dto,
  kind: dto.kind as EditorBackupKind,
  createdAt: String(dto.createdAt),
});

/**
 * Резервные копии списка. Как и журнал, в стор не кладутся: их видит одна
 * шторка, пока открыта, и читает при каждом показе. Ошибку бросают текстом.
 */
const backupCall = async <T>(run: () => Promise<T>, failure: string): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw new Error(apiErrorMessage(error, failure));
  }
};

export const loadEditorBackupsThunk = (listKey: string) => async (): Promise<EditorBackup[]> =>
  backupCall(async () => (await fetchBackups(listKey)).map(toBackup), 'Не удалось загрузить копии');

export const createEditorBackupThunk =
  (listKey: string, note: string) => async (): Promise<EditorBackup> =>
    backupCall(async () => toBackup(await createBackup(listKey, note)), 'Не удалось создать копию');

export const uploadEditorBackupThunk =
  (listKey: string, note: string, file: Record<string, unknown>) =>
  async (): Promise<EditorBackup> =>
    backupCall(
      async () => toBackup(await uploadBackup(listKey, note, file)),
      'Не удалось загрузить копию',
    );

export const loadEditorBackupFileThunk =
  (listKey: string, id: number) => async (): Promise<Record<string, unknown>> =>
    backupCall(() => fetchBackupFile(listKey, id), 'Не удалось скачать копию');

export const checkEditorBackupThunk =
  (listKey: string, id: number) => async (): Promise<EditorBackupCheck> =>
    backupCall(() => fetchBackupCheck(listKey, id), 'Не удалось проверить копию');

export const removeEditorBackupThunk = (listKey: string, id: number) => async (): Promise<void> =>
  backupCall(() => removeBackup(listKey, id), 'Не удалось удалить копию');

/**
 * Вернуть копию и перечитать всё, что редактор держит о списке: настройки,
 * вкладки, свойства, поля фильтра, страницу и, если грузили, весь список.
 * Возвращает копию того, что было до восстановления.
 */
export const restoreEditorBackupThunk =
  (listKey: string, id: number, body: RestoreBody, list: () => Promise<unknown[]>) =>
  async (
    dispatch: Dispatch<ContentEditorNewAction>,
    getState: GetEditorState,
  ): Promise<EditorBackup> => {
    const before = await backupCall(
      async () => toBackup(await restoreBackup(listKey, id, body)),
      'Не удалось восстановить список',
    );
    dispatch({ type: NEW_EDITOR_RESTORED, payload: { key: listKey } });
    await Promise.all([
      loadEditorSettingsThunk(listKey)(dispatch),
      loadEditorTabsThunk(listKey)(dispatch),
      loadEditorPropertiesThunk(listKey)(dispatch),
      loadEditorFiltersThunk(listKey)(dispatch),
      reloadAfterWrite(dispatch, getState, listKey, list),
    ]);
    return before;
  };
