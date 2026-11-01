import { api, CreateDomainDto, DomainDto, UpdateDomainDto } from '../src/api/client';

/**
 * Сетевой слой доменов сайта (`/api/infoblocks/domains` — дерево редактора
 * контента). Единственное место, где дергается сгенерированный клиент.
 */

/** Плоский список: дерево «домен → поддомены» собирает редактор по parentId; у каждого — полный `address`. */
export const fetchDomains = async (): Promise<DomainDto[]> => {
  const { data } = await api.infoblockDomains.domainsControllerFindAll();
  return data;
};

/** У поддомена — только его имя (`ekb`): адрес `ekb.farkop.ru` сервер сложит сам. */
export const createDomain = async (dto: CreateDomainDto): Promise<DomainDto> => {
  const { data } = await api.infoblockDomains.domainsControllerCreate(dto);
  return data;
};

/** Переименовали домен — адреса его поддоменов поменяются сами: их имена не трогаются. */
export const updateDomain = async (id: number, dto: UpdateDomainDto): Promise<DomainDto> => {
  const { data } = await api.infoblockDomains.domainsControllerUpdate(id, dto);
  return data;
};

/** Удаляет домен без поддоменов: с ними сервер не отдаст (409). */
export const removeDomain = async (id: number): Promise<void> => {
  await api.infoblockDomains.domainsControllerRemove(id);
};
