import { createApiKey, fetchApiKeys, fetchApiSpec, removeApiKey } from '../../api/externalApi';
import type { ApiKeyDto } from '../../src/api/client';
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
}

const toKey = (dto: ApiKeyDto): ApiKey => ({ ...dto, lastUsedAt: dto.lastUsedAt ?? null });

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
export const createApiKeyThunk = (name: string) => async (): Promise<{ key: ApiKey; secret: string }> =>
  apiCall(async () => {
    const created = await createApiKey(name);
    return { key: toKey(created), secret: created.key };
  }, 'Не удалось создать ключ');

export const removeApiKeyThunk = (id: number) => async (): Promise<void> =>
  apiCall(() => removeApiKey(id), 'Не удалось отозвать ключ');

export const loadApiSpecThunk = () => async (): Promise<Record<string, unknown>> =>
  apiCall(fetchApiSpec, 'Не удалось собрать документацию');
