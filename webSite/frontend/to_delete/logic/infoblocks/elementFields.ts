import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
} from '../contentEditor';
import type { EditorHtmlBlock } from '../editorForm';

/**
 * Описание элементов инфоблока для универсального редактора: колонки таблицы,
 * поля формы и вкладки шторки. Чистые данные — ни React, ни сети.
 *
 * Набор полей пока общий на все инфоблоки: и у новости, и у товара это код,
 * название, анонс, текст, картинка и дата. Свои свойства у каждого списка
 * появятся позже — под них на бэкенде уже заведено поле `props`.
 */

/** Код: строчные латинские буквы, цифры и дефисы между ними. Совпадает с проверкой на бэкенде. */
export const INFOBLOCK_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const INFOBLOCK_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры и дефис между ними';

/** Дата элемента: календарный день без времени, как её хранит бэкенд. */
export const ELEMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Такой день существует в календаре. Одной формы строки мало: «2026-02-31»
 * ей удовлетворяет, а базой не принимается — и отказ пришёл бы ошибкой
 * сервера вместо понятного сообщения под полем. Проверка повторяет
 * `isCalendarDate` на бэкенде.
 */
export function isCalendarDate(value: string): boolean {
  if (!ELEMENT_DATE_PATTERN.test(value)) return false;

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Сколько символов анонса показывать подсказкой под названием элемента. */
const PREVIEW_HINT_LIMIT = 80;

const text = (value: unknown): string => String(value ?? '').trim();

/** Анонс в одну строку: в таблице нужен смысл записи, а не её переносы. */
export const elementPreview = (value: unknown): string => {
  const plain = text(value).replace(/\s+/g, ' ');
  if (!plain) return '';
  return plain.length > PREVIEW_HINT_LIMIT ? `${plain.slice(0, PREVIEW_HINT_LIMIT)}…` : plain;
};

/** Дата для таблицы: день.месяц.год — читается быстрее, чем ISO. */
export const formatElementDate = (value: unknown): string => {
  const raw = text(value);
  if (!ELEMENT_DATE_PATTERN.test(raw)) return '';
  const [year, month, day] = raw.split('-');
  return `${day}.${month}.${year}`;
};

export const elementColumns = (): EditorColumnDef[] => [
  {
    key: 'name',
    title: 'Название',
    dataIndex: 'name',
    width: 320,
    hint: (record) => elementPreview(record.preview) || null,
  },
  {
    key: 'code',
    title: 'Код',
    dataIndex: 'code',
    width: 200,
    variant: EditorColumnVariant.Code,
  },
  {
    key: 'date',
    title: 'Дата',
    width: 120,
    value: (record) => formatElementDate(record.date) || '—',
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

/** Подсказка у полей разметки: как подключить переиспользуемый блок. */
const HTML_BLOCKS_NOTE =
  'HTML-блок подключается маркером #BLOCK:код# — выберите его в списке «Подключить HTML-блок»';

/** `htmlBlocks` — HTML-блоки, которые можно подключить в анонс и текст записи. */
export function elementFields(htmlBlocks: EditorHtmlBlock[]): EditorFieldDef[] {
  return [
    {
      key: 'id',
      label: 'Идентификатор',
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: 'code',
      label: 'Код элемента',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'otkrytie-ofisa',
      note: 'Сегмент адреса записи на сайте: строчные латинские буквы, цифры и дефис',
      validate: (value: unknown) =>
        INFOBLOCK_CODE_PATTERN.test(text(value)) ? null : INFOBLOCK_CODE_MESSAGE,
    },
    {
      key: 'name',
      label: 'Название',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'Открытие нового офиса',
    },
    {
      key: 'date',
      label: 'Дата',
      type: EditorFieldType.Text,
      placeholder: '2026-09-16',
      note: 'В виде ГГГГ-ММ-ДД. По ней записи сортируют и показывают её в списке',
      validate: (value: unknown) => {
        const raw = text(value);
        if (!raw) return null;
        return isCalendarDate(raw) ? null : 'Дата указывается в виде ГГГГ-ММ-ДД';
      },
    },
    {
      key: 'position',
      label: 'Порядок',
      type: EditorFieldType.Number,
      note: 'Чем меньше число, тем выше запись в списке',
    },
    {
      key: 'isActive',
      label: 'Активен',
      type: EditorFieldType.Switch,
      note: 'Неактивная запись остаётся в админке, но на сайт не выводится',
    },
    {
      key: 'image',
      label: 'Картинка',
      type: EditorFieldType.Text,
      placeholder: '/files/1/2026/09/banner.jpg',
      note: 'Адрес изображения. Выбор из медиатеки появится вместе с её экраном',
    },
    {
      key: 'preview',
      label: 'Анонс',
      type: EditorFieldType.Html,
      rows: 4,
      placeholder: 'Коротко о главном',
      note: `То, что видно в списке записей на сайте. ${HTML_BLOCKS_NOTE}`,
      htmlBlocks,
    },
    {
      key: 'content',
      label: 'Текст',
      type: EditorFieldType.Html,
      rows: 16,
      placeholder: '<p>Полный текст записи</p>',
      note: `Разметка страницы записи. ${HTML_BLOCKS_NOTE}`,
      htmlBlocks,
    },
  ];
}

/**
 * Вкладки шторки. Заголовок первой группы — то, как инфоблок называет одну
 * свою запись («Новость», «Товар»): в списке новостей открывается новость,
 * а не безличный «элемент».
 */
export const elementTabs = (elementName: string): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'main',
        title: elementName,
        fields: ['id', 'code', 'name', 'date', 'position', 'isActive'],
      },
    ],
  },
  {
    key: 'content',
    label: 'Контент',
    groups: [{ key: 'content', fields: ['image', 'preview', 'content'] }],
  },
];

/** Подписи полей в истории изменений: ключи те же, что в снимке на бэкенде. */
export const ELEMENT_HISTORY_LABELS: Record<string, string> = {
  code: 'Код элемента',
  name: 'Название',
  preview: 'Анонс',
  content: 'Текст',
  image: 'Картинка',
  date: 'Дата',
  isActive: 'Активен',
  position: 'Порядок',
  props: 'Свойства',
};

/** Пустое значение поля-числа в форме приводим к нулю: бэкенд ждёт целое. */
export const toPosition = (value: unknown): number => Number(value) || 0;
