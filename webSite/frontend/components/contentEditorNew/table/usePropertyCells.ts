import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../redux';
import type { EditorDraft, EditorProperty } from '../../../redux/reducers/contentEditorNewReducer';
import { linkListOf, linkPaths, useLinkTargets } from '../../../logic/contentLinks';
import { useFiles } from '../../../logic/files';
import { PropertyType } from '../../../logic/listSettings';
import type { TableColumn } from './columns';
import { draftedValues } from '../drafts/draftView';
import { propertyValue, type PropertyCellContent } from './propertyValue';

/** Ячейки без значений: у списка, значения которого ещё не пришли. */
const NO_VALUES = {};
const NO_DRAFTS: Record<string, EditorDraft | null> = {};

/**
 * Ячейки колонок-свойств: значение записи из ячейки списка, а файлы
 * и названия привязок — из их общих источников. Файлы и записи для
 * привязок читаются, только если такая колонка видна: иначе каждая
 * таблица тянула бы всю медиатеку и все записи панели.
 */
export function usePropertyCells(listKey: string, shown: TableColumn[]) {
  const values = useSelector(
    (state: RootState) => state.contentEditorNew[listKey]?.values ?? NO_VALUES,
  ) as Record<string, Record<string, unknown>>;
  // Значение из черновика — поверх опубликованного: в ячейке то, что в карточке
  const drafts = useSelector((state: RootState) => state.contentEditorNew[listKey]?.drafts ?? NO_DRAFTS);

  const types = new Set(shown.map((item) => item.property?.type));
  const { fileById } = useFiles(types.has(PropertyType.File) || types.has(PropertyType.Image));
  // Названия привязок — только из списков видимых колонок-привязок
  const { targets } = useLinkTargets(
    shown.flatMap((item) => (item.property ? [linkListOf(item.property)] : [])),
  );

  // Название — путём от корня: «Kia / Rio / Седан», иначе два «Седана» в ячейке неотличимы
  const linkNames = useMemo(() => linkPaths(targets), [targets]);

  /** Что показать в ячейке свойства у записи. */
  return useCallback(
    (property: EditorProperty, recordId: string): PropertyCellContent =>
      propertyValue(
        property,
        draftedValues(values[recordId] ?? {}, drafts[recordId])[String(property.id)],
        { fileById, linkNames },
      ),
    [drafts, fileById, linkNames, values],
  );
}
