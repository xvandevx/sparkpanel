/**
 * Внешнее API: ключи доступа и документация, собранная сервером из настроек
 * списков. Экран — `components/settings/api/`; видит его только главный
 * администратор.
 */
export { useApiKeys } from './useApiKeys';
export { useApiDocs } from './useApiDocs';
export { useApiAddress } from './useApiAddress';
export { lastUsedText, maskedKey, validateKeyName } from './apiFormat';
export type { ApiKey } from '../../redux/action-creaters/externalApi';
