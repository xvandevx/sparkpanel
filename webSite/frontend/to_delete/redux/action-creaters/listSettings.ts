import type { Dispatch } from 'redux';
import * as listSettingsApi from '../../api/listSettings';
import type { PropertyValuesDto, UpdateListSettingsDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  LIST_SETTINGS_ERROR,
  LIST_SETTINGS_REQUEST,
  LIST_SETTINGS_SAVE_FAILED,
  LIST_SETTINGS_SAVED,
  LIST_SETTINGS_SAVING,
  LIST_SETTINGS_SUCCESS,
  LINK_SOURCES_SUCCESS,
  LINK_TARGETS_SUCCESS,
  ListPropertyValues,
  ListRecordParents,
  ListSettingsAction,
  PROPERTY_VALUES_REMOVED,
  PROPERTY_VALUES_SAVE_FAILED,
  PROPERTY_VALUES_SAVED,
  PROPERTY_VALUES_SAVING,
} from '../reducers/listSettingsReducer';

/** Thunks — единственное место, откуда вызывается api/. */

const toValuesMap = (rows: PropertyValuesDto[]): ListPropertyValues =>
  Object.fromEntries(rows.map((row) => [row.recordId, row.values]));

const toParentsMap = (rows: PropertyValuesDto[]): ListRecordParents =>
  Object.fromEntries(rows.map((row) => [row.recordId, row.parentId ?? null]));

/** Настройки списка и значения свойств его записей — одним заходом. */
export const fetchListSettingsThunk =
  (listKey: string) => async (dispatch: Dispatch<ListSettingsAction>) => {
    dispatch({ type: LIST_SETTINGS_REQUEST, payload: { listKey } });
    try {
      const [settings, values] = await Promise.all([
        listSettingsApi.fetchListSettings(listKey),
        listSettingsApi.fetchPropertyValues(listKey),
      ]);
      dispatch({
        type: LIST_SETTINGS_SUCCESS,
        payload: { listKey, settings, values: toValuesMap(values), parents: toParentsMap(values) },
      });
    } catch (error) {
      dispatch({
        type: LIST_SETTINGS_ERROR,
        payload: { listKey, error: apiErrorMessage(error, 'Не удалось загрузить настройки списка') },
      });
    }
  };

/**
 * Сохранение настроек. Значения записей перечитываются следом: сервер стирает
 * значения удалённых свойств и читает остальные уже по новым настройкам.
 * Возвращает текст ошибки или null — окно настроек покажет его само.
 */
export const saveListSettingsThunk =
  (listKey: string, dto: UpdateListSettingsDto) =>
  async (dispatch: Dispatch<ListSettingsAction>): Promise<string | null> => {
    dispatch({ type: LIST_SETTINGS_SAVING });
    try {
      const settings = await listSettingsApi.saveListSettings(listKey, dto);
      dispatch({ type: LIST_SETTINGS_SAVED, payload: { listKey, settings } });
      const values = await listSettingsApi.fetchPropertyValues(listKey);
      dispatch({
        type: LIST_SETTINGS_SUCCESS,
        payload: { listKey, settings, values: toValuesMap(values), parents: toParentsMap(values) },
      });
      return null;
    } catch (error) {
      dispatch({ type: LIST_SETTINGS_SAVE_FAILED });
      return apiErrorMessage(error, 'Не удалось сохранить настройки списка');
    }
  };

/** Значения свойств записи и её родитель; возвращает текст ошибки или null. */
export const savePropertyValuesThunk =
  (listKey: string, recordId: string, values: Record<string, unknown>, parentId: string | null) =>
  async (dispatch: Dispatch<ListSettingsAction>): Promise<string | null> => {
    dispatch({ type: PROPERTY_VALUES_SAVING });
    try {
      const saved = await listSettingsApi.savePropertyValues(listKey, recordId, values, parentId);
      dispatch({
        type: PROPERTY_VALUES_SAVED,
        payload: { listKey, recordId, values: saved.values, parentId: saved.parentId ?? null },
      });
      return null;
    } catch (error) {
      dispatch({ type: PROPERTY_VALUES_SAVE_FAILED });
      return apiErrorMessage(error, 'Не удалось сохранить свойства записи');
    }
  };

/**
 * Значения удалённых записей. Уборка, а не часть удаления: запись уже удалена
 * своим разделом, и провал здесь оставит лишь строку, которую никто не прочтёт.
 * У дерева сервер заодно поднимает вложенные записи к родителю удалённой —
 * поэтому список перечитывается целиком.
 */
export const removePropertyValuesThunk =
  (listKey: string, recordIds: string[]) => async (dispatch: Dispatch<ListSettingsAction>) => {
    if (recordIds.length === 0) return;
    try {
      await listSettingsApi.removePropertyValues(listKey, recordIds);
      dispatch({ type: PROPERTY_VALUES_REMOVED, payload: { listKey, recordIds } });
      const [settings, values] = await Promise.all([
        listSettingsApi.fetchListSettings(listKey),
        listSettingsApi.fetchPropertyValues(listKey),
      ]);
      dispatch({
        type: LIST_SETTINGS_SUCCESS,
        payload: { listKey, settings, values: toValuesMap(values), parents: toParentsMap(values) },
      });
    } catch {
      // Номера записей не переиспользуются: чужим значение не достанется
    }
  };

/** Списки-источники привязки: нужны окну настроек свойства, а не карточке записи. */
export const fetchLinkSourcesThunk = () => async (dispatch: Dispatch<ListSettingsAction>) => {
  try {
    dispatch({ type: LINK_SOURCES_SUCCESS, payload: await listSettingsApi.fetchLinkSources() });
  } catch {
    // Без списка останется «Любая запись» — настроить свойство это не мешает
  }
};

/** Записи для «Привязки к контенту» — свежие на каждый заход в список: контент правят везде. */
export const fetchLinkTargetsThunk = () => async (dispatch: Dispatch<ListSettingsAction>) => {
  try {
    dispatch({ type: LINK_TARGETS_SUCCESS, payload: await listSettingsApi.fetchLinkTargets() });
  } catch {
    // Без списка поле останется пустым — сохранению записи это не мешает
  }
};
