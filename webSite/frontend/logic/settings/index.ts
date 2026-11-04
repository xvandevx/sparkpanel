/**
 * Настройки сайта: название, хранилище для новых файлов и логотип панели
 * (`useBrand` — им подписаны меню и экран входа). Данные — из стора,
 * черновик формы живёт в самой форме, на сервер уходит только изменённое.
 * Внешние хранилища и домены — списки редактора контента: здесь их Api
 * и варианты выбора хранилища.
 */
export { useSettings, useSettingsActions } from './useSettings';
export { useBrand } from './useBrand';
export { LOGO_ACCEPT, logoFileProblem, readLogo } from './logoFile';
export { changesOf, draftOf } from './settingsDraft';
export type { SettingsDraft } from './settingsDraft';
export { domainsApi } from './domainsApi';
export { storagesApi } from './storagesApi';
export { BUILTIN_STORAGE, useStorageOptions } from './useStorageOptions';
