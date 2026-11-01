import type { InfoblockSectionDto } from '../../src/api/client';
import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorSelectOption,
  type EditorTabDef,
} from '../contentEditor';
import { text, validateCode } from './infoblockIds';

/**
 * Описание инфоблока для универсального редактора: колонки таблицы, поля формы
 * и вкладки шторки. Чистые данные — ни React, ни сети.
 *
 * Инфоблок — это описание списка; сами записи лежат на его странице.
 */

/** Список типов для выбора: сменить его — значит перенести инфоблок. */
export const sectionOptions = (sections: InfoblockSectionDto[]): EditorSelectOption[] =>
  sections.map((section) => ({
    label: section.name,
    value: String(section.id),
    description: section.code,
  }));

export const blockColumns = (): EditorColumnDef[] => [
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
    width: 200,
    variant: EditorColumnVariant.Code,
  },
  {
    key: 'elementsCount',
    title: 'Записей',
    dataIndex: 'elementsCount',
    width: 110,
  },
  {
    key: 'position',
    title: 'Порядок',
    dataIndex: 'position',
    width: 110,
  },
  {
    key: 'isActive',
    title: 'Активен',
    dataIndex: 'isActive',
    width: 110,
    variant: EditorColumnVariant.Flag,
  },
];

/** `sections` нужны полю «Тип»: через него инфоблок переносят к соседям. */
export function blockFields(sections: InfoblockSectionDto[]): EditorFieldDef[] {
  return [
    {
      key: 'id',
      label: 'Идентификатор',
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: 'code',
      label: 'Код инфоблока',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'news',
      note: 'По нему список подключают на странице: строчные латинские буквы, цифры и дефис',
      validate: validateCode,
    },
    {
      key: 'name',
      label: 'Название',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'Новости компании',
      note: 'Используется только в админке',
    },
    {
      key: 'elementName',
      label: 'Название одной записи',
      type: EditorFieldType.Text,
      placeholder: 'Новость',
      note: 'Подставляется заголовком в форму записи: открывается новость, а не «элемент»',
    },
    {
      key: 'sectionId',
      label: 'Тип',
      type: EditorFieldType.Select,
      required: true,
      options: sectionOptions(sections),
      note: 'Другой тип — инфоблок переедет туда и пропадёт из этого списка',
    },
    {
      key: 'description',
      label: 'Где используется',
      type: EditorFieldType.Textarea,
      rows: 2,
      placeholder: 'Выводятся на главной и в разделе «О компании»',
      note: 'Заметка для редактора: по ней понятно, что сломается при правке',
    },
    {
      key: 'position',
      label: 'Порядок',
      type: EditorFieldType.Number,
      note: 'Чем меньше число, тем выше инфоблок в списке',
    },
    {
      key: 'isActive',
      label: 'Активен',
      type: EditorFieldType.Switch,
      note: 'Неактивный инфоблок остаётся в админке, но на сайт не выводится',
    },
  ];
}

export const blockTabs = (): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'main',
        title: 'Инфоблок',
        description: 'Список однотипных записей: новости, товары, отзывы.',
        fields: ['id', 'code', 'name', 'elementName', 'sectionId', 'description', 'position', 'isActive'],
      },
    ],
  },
];
