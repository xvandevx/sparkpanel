import type { DomainDto } from '../../src/api/client';

export const DOMAINS_REQUEST = 'DOMAINS_REQUEST';
export const DOMAINS_SUCCESS = 'DOMAINS_SUCCESS';
export const DOMAINS_ERROR = 'DOMAINS_ERROR';
export const DOMAINS_SAVING = 'DOMAINS_SAVING';
export const DOMAINS_SAVED = 'DOMAINS_SAVED';

export interface DomainsState {
  /** Плоский список доменов; основной приходит первым */
  items: DomainDto[];
  /** Идёт загрузка списка */
  loading: boolean;
  /** Идёт сохранение или удаление */
  saving: boolean;
  /** Список уже загружали — чтобы не дёргать запрос повторно при перерисовке */
  loaded: boolean;
  error: string | null;
}

const initialState: DomainsState = {
  items: [],
  loading: false,
  saving: false,
  loaded: false,
  error: null,
};

export type DomainsAction =
  | { type: typeof DOMAINS_REQUEST }
  | { type: typeof DOMAINS_SUCCESS; payload: DomainDto[] }
  | { type: typeof DOMAINS_ERROR; payload: string }
  | { type: typeof DOMAINS_SAVING }
  | { type: typeof DOMAINS_SAVED };

export const domainsReducer = (state = initialState, action: DomainsAction): DomainsState => {
  switch (action.type) {
    case DOMAINS_REQUEST:
      return { ...state, loading: true, error: null };
    case DOMAINS_SUCCESS:
      return { ...state, loading: false, loaded: true, error: null, items: action.payload };
    case DOMAINS_ERROR:
      return { ...state, loading: false, saving: false, error: action.payload };
    case DOMAINS_SAVING:
      return { ...state, saving: true, error: null };
    case DOMAINS_SAVED:
      return { ...state, saving: false };
    default:
      return state;
  }
};
