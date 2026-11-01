import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
} from '../contentEditor';
import { plural } from '../plural';
import { validateSectionCode, validateSectionName } from './filesForm';

/**
 * Описание раздела медиатеки для универсального редактора: колонки таблицы,
 * поля формы и вкладки шторки. Чистые данные — ни React, ни сети.
 *
 * Раздел — это только группировка: сами файлы лежат на его собственной странице.
 */

export const sectionColumns = (): EditorColumnDef[] => [
  {
    key: 'name',
    title: 'Название',
    dataIndex: 'name',
    width: 320,
  },
  {
    key: 'code',
    title: 'Код',
    dataIndex: 'code',
    width: 220,
    variant: EditorColumnVariant.Code,
  },
  {
    key: 'filesCount',
    title: 'Файлы',
    width: 160,
    value: (record) => plural(Number(record.filesCount ?? 0), 'файл', 'файла', 'файлов'),
  },
];

export const sectionFields = (): EditorFieldDef[] => [
  {
    key: 'id',
    label: 'Идентификатор',
    type: EditorFieldType.ReadOnly,
    note: 'Присваивается системой и не меняется',
  },
  {
    key: 'code',
    label: 'Код раздела',
    type: EditorFieldType.Text,
    required: true,
    placeholder: 'banners',
    note: 'По коду раздел зовут из шаблонов сайта',
    validate: validateSectionCode,
  },
  {
    key: 'name',
    label: 'Название',
    type: EditorFieldType.Text,
    required: true,
    placeholder: 'Баннеры',
    note: 'Показывается в списке разделов',
    validate: validateSectionName,
  },
];

export const sectionTabs = (): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'main',
        title: 'Раздел медиатеки',
        description: 'Группирует файлы по назначению. Сами файлы — внутри раздела.',
        fields: ['id', 'code', 'name'],
      },
    ],
  },
];
