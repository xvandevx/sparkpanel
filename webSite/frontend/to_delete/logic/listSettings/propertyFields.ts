import type { ContentBlockDto, LinkTargetDto, ListPropertyDto } from '../../src/api/client';
import {
  EditorFieldType,
  htmlBlockToken,
  isTableEmpty,
  tableCells,
  type EditorFieldDef,
  type EditorFieldGroup,
  type EditorHtmlBlock,
  type EditorMediaRules,
  type EditorSelectOption,
  type EditorValues,
} from '../editorForm';
import { mediaRulesHint } from '../mediaLibrary/mediaRules';
import { DEFAULT_TABLE_COLUMNS, ListPropertyType } from './propertyTypes';

/**
 * Свойства записей в форме шторки: из настроек списка — поля формы, из значений
 * записи — значения полей, и обратно в тело запроса. Чистые функции — без React
 * и сети: редактор контента только подмешивает результат к полям раздела.
 */

/** Поля свойств в форме — с приставкой: с полями раздела они не пересекутся. */
export const propertyKey = (code: string): string => `props.${code}`;

/**
 * Мета записи: не свойство, а галочка «Использовать мета записи» у списка.
 * В базе лежит под служебным ключом `_meta` — коды свойств начинаются с буквы,
 * поэтому занять его пользователь не может.
 */
export const RECORD_META_KEY = '_meta';
export const RECORD_META_TAB_KEY = 'record-meta';

export const RECORD_META_FIELDS = [
  { part: 'h1', key: 'meta.h1', label: 'Заголовок H1' },
  { part: 'title', key: 'meta.title', label: 'Мета заголовок (title)' },
  { part: 'description', key: 'meta.description', label: 'Мета описание (description)' },
] as const;

/** Ключ вкладки и первой группы свойств в шторке. */
export const PROPERTIES_GROUP_KEY = 'properties';

/** Числа у свойства — любые: цена, остаток, координата. Граница — только у самого JS. */
const ANY_NUMBER_MIN = Number.MIN_SAFE_INTEGER;

/** Привязка в форме — строкой «список/запись»: так её отдаёт и принимает Select. */
const linkValue = (listKey: string, recordId: string): string => `${listKey}/${recordId}`;

const parseLinkValue = (value: string): { listKey: string; recordId: string } => {
  const [listKey, recordId] = value.split('/');
  return { listKey, recordId };
};

/** HTML-блоки раздела «Контент» → варианты выбора; значение — номер блока строкой. */
export const htmlBlockChoices = (blocks: ContentBlockDto[]): EditorSelectOption[] =>
  blocks.map((block) => ({
    value: String(block.id),
    label: block.isActive ? block.name : `${block.name} (выключен)`,
    description: htmlBlockToken(block.code),
  }));

/** Записи для привязки к контенту → варианты выбора по группам. */
export const linkTargetChoices = (targets: LinkTargetDto[]): EditorSelectOption[] =>
  targets.map((target) => ({
    value: linkValue(target.listKey, target.recordId),
    label: target.code ? `${target.name} (${target.code})` : target.name,
    group: target.group,
  }));

const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];

/**
 * Варианты выбора плюс выбранные значения, которых среди вариантов уже нет:
 * блок или запись удалили, а свойство на них всё ещё ссылается. Без этого
 * Select показал бы голый ключ, и было бы непонятно, что с ним.
 */
const withMissing = (
  choices: EditorSelectOption[],
  value: unknown,
  label: (value: string) => string,
): EditorSelectOption[] => {
  const known = new Set(choices.map((choice) => choice.value));
  const missing = asList(value)
    .map(String)
    .filter((item) => item && !known.has(item));
  return [...choices, ...missing.map((item) => ({ value: item, label: label(item) }))];
};

/** Ограничения поля «файл» из настроек свойства. */
const mediaRules = (property: ListPropertyDto): EditorMediaRules => ({
  imagesOnly: property.type === ListPropertyType.Image,
  formats: property.formats ?? [],
  maxSizeMb: property.maxSizeMb ?? null,
  maxWidth: property.maxWidth ?? null,
  maxHeight: property.maxHeight ?? null,
});

/** Столбцы таблицы и их заголовки из настроек; строки запись добавляет сама. */
const tableLayout = (property: ListPropertyDto) => ({
  columns: property.columns ?? DEFAULT_TABLE_COLUMNS,
  headers: property.headers ?? [],
});

/** Что нужно полям свойств, кроме самих настроек: варианты выбора и блоки для вставки. */
export interface PropertyFieldsContext {
  /** Варианты для «HTML-блоков» */
  htmlBlockChoices: EditorSelectOption[];
  /** Блоки для вставки в «HTML» */
  htmlBlocks: EditorHtmlBlock[];
  /** Варианты для «Привязки к контенту» */
  linkTargets: EditorSelectOption[];
  /** У каких записей свойства есть: в «Веб-формах» — у форм, не у их полей */
  applies?: (values: EditorValues) => boolean;
}

/** Поля формы по свойствам списка. Скрытое поле и не проверяется. */
export function propertyFields(
  properties: ListPropertyDto[],
  context: PropertyFieldsContext,
): EditorFieldDef[] {
  const hidden = context.applies
    ? (values: EditorValues) => !context.applies?.(values)
    : undefined;

  return properties.flatMap((property): EditorFieldDef[] => {
    const base = {
      key: propertyKey(property.code),
      label: property.name,
      required: property.required,
      hidden,
    };

    switch (property.type) {
      case ListPropertyType.Number:
        return [
          {
            ...base,
            type: EditorFieldType.Number,
            multiple: property.multiple,
            nullable: true,
            min: ANY_NUMBER_MIN,
          },
        ];

      case ListPropertyType.Text:
        return [{ ...base, type: EditorFieldType.Textarea, multiple: property.multiple, rows: 4 }];

      case ListPropertyType.Html:
        return [
          {
            ...base,
            type: EditorFieldType.RichText,
            multiple: property.multiple,
            htmlBlocks: context.htmlBlocks,
          },
        ];

      case ListPropertyType.List:
        return [
          {
            ...base,
            type: EditorFieldType.Select,
            multiple: property.multiple,
            nullable: true,
            placeholder: 'Не выбрано',
            // Значение записи — код варианта: он уходит на сайт и переживает
            // переименование; редактор видит название
            options: property.options.map((option) => ({
              value: option.code,
              label: option.name,
            })),
          },
        ];

      case ListPropertyType.HtmlBlocks:
        return [
          {
            ...base,
            type: EditorFieldType.Select,
            multiple: property.multiple,
            nullable: true,
            placeholder: context.htmlBlockChoices.length
              ? 'Не выбрано'
              : 'В разделе «Контент» нет блоков',
            options: (values) =>
              withMissing(context.htmlBlockChoices, values[base.key], (id) => `Блок №${id} удалён`),
          },
        ];

      case ListPropertyType.ContentLink: {
        // Свойство привязано к одному списку — в выборе только его записи.
        // Пустой `linkList` — привязка к чему угодно, как было раньше
        const targets = property.linkList
          ? context.linkTargets.filter((target) =>
              target.value.startsWith(`${property.linkList}/`),
            )
          : context.linkTargets;
        return [
          {
            ...base,
            type: EditorFieldType.Select,
            multiple: property.multiple,
            nullable: true,
            placeholder: targets.length
              ? 'Не выбрано'
              : 'В выбранном списке пока нет записей',
            options: (values) =>
              withMissing(targets, values[base.key], (key) => `${key} — запись удалена`),
          },
        ];
      }

      case ListPropertyType.File:
      case ListPropertyType.Image: {
        const rules = mediaRules(property);
        return [
          {
            ...base,
            type: EditorFieldType.Media,
            multiple: property.multiple,
            media: rules,
            note: mediaRulesHint(rules) || undefined,
          },
        ];
      }

      case ListPropertyType.Table:
        return [
          {
            ...base,
            type: EditorFieldType.Table,
            table: tableLayout(property),
            // Пустая таблица — тоже массив, обычная проверка «заполнено» её не поймает
            validate: (value) =>
              property.required && isTableEmpty(value)
                ? `Заполните таблицу «${property.name}»`
                : null,
          },
        ];

      default:
        return [{ ...base, type: EditorFieldType.Text, multiple: property.multiple }];
    }
  });
}

/**
 * Свойства одной вкладки — одной группой, в порядке из настроек.
 * `key` разводит группы разных вкладок: ключи групп в форме уникальны.
 */
export function propertiesGroups(
  properties: ListPropertyDto[],
  tabCode = '',
): EditorFieldGroup[] {
  if (properties.length === 0) return [];

  return [
    {
      key: tabCode ? `${PROPERTIES_GROUP_KEY}-${tabCode}` : PROPERTIES_GROUP_KEY,
      fields: properties.map((property) => propertyKey(property.code)),
    },
  ];
}

/** Поля вкладки «Мета»: три строки меты записи. */
export function recordMetaFields(): EditorFieldDef[] {
  return RECORD_META_FIELDS.map(({ key, label, part }) => ({
    key,
    label,
    type: part === 'description' ? EditorFieldType.Textarea : EditorFieldType.Text,
    rows: part === 'description' ? 3 : undefined,
  }));
}

export const recordMetaGroups = (): EditorFieldGroup[] => [
  {
    key: RECORD_META_TAB_KEY,
    description: 'Мета-теги этой записи. Пустые поля сайт возьмёт из своих правил.',
    fields: RECORD_META_FIELDS.map(({ key }) => key),
  },
];

/** Мета записи из значений → поля формы и обратно. */
export const recordMetaFormValues = (raw: unknown): EditorValues => {
  const meta = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return Object.fromEntries(
    RECORD_META_FIELDS.map(({ key, part }) => [key, String(meta[part] ?? '')]),
  );
};

export const recordMetaPayload = (values: EditorValues): Record<string, string> =>
  Object.fromEntries(
    RECORD_META_FIELDS.map(({ key, part }) => [part, String(values[key] ?? '').trim()]),
  );

/**
 * Подписи меты в истории. Ключи те же, что у полей формы (`meta.h1`): бэкенд
 * раскладывает `_meta` по частям в снимке — в журнале видно, что поменялся
 * именно Title, а не «мета» целиком.
 */
export const recordMetaHistoryLabels = (): Record<string, string> =>
  Object.fromEntries(RECORD_META_FIELDS.map(({ key, label }) => [key, `Мета: ${label}`]));

const isLink = (item: unknown): item is { listKey: string; recordId: string } =>
  Boolean(item) && typeof item === 'object';

/** Значения записи → значения полей формы. Чего у записи нет — пусто, а не undefined. */
export function propertyFormValues(
  properties: ListPropertyDto[],
  stored: Record<string, unknown> | undefined,
): EditorValues {
  const values: EditorValues = {};

  for (const property of properties) {
    const raw = stored?.[property.code];
    const key = propertyKey(property.code);

    switch (property.type) {
      case ListPropertyType.Number:
        values[key] = property.multiple
          ? asList(raw).map((item) => (typeof item === 'number' ? item : null))
          : typeof raw === 'number'
            ? raw
            : null;
        break;
      // Множественная строка, текст и разметка — список значений; одиночные
      // остаются строкой, как их и рисует обычное поле
      case ListPropertyType.String:
      case ListPropertyType.Text:
      case ListPropertyType.Html:
        // У одиночного берём первое значение, а не `String(raw)`: множественность
        // могли выключить, пока значения записи ещё массив, — строка «a,b» вместо
        // «a» не усечение, а порча данных
        values[key] = property.multiple
          ? asList(raw).map((item) => String(item ?? ''))
          : String(asList(raw)[0] ?? '');
        break;
      case ListPropertyType.List:
      case ListPropertyType.HtmlBlocks: {
        // Выбор в форме — строками: так их отдаёт и принимает Select
        const list = asList(raw).map(String);
        values[key] = property.multiple ? list : list[0] ?? null;
        break;
      }
      case ListPropertyType.ContentLink: {
        const list = asList(raw)
          .filter(isLink)
          .map((link) => linkValue(link.listKey, link.recordId));
        values[key] = property.multiple ? list : list[0] ?? null;
        break;
      }
      case ListPropertyType.File:
      case ListPropertyType.Image: {
        const list = asList(raw).map(Number);
        values[key] = property.multiple ? list : list[0] ?? null;
        break;
      }
      case ListPropertyType.Table:
        values[key] = tableCells(raw, tableLayout(property).columns);
        break;
      default:
        values[key] = raw === null || raw === undefined ? '' : String(raw);
    }
  }

  return values;
}

/** Значения формы → тело запроса. Пустое сервер просто не сохранит. */
export function propertyPayload(
  properties: ListPropertyDto[],
  values: EditorValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const property of properties) {
    const value = values[propertyKey(property.code)];

    switch (property.type) {
      case ListPropertyType.String:
        payload[property.code] = property.multiple
          ? asList(value)
              .map((item) => String(item ?? '').trim())
              .filter(Boolean)
          : String(value ?? '').trim();
        break;
      case ListPropertyType.HtmlBlocks: {
        // В форме номер блока — строка, в базе — число
        const ids = asList(value)
          .filter((item) => item !== '')
          .map(Number);
        payload[property.code] = property.multiple ? ids : ids[0] ?? null;
        break;
      }
      case ListPropertyType.ContentLink: {
        const links = asList(value).map((item) => parseLinkValue(String(item)));
        payload[property.code] = property.multiple ? links : links[0] ?? null;
        break;
      }
      default:
        payload[property.code] = value ?? null;
    }
  }

  return payload;
}

/** Подписи свойств в истории: `props.price` → «Цена». */
export const propertyHistoryLabels = (properties: ListPropertyDto[]): Record<string, string> =>
  Object.fromEntries(properties.map((property) => [propertyKey(property.code), property.name]));
