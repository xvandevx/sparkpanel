import { EditorFieldType, type EditorFieldDef, type EditorValues } from '../editorForm';
import { parentChoices } from '../listSettings';
import { ROOT_PATH, rowPath } from './recordPath';
import {
  EditorColumnVariant,
  type EditorColumnDef,
  type EditorRow,
  type EditorTabDef,
} from './types';

/**
 * Стандартные поля записи — те, что есть у любого списка панели: название, код,
 * активность, порядок, родитель и адрес. Редактор знает их сам, поэтому раздел
 * не описывает ни колонки под них, ни сборку адреса.
 *
 * Чистые функции: ни React, ни сети.
 */

export const PATH_FIELD = 'path';

/**
 * Стандартные подписи — те же у любого раздела. Раздел перечисляет в `labels`
 * только свои поля и то, что хочет назвать иначе («Код страницы» вместо «Код»).
 *
 * `title` — заголовок над таблицей (имя из настроек списка его перекрывает),
 * `add` — подпись кнопки добавления.
 */
export const STANDARD_LABELS: Record<string, string> = {
  // Заголовок списка и кнопка добавления — такие же подписи, как у полей
  title: 'Записи',
  add: 'Добавить запись',
  id: 'Идентификатор',
  name: 'Название',
  code: 'Код',
  path: 'Адрес',
  parentId: 'Родитель',
  sort: 'Сортировка',
  isActive: 'Активна',
};

/** Подписи полей: стандартные плюс то, что раздел назвал по-своему. */
export const fieldLabels = (labels: Record<string, string> = {}): Record<string, string> => ({
  ...STANDARD_LABELS,
  ...labels,
});
export const SORT_FIELD = 'sort';
const ID_FIELD = 'id';
const NAME_FIELD = 'name';
const CODE_FIELD = 'code';
const PARENT_FIELD = 'parentId';
const ACTIVE_FIELD = 'isActive';

/** Стандартные поля карточки; порядок здесь — порядок в карточке. */
export const STANDARD_FIELD_KEYS = [
  ID_FIELD,
  NAME_FIELD,
  CODE_FIELD,
  PATH_FIELD,
  PARENT_FIELD,
  SORT_FIELD,
  ACTIVE_FIELD,
];

/**
 * Колонки таблицы по умолчанию. Берутся только те стандартные поля, которые
 * у раздела есть: у плоского списка нет адреса, у кого-то нет порядка.
 * Раздел может задать свои колонки — тогда эти не применяются.
 */
export function defaultColumns(
  fields: EditorFieldDef[],
  isNested: boolean,
  labels: Record<string, string>,
): EditorColumnDef[] {
  const has = (key: string): boolean => fields.some((field) => field.key === key);
  const columns: EditorColumnDef[] = [];

  if (has(NAME_FIELD)) {
    columns.push({ key: NAME_FIELD, title: labels[NAME_FIELD], dataIndex: NAME_FIELD, width: 320 });
  }
  if (has(CODE_FIELD)) {
    columns.push({
      key: CODE_FIELD,
      title: labels[CODE_FIELD],
      width: 200,
      variant: EditorColumnVariant.Code,
      // У записи в корне кода может не быть — прочерк честнее пустой ячейки
      value: (record) => String(record.code || '—'),
    });
  }
  if (isNested) {
    columns.push({
      key: PATH_FIELD,
      title: labels[PATH_FIELD],
      width: 240,
      variant: EditorColumnVariant.Code,
      value: (record) => String(record.path ?? ROOT_PATH),
    });
  }
  if (has(SORT_FIELD)) {
    columns.push({
      key: SORT_FIELD,
      title: labels[SORT_FIELD],
      dataIndex: SORT_FIELD,
      width: 120,
    });
  }
  if (has(ACTIVE_FIELD)) {
    columns.push({
      key: ACTIVE_FIELD,
      title: labels[ACTIVE_FIELD],
      dataIndex: ACTIVE_FIELD,
      width: 110,
      variant: EditorColumnVariant.Flag,
    });
  }

  return columns;
}

/**
 * Стандартные поля карточки — те, что есть у записи любого списка. Раздел их
 * не описывает: он добавляет только свои. Подписи берутся из общих `labels`,
 * поэтому раздел может назвать поле по-своему («Код страницы»), не переписывая
 * само поле.
 */
export function standardFields(params: {
  isNested: boolean;
  rows: EditorRow[];
  /** Открытая запись: себя и свою ветку в родители не предлагаем */
  selectedId: string | null;
  labels: Record<string, string>;
}): EditorFieldDef[] {
  const { isNested, rows, selectedId, labels } = params;

  /** Код и родитель определяют адрес — обе правки пересчитывают его на лету. */
  const recalcPath = (values: EditorValues): EditorValues =>
    isNested ? { [PATH_FIELD]: rowPath(rows, values[PARENT_FIELD], values[CODE_FIELD]) } : {};

  const fields: EditorFieldDef[] = [
    {
      key: ID_FIELD,
      label: labels[ID_FIELD],
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: NAME_FIELD,
      label: labels[NAME_FIELD],
      type: EditorFieldType.Text,
      required: true,
      note: 'Используется в админке; на сайт попадает, если так настроен вывод',
    },
    {
      key: CODE_FIELD,
      label: labels[CODE_FIELD],
      type: EditorFieldType.Text,
      note: 'Подставляется из названия; по нему запись находит сайт',
      onChange: (value, values) => recalcPath({ ...values, [CODE_FIELD]: value }),
    },
  ];

  if (isNested) {
    fields.push(
      {
        key: PATH_FIELD,
        label: labels[PATH_FIELD],
        type: EditorFieldType.ReadOnly,
        note: 'Собирается из кодов родителей — так запись открывается на сайте',
      },
      {
        key: PARENT_FIELD,
        label: labels[PARENT_FIELD],
        type: EditorFieldType.Select,
        nullable: true,
        placeholder: 'В корне списка',
        note: 'Пусто — запись лежит в корне списка',
        options: parentChoices(rows, selectedId, (row) => String(row.name ?? row.id)),
        onChange: (value, values) => recalcPath({ ...values, [PARENT_FIELD]: value }),
      },
    );
  }

  fields.push(
    {
      key: SORT_FIELD,
      label: labels[SORT_FIELD],
      type: EditorFieldType.Number,
      note: 'Чем меньше число, тем выше запись среди соседей',
    },
    {
      key: ACTIVE_FIELD,
      label: labels[ACTIVE_FIELD],
      type: EditorFieldType.Switch,
      note: 'Выключенная запись остаётся в админке, но на сайт не попадает',
    },
  );

  return fields;
}

/** Вкладка «Параметры» со стандартными полями — первая в карточке у всех разделов. */
export const standardTab = (fields: EditorFieldDef[]): EditorTabDef => ({
  key: 'params',
  label: 'Параметры',
  groups: [
    {
      key: 'standard',
      fields: fields.filter((field) => STANDARD_FIELD_KEYS.includes(field.key)).map((f) => f.key),
    },
  ],
});
