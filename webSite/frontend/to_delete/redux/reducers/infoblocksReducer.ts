import type { InfoblockElementDto, InfoblockSectionDto } from '../../src/api/client';

export const INFOBLOCKS_REQUEST = 'INFOBLOCKS_REQUEST';
export const INFOBLOCKS_SUCCESS = 'INFOBLOCKS_SUCCESS';
export const INFOBLOCKS_ERROR = 'INFOBLOCKS_ERROR';
export const INFOBLOCKS_SAVING = 'INFOBLOCKS_SAVING';
export const INFOBLOCKS_SAVED = 'INFOBLOCKS_SAVED';
export const INFOBLOCK_ELEMENTS_REQUEST = 'INFOBLOCK_ELEMENTS_REQUEST';
export const INFOBLOCK_ELEMENTS_SUCCESS = 'INFOBLOCK_ELEMENTS_SUCCESS';
export const INFOBLOCK_ELEMENTS_ERROR = 'INFOBLOCK_ELEMENTS_ERROR';

export interface InfoblocksState {
  /** Структура: разделы вместе со своими инфоблоками */
  sections: InfoblockSectionDto[];
  /** Записи инфоблока, чей номер лежит в `elementsBlockId` */
  elements: InfoblockElementDto[];
  /**
   * Чьи записи сейчас в `elements`. Ставится только по успешному ответу:
   * пока он не пришёл, показывать нечего, а не «чужое».
   */
  elementsBlockId: number | null;
  /**
   * Номер последнего запроса записей. Ответ с меньшим номером — опоздавший
   * и в стор не попадает: иначе список после сохранения мог бы вернуться
   * к состоянию до него.
   */
  elementsRequest: number;
  /** Идёт загрузка структуры */
  loading: boolean;
  /** Идёт загрузка записей */
  loadingElements: boolean;
  /** Идёт сохранение или удаление — любой из трёх сущностей */
  saving: boolean;
  /** Структуру уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  /** Ошибка операций со структурой: её показывает экран разделов */
  error: string | null;
  /** Ошибка операций с записями: её показывает экран записей */
  elementsError: string | null;
}

const initialState: InfoblocksState = {
  sections: [],
  elements: [],
  elementsBlockId: null,
  elementsRequest: 0,
  loading: false,
  loadingElements: false,
  saving: false,
  loaded: false,
  error: null,
  elementsError: null,
};

export type InfoblocksAction =
  | { type: typeof INFOBLOCKS_REQUEST }
  | { type: typeof INFOBLOCKS_SUCCESS; payload: InfoblockSectionDto[] }
  | { type: typeof INFOBLOCKS_ERROR; payload: string }
  | { type: typeof INFOBLOCKS_SAVING }
  | { type: typeof INFOBLOCKS_SAVED }
  | {
      type: typeof INFOBLOCK_ELEMENTS_REQUEST;
      payload: { blockId: number; request: number };
    }
  | {
      type: typeof INFOBLOCK_ELEMENTS_SUCCESS;
      payload: { blockId: number; request: number; items: InfoblockElementDto[] };
    }
  | {
      type: typeof INFOBLOCK_ELEMENTS_ERROR;
      payload: { blockId: number; request: number; message: string };
    };

/**
 * Опоздавший ответ: пока он шёл, успели запросить что-то ещё.
 * Сравнение нестрогое — номер продвигают и ответы, а не только запросы:
 * сохранение перечитывает список своим номером, не объявляя запроса.
 */
const isStale = (state: InfoblocksState, request: number): boolean =>
  request < state.elementsRequest;

export const infoblocksReducer = (
  state = initialState,
  action: InfoblocksAction,
): InfoblocksState => {
  switch (action.type) {
    case INFOBLOCKS_REQUEST:
      return { ...state, loading: true, error: null };
    case INFOBLOCKS_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, sections: action.payload };
    case INFOBLOCKS_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case INFOBLOCKS_SAVING:
      return { ...state, saving: true, error: null, elementsError: null };
    case INFOBLOCKS_SAVED:
      return { ...state, saving: false };

    case INFOBLOCK_ELEMENTS_REQUEST:
      return {
        ...state,
        loadingElements: true,
        elementsError: null,
        elementsRequest: action.payload.request,
      };

    case INFOBLOCK_ELEMENTS_SUCCESS:
      if (isStale(state, action.payload.request)) return state;
      return {
        ...state,
        loadingElements: false,
        elementsError: null,
        elementsBlockId: action.payload.blockId,
        elements: action.payload.items,
        // Номер двигаем и здесь: иначе ответ перечитывания после сохранения
        // не поднимал бы планку, и опоздавшая первая загрузка затёрла бы его
        elementsRequest: action.payload.request,
      };

    case INFOBLOCK_ELEMENTS_ERROR:
      if (isStale(state, action.payload.request)) return state;
      return {
        ...state,
        loadingElements: false,
        saving: false,
        elementsError: action.payload.message,
        elementsRequest: action.payload.request,
      };

    default:
      return state;
  }
};
