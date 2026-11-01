/**
 * Настройки сайта: название и хранилище для новых файлов. Данные — из стора,
 * черновик формы живёт в самой форме, на сервер уходит только изменённое.
 * Внешние хранилища и домены — списки редактора контента: здесь их Api
 * и варианты выбора хранилища.
 */
export { useSettings, useSettingsActions } from './useSettings';
export { changesOf, draftOf } from './settingsDraft';
export type { SettingsDraft } from './settingsDraft';
export { domainsApi } from './domainsApi';
export { storagesApi } from './storagesApi';
export { BUILTIN_STORAGE, useStorageOptions } from './useStorageOptions';
