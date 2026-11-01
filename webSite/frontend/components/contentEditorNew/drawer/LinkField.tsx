import { useMemo } from 'react';
import { TreeSelect } from 'antd';
import { linkTree, useLinkTargets } from '../../../logic/contentLinks';
import type { EditorField } from './record';

/**
 * Поле обеих привязок — к записям и к типу контента: выбор записи другого
 * списка, так пользователю назначают роль. Выбирают из списка, который задан
 * в свойстве (у привязки к типу — всегда типы контента), и грузят только его
 * записи. Значение в черновике — ключ «список/запись»; в привязку его
 * превращает тело запроса (`record.ts`).
 *
 * Деревом: страницы, типы и элементы контента, категории вложены друг в друга,
 * и без родителя «Уникальные описания товаров» не отличить от «SEO». У каждой
 * записи — её ID. Множественность `TreeSelect` умеет сам: полей на значение
 * не нужно — здесь выбирают из готового, а не набирают.
 */
export default function LinkField({
  field,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  /** Запись пишется или её нельзя править — выбор закрыт */
  isLocked: boolean;
  onChange: (value: unknown) => void;
}) {
  const linkList = field.linkList ?? '';
  const { targets, isLoading } = useLinkTargets([linkList]);
  const tree = useMemo(() => linkTree(targets, linkList), [targets, linkList]);

  return (
    <TreeSelect
      value={value as string | string[] | null}
      multiple={field.isMultiple === true}
      treeData={tree}
      treeDefaultExpandAll
      // В выбранном — путь от корня: «Kia / Rio / Седан #23», а не просто «Седан»
      treeNodeLabelProp="label"
      loading={isLoading}
      disabled={isLocked}
      allowClear
      showSearch
      treeNodeFilterProp="title"
      placeholder="Не выбрано"
      notFoundContent={
        isLoading
          ? 'Загружаем записи…'
          : linkList === ''
            ? 'Не задано, откуда брать записи: выберите список в настройках свойства'
            : 'Выбрать пока не из чего'
      }
      style={{ width: '100%' }}
      onChange={(next) => onChange(next ?? null)}
    />
  );
}
