import { createApiKey, fetchApiKeys, fetchApiLists, fetchApiSpec, removeApiKey } from '../../api/externalApi';
import type { ApiKeyDto, ApiListDto } from '../../src/api/client';
import { apiErrorMessage } from '../apiError';

/** Ключ внешнего API в списке: самого ключа нет — его не хранит и сервер. */
export interface ApiKey {
  id: number;
  name: string;
  /** Последние символы ключа */
  keyTail: string;
  /** null — запросов с ключом ещё не было */
  lastUsedAt: string | null;
  createdAt: string;
  /** Пишет ли ключ; читает он всегда */
  isWritable: boolean;
  /** Куда пишет: ключи списков; null — во все */
  writeLists: string[] | null;
}

/** Что получает новый ключ: права задаются один раз, при создании. */
export interface NewApiKey {
  name: string;
  isWritable: boolean;
  /** null — во все списки */
  writeLists: string[] | null;
}

/** Список внешнего API: куда ключ может писать. */
export type ApiList = ApiListDto;

const toKey = (dto: ApiKeyDto): ApiKey => ({
  ...dto,
  lastUsedAt: dto.lastUsedAt ?? null,
  writeLists: dto.writeLists ?? null,
});

/**
 * Ключи и спецификация в стор не кладутся: их видит один экран и читает при
 * каждом показе, как и копии сайта. Ошибку бросают текстом.
 */
const apiCall = async <T>(run: () => Promise<T>, failure: string): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    throw new Error(apiErrorMessage(error, failure));
  }
};

export const loadApiKeysThunk = () => async (): Promise<ApiKey[]> =>
  apiCall(async () => (await fetchApiKeys()).map(toKey), 'Не удалось загрузить ключи');

/** Новый ключ: в ответе он целиком — показать его можно только сейчас. */
export const createApiKeyThunk = (key: NewApiKey) => async (): Promise<{ key: ApiKey; secret: string }> =>
  apiCall(async () => {
    const created = await createApiKey(key);
    return { key: toKey(created), secret: created.key };
  }, 'Не удалось создать ключ');

export const loadApiListsThunk = () => async (): Promise<ApiList[]> =>
  apiCall(fetchApiLists, 'Не удалось загрузить списки API');

export const removeApiKeyThunk = (id: number) => async (): Promise<void> =>
  apiCall(() => removeApiKey(id), 'Не удалось отозвать ключ');

export const loadApiSpecThunk = () => async (): Promise<Record<string, unknown>> =>
  apiCall(fetchApiSpec, 'Не удалось собрать документацию');
