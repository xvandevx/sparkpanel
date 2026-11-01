import {
  EditorColumnVariant,
  EditorFieldType,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
  type EditorValues,
} from '../contentEditor';

/**
 * Описание доменов для универсального редактора: колонки таблицы, поля формы
 * и вкладки шторки. Чистые данные — ни React, ни сети.
 */

/** Имя хоста. Совпадает с DOMAIN_HOST_PATTERN на бэкенде. */
export const DOMAIN_HOST_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/;

const text = (value: unknown): string => String(value ?? '').trim();

const isMain = (values: EditorValues): boolean => values.isMain === true;

/**
 * Домен приводим к имени хоста: адрес обычно копируют из адресной строки,
 * вместе с протоколом и путём. Та же нормализация есть и на бэкенде —
 * здесь она нужна, чтобы поле не «мигало» другим значением после сохранения.
 */
export const normalizeHost = (value: unknown): string =>
  text(value)
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/\/.*$/, '');

/** Возвращает текст ошибки или null, если имя хоста корректно. */
export const validateHost = (value: unknown): string | null => {
  const host = normalizeHost(value);
  if (!host) return 'Укажите домен';
  if (host.length > 255) return 'Домен длиннее 255 символов';
  if (!DOMAIN_HOST_PATTERN.test(host)) return 'Домен указан неверно — например, shop.example.com';
  return null;
};

export const domainColumns = (): EditorColumnDef[] => [
  {
    key: 'host',
    title: 'Домен',
    width: 320,
    variant: EditorColumnVariant.Code,
    value: (record) => text(record.host) || 'Домен не указан',
    hint: (record) =>
      record.isMain === true
        ? 'Основной домен сайта — его нельзя удалить'
        : text(record.note) || null,
  },
  {
    key: 'isMain',
    title: 'Назначение',
    width: 150,
    variant: EditorColumnVariant.Tag,
    value: (record) => (record.isMain === true ? 'Основной' : 'Поддомен'),
    color: (record) => (record.isMain === true ? 'blue' : 'default'),
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

export const domainFields = (): EditorFieldDef[] => [
  {
    key: 'id',
    label: 'Идентификатор',
    type: EditorFieldType.ReadOnly,
    note: 'Присваивается системой и не меняется',
  },
  {
    key: 'host',
    label: 'Домен',
    type: EditorFieldType.Text,
    required: true,
    placeholder: 'shop.example.com',
    note: 'Только имя хоста: протокол и путь отбрасываются. У поддомена имя без точки дополнится основным доменом',
    validate: validateHost,
  },
  {
    // Значение подставляет контроллер словом: «да/нет» о назначении домена не говорит
    key: 'isMainLabel',
    label: 'Назначение',
    type: EditorFieldType.ReadOnly,
    note: 'Основной домен заводится системой и остаётся единственным',
  },
  {
    key: 'note',
    label: 'Примечание',
    type: EditorFieldType.Textarea,
    rows: 2,
    placeholder: 'Домен интернет-магазина',
    note: 'Заметка для редактора: зачем нужен этот домен',
  },
  {
    key: 'position',
    label: 'Порядок',
    type: EditorFieldType.Number,
    // У основного домена порядок не спрашиваем: он всегда первый в списке
    hidden: isMain,
    note: 'Чем меньше число, тем выше домен в списке',
  },
  {
    key: 'isActive',
    label: 'Активен',
    type: EditorFieldType.Switch,
    note: 'Неактивный домен остаётся в панели, но сайт на нём не обслуживается',
  },
];

export const domainTabs = (): EditorTabDef[] => [
  {
    key: 'params',
    label: 'Параметры',
    groups: [
      {
        key: 'main',
        title: 'Домен',
        description:
          'Основной домен — главное имя сайта. Остальные записи это его поддомены и дополнительные имена.',
        fields: ['id', 'host', 'isMainLabel', 'note', 'position', 'isActive'],
      },
    ],
  },
];

/** Подписи полей в истории изменений: ключи те же, что в снимке на бэкенде. */
export const DOMAIN_HISTORY_LABELS: Record<string, string> = {
  host: 'Домен',
  isMain: 'Основной домен',
  isActive: 'Активен',
  note: 'Примечание',
  position: 'Порядок',
};

/** Пустое значение поля-числа в форме приводим к нулю: бэкенд ждёт целое. */
export const toPosition = (value: unknown): number => Number(value) || 0;
