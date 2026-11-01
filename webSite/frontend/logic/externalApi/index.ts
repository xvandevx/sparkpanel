/**
 * Внешнее API: ключи доступа и документация, собранная сервером из настроек
 * списков. Экран — `components/settings/api/`; видит его только главный
 * администратор.
 */
export { useApiKeys } from './useApiKeys';
export { useApiDocs } from './useApiDocs';
export { useApiAddress } from './useApiAddress';
export {
  keyRightsText,
  lastUsedText,
  maskedKey,
  newApiKeyOf,
  validateKeyName,
  validateWriteLists,
  writeListGroups,
  type KeyForm,
} from './apiFormat';
export type { ApiKey, ApiList, NewApiKey } from '../../redux/action-creaters/externalApi';
