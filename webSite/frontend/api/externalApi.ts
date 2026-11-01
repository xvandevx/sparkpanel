import { api, ApiKeyDto, ApiListDto, CreateApiKeyDto, CreatedApiKeyDto } from '../src/api/client';

/**
 * Внешнее API глазами панели (`/api/external-api`): ключи доступа
 * и спецификация для встроенной документации. Только маршруты — что
 * отдавать сайту, решает сервер.
 */

export const fetchApiKeys = async (): Promise<ApiKeyDto[]> => {
  const { data } = await api.externalApi.apiKeysControllerFindKeys();
  return data;
};

/** Ответ — единственный раз, когда ключ виден целиком. */
export const createApiKey = async (dto: CreateApiKeyDto): Promise<CreatedApiKeyDto> => {
  const { data } = await api.externalApi.apiKeysControllerCreateKey(dto);
  return data;
};

/** Списки внешнего API — куда ключ может писать. */
export const fetchApiLists = async (): Promise<ApiListDto[]> => {
  const { data } = await api.externalApi.apiKeysControllerLists();
  return data;
};

export const removeApiKey = async (id: number): Promise<void> => {
  await api.externalApi.apiKeysControllerRemoveKey(id);
};

/** OpenAPI-спецификация, собранная сервером из настроек списков. */
export const fetchApiSpec = async (): Promise<Record<string, unknown>> => {
  const { data } = await api.externalApi.apiKeysControllerSpec();
  return data;
};
