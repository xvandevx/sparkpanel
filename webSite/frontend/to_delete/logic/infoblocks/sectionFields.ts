import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
} from '../contentEditor';
import { plural } from '../plural';
import { text, validateCode } from './infoblockIds';

/**
 * Описание типа инфоблоков для универсального редактора: колонки таблицы,
 * поля формы и вкладки шторки. Чистые данные — ни React, ни сети.
 *
 * Тип — это только группировка: своих записей у него нет, инфоблоки лежат
 * на его собственной странице.
 */

export const sectionColumns = (): EditorColumnDef[] => [
  {
    key: 'name',
    title: 'Название',
    dataIndex: 'name',
    width: 320,
    hint: (record) => text(record.description) || null,
  },
  {
    key: 'code',
    title: 'Код',
    dataIndex: 'code',
    width: 220,
    variant: EditorColumnVariant.Code,
  },
  {
    key: 'blocksCount',
    title: 'Инфоблоки',
    width: 160,
    value: (record) =>
      plural(Number(record.blocksCount ?? 0), 'инфоблок', 'инфоблока', 'инфоблоков'),
  },
  {
    key: 'position',
    title: 'Порядок',
    dataIndex: 'position',
    width: 110,
  },
];

export function sectionFields(): EditorFieldDef[] {
  return [
    {
      key: 'id',
      label: 'Идентификатор',
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: 'code',
      label: 'Код типа',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'content',
      note: 'Строчные латинские буквы, цифры и дефис',
      validate: validateCode,
    },
    {
      key: 'name',
      label: 'Название',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'Контент сайта',
      note: 'Показывается в списке типов и в меню слева',
    },
    {
      key: 'description',
      label: 'Пояснение',
      type: EditorFieldType.Textarea,
      rows: 2,
      placeholder: 'Всё, что редакторы наполняют сами',
      note: 'Заметка для редактора: что складывают в этот тип',
    },
    {
      key: 'position',
      label: 'Порядок',
      type: EditorFieldType.Number,
      note: 'Чем меньше число, тем выше тип в списке и в меню',
    },
  ];
}

export const sectionTabs = (): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'main',
        title: 'Тип инфоблоков',
        description: 'Группирует инфоблоки по назначению. Сами списки — внутри типа.',
        fields: ['id', 'code', 'name', 'description', 'position'],
      },
    ],
  },
];
