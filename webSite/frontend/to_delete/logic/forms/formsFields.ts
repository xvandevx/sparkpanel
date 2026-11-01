import type { FormDto } from '../../src/api/client';
import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
  type EditorValues,
} from '../contentEditor';
import { validateFieldCode, validateFormCode, validateNotifyEmail } from './formsForm';
import { FormRowKind, formOptions } from './formsTree';

/**
 * Описание раздела «Веб-формы» для универсального редактора: колонки таблицы,
 * поля формы и вкладки шторки. Чистые данные — ни React, ни сети.
 *
 * В разделе две сущности, форма и её поле, а набор полей у редактора один:
 * лишнее скрывается по виду записи (`rowKind`).
 */

/** Что посетитель вводит в поле формы. Ключи совпадают с `FormFieldDto.type`. */
export const FIELD_TYPE_LABELS: Record<string, string> = {
  text: 'Строка',
  email: 'E-mail',
  phone: 'Телефон',
  textarea: 'Текст',
  select: 'Список',
  checkbox: 'Флажок',
};

const FIELD_TYPE_HINTS: Record<string, string> = {
  text: 'Однострочный ввод: имя, город, что угодно',
  email: 'Проверяется как адрес почты',
  phone: 'Проверяется как номер телефона',
  textarea: 'Несколько строк: сообщение, комментарий',
  select: 'Выбор одного из вариантов',
  checkbox: 'Да/нет: согласие, подписка',
};

const isForm = (values: EditorValues): boolean => values.rowKind === FormRowKind.Form;
const isField = (values: EditorValues): boolean => values.rowKind === FormRowKind.Field;
const isSelect = (values: EditorValues): boolean =>
  isField(values) && values.type === 'select';

export const formColumns = (): EditorColumnDef[] => [
  {
    key: 'title',
    title: 'Название',
    width: 320,
    value: (record) =>
      record.rowKind === FormRowKind.Form ? String(record.name ?? '') : String(record.label ?? ''),
    hint: (record) =>
      record.rowKind === FormRowKind.Form
        ? `Полей: ${Number(record.fieldsCount ?? 0)} · ${
            record.notifyEmail ? `заявки на ${record.notifyEmail}` : 'получатель не указан'
          }`
        : String(record.placeholder ?? '') || null,
  },
  {
    key: 'code',
    title: 'Код',
    dataIndex: 'code',
    width: 200,
    variant: EditorColumnVariant.Code,
  },
  {
    key: 'kind',
    title: 'Тип',
    width: 150,
    variant: EditorColumnVariant.Tag,
    value: (record) =>
      record.rowKind === FormRowKind.Form
        ? 'Форма'
        : FIELD_TYPE_LABELS[String(record.type)] ?? String(record.type),
    color: (record) => (record.rowKind === FormRowKind.Form ? 'blue' : 'default'),
  },
  {
    key: 'isRequired',
    title: 'Обязательное',
    width: 130,
    variant: EditorColumnVariant.Tag,
    // У формы обязательности нет — Flag показал бы «Нет» там, где вопроса не стоит
    value: (record) =>
      record.rowKind === FormRowKind.Field ? (record.isRequired ? 'Да' : 'Нет') : '—',
    color: (record) =>
      record.rowKind === FormRowKind.Field && record.isRequired ? 'orange' : 'default',
  },
  {
    key: 'isActive',
    title: 'Активна',
    dataIndex: 'isActive',
    width: 110,
    variant: EditorColumnVariant.Flag,
  },
];

/** Поля формы. `items` нужны для списка форм в поле «Форма». */
export function formFields(items: FormDto[]): EditorFieldDef[] {
  return [
    {
      key: 'id',
      label: 'Идентификатор',
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: 'code',
      label: 'Код формы',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'feedback',
      note: 'По нему форма подключается на сайте: строчные латинские буквы, цифры и дефис',
      validate: validateFormCode,
      hidden: (values) => !isForm(values),
    },
    {
      key: 'name',
      label: 'Название',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'Обратная связь',
      note: 'Используется только в админке',
      hidden: (values) => !isForm(values),
    },
    {
      key: 'description',
      label: 'Описание',
      type: EditorFieldType.Textarea,
      rows: 3,
      placeholder: 'Ответим в течение рабочего дня',
      note: 'Показывается на сайте под заголовком формы',
      hidden: (values) => !isForm(values),
    },
    {
      key: 'notifyEmail',
      label: 'Куда отправлять заявки',
      type: EditorFieldType.Text,
      placeholder: 'sales@example.com',
      note: 'Пусто — заявка сохранится, но письмо никуда не уйдёт',
      validate: validateNotifyEmail,
      hidden: (values) => !isForm(values),
    },
    {
      key: 'submitLabel',
      label: 'Подпись кнопки',
      type: EditorFieldType.Text,
      placeholder: 'Отправить',
      hidden: (values) => !isForm(values),
    },
    {
      key: 'successMessage',
      label: 'Сообщение после отправки',
      type: EditorFieldType.Textarea,
      rows: 3,
      placeholder: 'Спасибо! Мы получили заявку и скоро ответим.',
      note: 'Что посетитель увидит вместо формы после отправки',
      hidden: (values) => !isForm(values),
    },

    {
      key: 'formId',
      label: 'Форма',
      type: EditorFieldType.Select,
      required: true,
      options: formOptions(items),
      // Поле — часть своей формы: перенос в другую сломал бы уже собранные заявки
      disabled: () => true,
      note: 'Поле принадлежит этой форме и не переносится в другую',
      hidden: (values) => !isField(values),
    },
    {
      key: 'label',
      label: 'Подпись поля',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'Телефон',
      note: 'То, что посетитель видит рядом с полем',
      hidden: (values) => !isField(values),
    },
    {
      key: 'fieldCode',
      label: 'Код поля',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'phone',
      note: 'Ключ значения в заявке и в письме: латинские буквы, цифры и подчёркивание',
      validate: validateFieldCode,
      hidden: (values) => !isField(values),
    },
    {
      key: 'type',
      label: 'Тип поля',
      type: EditorFieldType.Select,
      required: true,
      options: Object.keys(FIELD_TYPE_LABELS).map((value) => ({
        label: FIELD_TYPE_LABELS[value],
        value,
        description: FIELD_TYPE_HINTS[value],
      })),
      hidden: (values) => !isField(values),
    },
    {
      key: 'placeholder',
      label: 'Подсказка в пустом поле',
      type: EditorFieldType.Text,
      placeholder: '+7 (900) 000-00-00',
      hidden: (values) => !isField(values) || values.type === 'checkbox',
    },
    {
      key: 'options',
      // Значение — список строк: тот же контрол, что у поддоменов в настройках
      type: EditorFieldType.Tags,
      label: 'Варианты списка',
      required: true,
      placeholder: 'Консультация',
      note: 'Вводите по одному: Enter или запятая заканчивают вариант',
      hidden: (values) => !isSelect(values),
    },
    {
      key: 'isRequired',
      label: 'Обязательное',
      type: EditorFieldType.Switch,
      note: 'Без заполнения этого поля заявку не отправить',
      hidden: (values) => !isField(values),
    },

    {
      key: 'position',
      label: 'Порядок',
      type: EditorFieldType.Number,
      note: 'Чем меньше число, тем выше запись среди соседей',
    },
    {
      key: 'isActive',
      label: 'Активна',
      type: EditorFieldType.Switch,
      note: 'Неактивная запись остаётся в админке, но на сайт не попадает',
    },
  ];
}

export const formTabs = (): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'form',
        title: 'Форма',
        fields: ['id', 'code', 'name', 'description', 'position', 'isActive'],
        hidden: (values) => values.rowKind !== FormRowKind.Form,
      },
      {
        key: 'field',
        title: 'Поле формы',
        description: 'Один вопрос посетителю: что он вводит и как это подписано',
        fields: [
          'id',
          'formId',
          'label',
          'fieldCode',
          'type',
          'placeholder',
          'options',
          'isRequired',
          'position',
          'isActive',
        ],
        hidden: (values) => values.rowKind !== FormRowKind.Field,
      },
    ],
  },
  {
    key: 'submit',
    label: 'Отправка',
    groups: [
      {
        key: 'submit',
        title: 'Что происходит после отправки',
        description: 'Куда уходит заявка и что посетитель видит вместо формы',
        fields: ['notifyEmail', 'submitLabel', 'successMessage'],
        hidden: (values) => values.rowKind !== FormRowKind.Form,
      },
    ],
  },
];

/** Подписи полей в истории изменений: ключи те же, что в снимке на бэкенде. */
export const FORM_HISTORY_LABELS: Record<string, string> = {
  code: 'Код',
  name: 'Название формы',
  description: 'Описание',
  notifyEmail: 'Куда отправлять заявки',
  submitLabel: 'Подпись кнопки',
  successMessage: 'Сообщение после отправки',
  formId: 'Форма',
  label: 'Подпись поля',
  type: 'Тип поля',
  placeholder: 'Подсказка в пустом поле',
  options: 'Варианты списка',
  isRequired: 'Обязательное',
  isActive: 'Активна',
  position: 'Порядок',
};
