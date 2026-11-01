import type { EditorDraft } from '../../../redux/reducers/contentEditorNewReducer';
import { fieldValuesOf } from '../drawer/propertyFields';
import type { EditorRow } from '../table/ContentEditorTable';

/**
 * Запись глазами черновика: опубликованное, поверх — изменённое в черновике.
 * Номер записи черновик не меняет. Родителя — меняет только в карточке
 * (`isParentShown`): дерево таблицы строится по опубликованному, и запись,
 * перенесённая в черновике, переедет в другую ветку с публикацией.
 */
export const draftedRow = (
  row: EditorRow,
  draft: EditorDraft | null | undefined,
  { isParentShown }: { isParentShown: boolean },
): EditorRow => {
  if (!draft) return row;
  const fields = Object.entries(draft.fields).filter(
    ([key]) => key !== 'id' && (isParentShown || key !== 'parentId'),
  );
  const drafted: EditorRow = { ...row, ...Object.fromEntries(fields), id: row.id };
  // Родитель у редактора — ключ строкой, как и в строках таблицы
  if (isParentShown && 'parentId' in draft.fields) {
    drafted.parentId = draft.fields.parentId === null ? null : String(draft.fields.parentId);
  }
  return drafted;
};

/** Значения свойств записи с черновиком поверх: номер свойства → значение. */
export const draftedValues = (
  values: Record<string, unknown>,
  draft: EditorDraft | null | undefined,
): Record<string, unknown> => (draft ? { ...values, ...draft.values } : values);

/**
 * Поля карточки, которые черновик меняет: свои ключи записи и ключи свойств
 * (`property-<номер>`). По ним в карточке ставится отметка у поля и у вкладки.
 */
export const draftedKeys = (draft: EditorDraft | null | undefined): Set<string> =>
  new Set(draft ? [...Object.keys(draft.fields), ...Object.keys(fieldValuesOf(draft.values))] : []);

/** Изменённые свойства — как их ждёт черновик на сервере: номер и значение. */
export const draftValueItems = (values: Record<string, unknown>): { propertyId: number; value: unknown }[] =>
  Object.entries(values).map(([propertyId, value]) => ({ propertyId: Number(propertyId), value }));
