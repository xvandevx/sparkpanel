/**
 * Что общего у всех списков редактора контента: ключи списков и типы свойств
 * записей. Остальное — форма настроек, поля свойств, дерево — лежит
 * в `to_delete/` и вернётся вместе с разделами.
 */
export { ListKey } from './listKeys';
export { CodeMode, CODE_MODE_OPTIONS, codeModeFlags, codeModeOf } from './codeMode';
export type { CodeModeOption, CodeModeValue } from './codeMode';
export { isTreeDepth } from './treeDepth';
export {
  IMAGE_FORMAT_OPTIONS,
  canChangeType,
  isLinkType,
  isTextType,
  PropertyType,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPE_OPTIONS,
  TABLE_MAX_COLUMNS,
} from './propertyTypes';
export type { PropertyTypeOption } from './propertyTypes';
