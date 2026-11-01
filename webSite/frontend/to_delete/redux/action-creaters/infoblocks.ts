import type { Dispatch } from 'redux';
import * as infoblocksApi from '../../api/infoblocks';
import type {
  CreateInfoblockDto,
  CreateInfoblockElementDto,
  CreateInfoblockSectionDto,
  InfoblockDto,
  InfoblockElementDto,
  InfoblockSectionDto,
  UpdateInfoblockDto,
  UpdateInfoblockElementDto,
  UpdateInfoblockSectionDto,
} from '../../src/api/client';
import { apiErrorMessage } from '../apiError';
import {
  INFOBLOCKS_ERROR,
  INFOBLOCKS_REQUEST,
  INFOBLOCKS_SAVED,
  INFOBLOCKS_SAVING,
  INFOBLOCKS_SUCCESS,
  INFOBLOCK_ELEMENTS_ERROR,
  INFOBLOCK_ELEMENTS_REQUEST,
  INFOBLOCK_ELEMENTS_SUCCESS,
  InfoblocksAction,
} from '../reducers/infoblocksReducer';

/** Thunks — единственное место, откуда вызывается api/. */

/**
 * Номер запроса записей. Их источников два — открытие инфоблока и перечитывание
 * после сохранения, — и без номера опоздавший ответ первого затёр бы результат
 * второго, убрав из списка только что созданную запись.
 */
let elementsRequestSeq = 0;
const nextElementsRequest = (): number => (elementsRequestSeq += 1);

export const fetchStructureThunk = () => async (dispatch: Dispatch<InfoblocksAction>) => {
  dispatch({ type: INFOBLOCKS_REQUEST });
  try {
    dispatch({ type: INFOBLOCKS_SUCCESS, payload: await infoblocksApi.fetchStructure() });
  } catch (error) {
    dispatch({
      type: INFOBLOCKS_ERROR,
      payload: apiErrorMessage(error, 'Не удалось загрузить инфоблоки'),
    });
  }
};

export const fetchElementsThunk =
  (blockId: number) => async (dispatch: Dispatch<InfoblocksAction>) => {
    const request = nextElementsRequest();
    dispatch({ type: INFOBLOCK_ELEMENTS_REQUEST, payload: { blockId, request } });
    try {
      const items = await infoblocksApi.fetchElements(blockId);
      dispatch({ type: INFOBLOCK_ELEMENTS_SUCCESS, payload: { blockId, request, items } });
    } catch (error) {
      dispatch({
        type: INFOBLOCK_ELEMENTS_ERROR,
        payload: {
          blockId,
          request,
          message: apiErrorMessage(error, 'Не удалось загрузить записи инфоблока'),
        },
      });
    }
  };

// ─── Разделы ──────────────────────────────────────────────────────────────────

/**
 * Создание и изменение — один thunk: форма раздела одна и та же, отличается
 * только наличием идентификатора. Возвращает сохранённый раздел или null.
 */
export const saveSectionThunk =
  (id: number | null, dto: CreateInfoblockSectionDto | UpdateInfoblockSectionDto) =>
  async (dispatch: Dispatch<InfoblocksAction>): Promise<InfoblockSectionDto | null> => {
    dispatch({ type: INFOBLOCKS_SAVING });
    try {
      const section = id
        ? await infoblocksApi.updateSection(id, dto as UpdateInfoblockSectionDto)
        : await infoblocksApi.createSection(dto as CreateInfoblockSectionDto);
      dispatch({ type: INFOBLOCKS_SAVED });
      // Перечитываем структуру целиком: создание меняет и порядок соседей
      dispatch({ type: INFOBLOCKS_SUCCESS, payload: await infoblocksApi.fetchStructure() });
      return section;
    } catch (error) {
      dispatch({
        type: INFOBLOCKS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить раздел'),
      });
      return null;
    }
  };

/** Удаляет раздел со всеми инфоблоками; возвращает, сколько записей ушло. */
export const removeSectionThunk =
  (id: number) =>
  async (dispatch: Dispatch<InfoblocksAction>): Promise<boolean> => {
    dispatch({ type: INFOBLOCKS_SAVING });
    try {
      await infoblocksApi.removeSection(id);
      dispatch({ type: INFOBLOCKS_SAVED });
      dispatch({ type: INFOBLOCKS_SUCCESS, payload: await infoblocksApi.fetchStructure() });
      return true;
    } catch (error) {
      dispatch({
        type: INFOBLOCKS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить раздел'),
      });
      return false;
    }
  };

// ─── Инфоблоки ────────────────────────────────────────────────────────────────

export const saveBlockThunk =
  (id: number | null, dto: CreateInfoblockDto | UpdateInfoblockDto) =>
  async (dispatch: Dispatch<InfoblocksAction>): Promise<InfoblockDto | null> => {
    dispatch({ type: INFOBLOCKS_SAVING });
    try {
      const block = id
        ? await infoblocksApi.updateBlock(id, dto as UpdateInfoblockDto)
        : await infoblocksApi.createBlock(dto as CreateInfoblockDto);
      dispatch({ type: INFOBLOCKS_SAVED });
      dispatch({ type: INFOBLOCKS_SUCCESS, payload: await infoblocksApi.fetchStructure() });
      return block;
    } catch (error) {
      dispatch({
        type: INFOBLOCKS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось сохранить инфоблок'),
      });
      return null;
    }
  };

/** Удаляет инфоблок со всеми его элементами. */
export const removeBlockThunk =
  (id: number) =>
  async (dispatch: Dispatch<InfoblocksAction>): Promise<boolean> => {
    dispatch({ type: INFOBLOCKS_SAVING });
    try {
      await infoblocksApi.removeBlock(id);
      dispatch({ type: INFOBLOCKS_SAVED });
      dispatch({ type: INFOBLOCKS_SUCCESS, payload: await infoblocksApi.fetchStructure() });
      return true;
    } catch (error) {
      dispatch({
        type: INFOBLOCKS_ERROR,
        payload: apiErrorMessage(error, 'Не удалось удалить инфоблок'),
      });
      return false;
    }
  };

// ─── Элементы ─────────────────────────────────────────────────────────────────

/**
 * Сохранение элемента. Кроме списка элементов перечитывается и структура:
 * в левой панели у инфоблока показано число записей, и после создания
 * или удаления оно меняется.
 */
export const saveElementThunk =
  (
    blockId: number,
    id: number | null,
    dto: CreateInfoblockElementDto | UpdateInfoblockElementDto,
  ) =>
  async (dispatch: Dispatch<InfoblocksAction>): Promise<InfoblockElementDto | null> => {
    dispatch({ type: INFOBLOCKS_SAVING });
    // Номер выдаём заранее и используем один на всю операцию: с новым номером
    // на ошибке она не смогла бы устареть и всплыла бы уже на чужом списке
    const request = nextElementsRequest();
    try {
      const element = id
        ? await infoblocksApi.updateElement(blockId, id, dto as UpdateInfoblockElementDto)
        : await infoblocksApi.createElement(blockId, dto as CreateInfoblockElementDto);
      dispatch({ type: INFOBLOCKS_SAVED });

      const [items, sections] = await Promise.all([
        infoblocksApi.fetchElements(blockId),
        id ? Promise.resolve(null) : infoblocksApi.fetchStructure(),
      ]);
      dispatch({ type: INFOBLOCK_ELEMENTS_SUCCESS, payload: { blockId, request, items } });
      if (sections) dispatch({ type: INFOBLOCKS_SUCCESS, payload: sections });

      return element;
    } catch (error) {
      dispatch({
        type: INFOBLOCK_ELEMENTS_ERROR,
        payload: {
          blockId,
          request,
          message: apiErrorMessage(error, 'Не удалось сохранить запись'),
        },
      });
      return null;
    }
  };

export const removeElementThunk =
  (blockId: number, id: number) =>
  async (dispatch: Dispatch<InfoblocksAction>): Promise<boolean> => {
    dispatch({ type: INFOBLOCKS_SAVING });
    const request = nextElementsRequest();
    try {
      await infoblocksApi.removeElement(blockId, id);
      dispatch({ type: INFOBLOCKS_SAVED });

      const [items, sections] = await Promise.all([
        infoblocksApi.fetchElements(blockId),
        infoblocksApi.fetchStructure(),
      ]);
      dispatch({ type: INFOBLOCK_ELEMENTS_SUCCESS, payload: { blockId, request, items } });
      dispatch({ type: INFOBLOCKS_SUCCESS, payload: sections });

      return true;
    } catch (error) {
      dispatch({
        type: INFOBLOCK_ELEMENTS_ERROR,
        payload: {
          blockId,
          request,
          message: apiErrorMessage(error, 'Не удалось удалить запись'),
        },
      });
      return false;
    }
  };

// ─── Журнал ───────────────────────────────────────────────────────────────────

/**
 * История читается только на время открытой шторки и в общий стейт не кладётся —
 * но запрос всё равно уходит отсюда: api/ дергается только из thunks.
 */
export const loadInfoblockHistoryThunk = (entityId: string) => () =>
  infoblocksApi.fetchRecordHistory(entityId);

export const loadInfoblocksJournalThunk =
  (limit: number, offset: number) => () =>
    infoblocksApi.fetchJournal(limit, offset);
