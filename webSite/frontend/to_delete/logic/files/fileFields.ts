import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorSelectOption,
  type EditorTabDef,
  type EditorValues,
} from '../contentEditor';
import type { FileSectionDto } from '../../src/api/client';

/**
 * Описание файла медиатеки для универсального редактора. Чистые данные —
 * ни React, ни сети; размер, дату и вид файла считает `filesFormat.ts`,
 * сюда они приходят уже строками.
 */

/** У новой записи идентификатора ещё нет: по нему и отличаем загрузку от правки. */
const isNew = (values: EditorValues): boolean => !values.id;

export const fileColumns = (): EditorColumnDef[] => [
  {
    key: 'url',
    title: '',
    width: 88,
    variant: EditorColumnVariant.Image,
    // Превью только у картинок: у pdf или архива по адресу нечего показывать,
    // и браузер нарисовал бы вместо строки битую картинку. Пустое значение —
    // знак таблице поставить значок файла.
    value: (record) => (record.isImage === true ? String(record.url ?? '') : ''),
    hint: (record) => String(record.name ?? ''),
  },
  {
    key: 'name',
    title: 'Файл',
    dataIndex: 'name',
    hint: (record) => `${String(record.sizeLabel ?? '')} · ${String(record.dateLabel ?? '')}`,
  },
  {
    key: 'kindLabel',
    title: 'Тип',
    dataIndex: 'kindLabel',
    width: 150,
    variant: EditorColumnVariant.Tag,
  },
  {
    key: 'description',
    title: 'Описание',
    dataIndex: 'description',
  },
];

/** Поля зависят от разделов: файл можно переложить в соседний раздел прямо из шторки. */
export const fileFields = (sections: FileSectionDto[]): EditorFieldDef[] => [
  {
    key: 'files',
    label: 'Файлы',
    type: EditorFieldType.File,
    multiple: true,
    required: true,
    note: 'Можно выбрать сразу несколько — описание и раздел применятся ко всем. До 20 МБ каждый',
    // У существующей записи файл не меняют: его перезаливают заново
    hidden: (values) => !isNew(values),
  },
  {
    key: 'name',
    label: 'Имя файла',
    type: EditorFieldType.ReadOnly,
    note: 'Имя при загрузке; в адресе оно переведено в латиницу',
    hidden: isNew,
  },
  {
    key: 'url',
    label: 'Адрес',
    type: EditorFieldType.ReadOnly,
    note: 'Этот адрес вставляют в контент сайта',
    hidden: isNew,
  },
  {
    key: 'sizeLabel',
    label: 'Размер',
    type: EditorFieldType.ReadOnly,
    hidden: isNew,
  },
  {
    key: 'dateLabel',
    label: 'Загружен',
    type: EditorFieldType.ReadOnly,
    hidden: isNew,
  },
  {
    key: 'description',
    label: 'Описание',
    type: EditorFieldType.Text,
    placeholder: 'Баннер на главной',
    note: 'Зачем этот файл нужен — чтобы через полгода не гадать',
  },
  {
    key: 'sectionId',
    label: 'Раздел',
    type: EditorFieldType.Select,
    required: true,
    note: 'Сменить раздел — значит перенести файл',
    options: (): EditorSelectOption[] =>
      sections.map((section) => ({
        value: String(section.id),
        label: section.name || section.code,
        description: section.code,
      })),
  },
];

export const fileTabs = (): EditorTabDef[] => [
  {
    key: 'file',
    label: 'Файл',
    groups: [
      {
        key: 'upload',
        title: 'Загрузка',
        description: 'Файлы уходят в хранилище сразу при сохранении.',
        fields: ['files'],
      },
      {
        key: 'about',
        title: 'Файл',
        fields: ['name', 'url', 'sizeLabel', 'dateLabel'],
      },
      {
        key: 'card',
        title: 'Карточка',
        fields: ['description', 'sectionId'],
      },
    ],
  },
];
