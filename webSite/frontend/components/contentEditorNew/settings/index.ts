/**
 * Настройки списка: само окно, вкладки карточки записи и свойства записей.
 * Раздел подключает только `ContentEditorSettings`.
 */
export { default as ContentEditorSettings } from './ContentEditorSettings';
export { effectiveSettings, recordRules } from './blockedSettings';
export type { BlockedSettings } from './blockedSettings';
