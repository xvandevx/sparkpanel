import { createDomain, fetchDomains, removeDomain, updateDomain } from '../../api/domains';
import type { CreateDomainDto, UpdateDomainDto } from '../../src/api/client';

/**
 * Где лежат домены сайта. Всё, что настройки рассказывают редактору контента
 * о данных: загрузку, перечитывание и ошибки ведёт сам редактор.
 *
 * `parentId` переписываем, только если карточка его присылала: `null` в теле —
 * осознанный вынос в корень, а отсутствие ключа — «поле не трогали».
 */
const toDomainPayload = (payload: Record<string, unknown>) => ({
  ...payload,
  ...(payload.parentId === undefined ? {} : { parentId: toDomainId(payload.parentId) }),
});

/** Ключ записи у редактора строковый; в базе домен адресуется числом. */
const toDomainId = (value: unknown): number | null => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const domainsApi = {
  list: fetchDomains,
  create: (payload: Record<string, unknown>) =>
    createDomain(toDomainPayload(payload) as unknown as CreateDomainDto),
  update: (id: string, payload: Record<string, unknown>) =>
    updateDomain(Number(id), toDomainPayload(payload) as UpdateDomainDto),
  remove: (id: string) => removeDomain(Number(id)),
};
