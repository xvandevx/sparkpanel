import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
  type EditorValues,
} from '../contentEditor';
import type { EditorLink } from '../editorForm';

/**
 * Описание раздела «HTML-блоки» для универсального редактора: колонки таблицы,
 * поля формы и вкладки шторки. Чистые данные — ни React, ни сети.
 *
 * В коде и в базе раздел по-прежнему `content` — переименованы только подписи.
 */

/** Код блока: строчные латинские буквы, цифры и дефисы между ними. Совпадает с проверкой на бэкенде. */
export const CONTENT_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Сколько символов разметки показывать в подсказке под названием блока. */
const CONTENT_HINT_LIMIT = 80;

const text = (value: unknown): string => String(value ?? '').trim();

/** Разметка в одну строку: в таблице нужен смысл блока, а не его переносы. */
export const contentPreview = (value: unknown): string => {
  const plain = text(value).replace(/\s+/g, ' ');
  if (!plain) return 'Разметка пока пустая';
  return plain.length > CONTENT_HINT_LIMIT
    ? `${plain.slice(0, CONTENT_HINT_LIMIT)}…`
    : plain;
};

export const contentColumns = (): EditorColumnDef[] => [
  {
    key: 'name',
    title: 'Название',
    dataIndex: 'name',
    width: 320,
    // Описание редактора важнее самой разметки: оно говорит, что это за блок
    hint: (record) => text(record.description) || contentPreview(record.content),
  },
  {
    key: 'code',
    title: 'Код',
    dataIndex: 'code',
    width: 220,
    variant: EditorColumnVariant.Code,
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

/** У нового блока идентификатора ещё нет — подключён он быть нигде не может. */
const isSaved = (values: EditorValues): boolean => /^\d+$/.test(String(values.id ?? ''));

export function contentFields(params: {
  /** Где подключён открытый блок; undefined — ещё загружается */
  usages: EditorLink[] | undefined;
  /** Список подключений получить не удалось */
  usagesFailed: boolean;
}): EditorFieldDef[] {
  const { usages, usagesFailed } = params;
  const isUsed = (usages?.length ?? 0) > 0;

  return [
    {
      key: 'id',
      label: 'Идентификатор',
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: 'code',
      label: 'Код блока',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'footer-contacts',
      note: isUsed
        ? 'Блок подключён — смена кода оторвала бы его от этих мест. Сначала отключите его там'
        : 'По нему блок подключают маркером #BLOCK:код#: строчные латинские буквы, цифры и дефис',
      // Тот же запрет держит и бэкенд: его не обойти мимо админки
      disabled: () => isUsed,
      validate: (value: unknown) =>
        CONTENT_CODE_PATTERN.test(text(value))
          ? null
          : 'Код может содержать строчные латинские буквы, цифры и дефис между ними',
    },
    {
      key: 'name',
      label: 'Название',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'Контакты в подвале',
      note: 'Используется только в админке',
    },
    {
      key: 'description',
      label: 'Описание',
      type: EditorFieldType.Textarea,
      // Пустая заметка — это «не заполнено», а не пустая строка
      nullable: true,
      rows: 2,
      placeholder: 'Адрес и телефоны для подвала',
      note: 'Заметка для редактора: что это за блок. Где он подключён — на вкладке «Где подключён»',
    },
    {
      key: 'position',
      label: 'Порядок',
      type: EditorFieldType.Number,
      note: 'Чем меньше число, тем выше блок в списке',
    },
    {
      key: 'isActive',
      label: 'Активен',
      type: EditorFieldType.Switch,
      note: 'Выключенный блок остаётся подключённым, но на сайте на его месте будет пусто',
    },
    {
      key: 'content',
      label: 'Разметка блока',
      // Без htmlBlocks: блок в блок не вкладывается
      type: EditorFieldType.Html,
      nullable: true,
      rows: 18,
      placeholder: '<p>Москва, ул. Правды, 24</p>',
      note: 'HTML, который сайт подставляет на место маркера #BLOCK:код#',
    },
    {
      key: 'usages',
      label: 'Подключён',
      type: EditorFieldType.Links,
      links: usages,
      placeholder: usagesFailed
        ? 'Не удалось загрузить, где подключён блок'
        : 'Пока нигде. Подключите блок во вкладке «Контент» страницы или записи инфоблока',
      hidden: (values) => !isSaved(values),
    },
  ];
}

export const contentTabs = (): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'main',
        title: 'HTML-блок',
        description:
          'Блок собирается один раз и подключается в контент страниц и записей инфоблоков. Правка блока меняет его сразу везде.',
        fields: ['id', 'code', 'name', 'description', 'position', 'isActive'],
      },
    ],
  },
  {
    key: 'content',
    label: 'Контент',
    groups: [{ key: 'content', fields: ['content'] }],
  },
  {
    key: 'usages',
    label: 'Где подключён',
    groups: [
      {
        key: 'usages',
        description:
          'Страницы и записи инфоблоков, в контенте которых стоит маркер блока. Пока список не пуст, блок нельзя удалить и нельзя сменить его код.',
        fields: ['usages'],
      },
    ],
  },
];

/** Подписи полей в истории изменений: ключи те же, что в снимке на бэкенде. */
export const CONTENT_HISTORY_LABELS: Record<string, string> = {
  title: 'Переиспользуемые HTML-блоки',
  add: 'Добавить HTML-блок',
  code: 'Код блока',
  name: 'Название',
  description: 'Описание',
  content: 'Разметка блока',
  isActive: 'Активен',
  position: 'Порядок',
};

/** Пустое значение поля-числа в форме приводим к нулю: бэкенд ждёт целое. */
export const toPosition = (value: unknown): number => Number(value) || 0;
