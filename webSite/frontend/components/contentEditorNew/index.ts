/**
 * Публичный вход нового редактора контента. Раздел подключает только
 * `ContentEditor` и отдаёт ему код списка, Api, настройки и колонки.
 * Внутренняя раскладка (table / drawer / history / settings) — деталь
 * реализации и меняется, не затрагивая экраны разделов.
 */
export { default as ContentEditor } from './ContentEditor';
export { standardColumns } from './table';
export { FieldType, standardFields } from './drawer';
export type { EditorField, EditorFields } from './drawer';
export type {
  EditorCellLink,
  EditorColumn,
  EditorColumns,
  EditorRow,
  EditorSettings,
} from './table';
export type { EditorListApi } from './useLoadEditor';
export type { BlockedSettings } from './settings';
