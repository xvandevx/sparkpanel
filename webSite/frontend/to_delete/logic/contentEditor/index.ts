/**
 * Публичный вход редактора контента: таблица, шторка, история.
 * Описание самой формы (поля, группы, значения) — в `logic/editorForm/`;
 * отсюда реэкспортируются только типы, которыми раздел описывает свои поля.
 */
export { useEditorActions } from './useEditorActions';
export { useEditorState } from './useEditorState';
export { useListProperties } from './useListProperties';
export { useListData } from './useListData';
export { NEW_RECORD_ID } from './editorApi';
export type { EditorApi } from './editorApi';
export { ROOT_PATH, rowPath, rowPaths } from './recordPath';
export {
  PATH_FIELD,
  SORT_FIELD,
  STANDARD_FIELD_KEYS,
  STANDARD_LABELS,
  defaultColumns,
  fieldLabels,
  standardFields,
  standardTab,
} from './standardFields';
export {
  POSITION_STEP,
  emptyRecordValues,
  nextPosition,
  recordPayload,
  recordValues,
} from './recordValues';
export { useRecordHistory, useHistoryJournal } from './useEditorHistory';
export type { EditorHistorySource } from './useEditorHistory';
export { useRecordRoute } from './useRecordRoute';
export { listHistory } from './listHistory';
export { HISTORY_TAB_KEY, expandableRowKeys, flattenRows } from './useEditorState';
export { PROPERTIES_TAB_KEY } from './useListProperties';
export type { EditorListSettings } from './useListProperties';
export type { EditorViewMode } from './useEditorState';
export {
  HISTORY_ACTION_COLORS,
  HISTORY_ACTION_LABELS,
  formatDateTime,
  formatHistoryValue,
  historyFieldLabel,
} from './format';
export { EditorColumnVariant, EditorFieldType, EditorRowActionIcon } from './types';
export type {
  ContentEditorController,
  EditorActionsDef,
  EditorColumnDef,
  EditorFieldDef,
  EditorFieldGroup,
  EditorFormDef,
  EditorHistoryAction,
  EditorHistoryChange,
  EditorHistoryDef,
  EditorHistoryPage,
  EditorHistoryRecord,
  EditorListSettingsDef,
  EditorRecord,
  EditorRow,
  EditorRowActionDef,
  EditorSelectOption,
  EditorTabDef,
  EditorValues,
  EditorVariable,
} from './types';
