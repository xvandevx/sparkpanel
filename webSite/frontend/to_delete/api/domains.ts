import {
  api,
  CreateDomainDto,
  DomainDto,
  HistoryPageDto,
  HistoryRecordDto,
  UpdateDomainDto,
} from '../src/api/client';

/**
 * Сетевой слой доменов сайта. Единственное место, где дергается
 * сгенерированный клиент; выше по стеку сюда ходят только thunks из redux/.
 */

/** Плоский список: основной домен приходит первым. */
export const fetchDomains = async (): Promise<DomainDto[]> => {
  const { data } = await api.domains.domainsControllerFindAll();
  return data;
};

export const createDomain = async (dto: CreateDomainDto): Promise<DomainDto> => {
  const { data } = await api.domains.domainsControllerCreate(dto);
  return data;
};

export const updateDomain = async (id: number, dto: UpdateDomainDto): Promise<DomainDto> => {
  const { data } = await api.domains.domainsControllerUpdate(id, dto);
  return data;
};

export const removeDomain = async (id: number): Promise<void> => {
  await api.domains.domainsControllerRemove(id);
};

export const fetchDomainHistory = async (id: number): Promise<HistoryRecordDto[]> => {
  const { data } = await api.domains.domainsControllerFindHistory(id);
  return data;
};

/** Общий журнал изменений доменов, страницами. */
export const fetchDomainsJournal = async (
  limit: number,
  offset: number,
): Promise<HistoryPageDto> => {
  const { data } = await api.domains.domainsControllerFindJournal(limit, offset);
  return data;
};
