import { PropertyType } from '../../../logic/listSettings';
import type { EditorProperty, EditorTab } from '../../../redux/reducers/contentEditorNewReducer';
import { linkListOf } from '../../../logic/contentLinks';
import { FieldType, type EditorField, type EditorFields } from './record';

/**
 * Свойства записей — в поля карточки. Свойство описывает сам пользователь
 * в «Настройках списка», поэтому поле собирается из него, а не из раздела.
 *
 * Файл и изображение загружают прямо из поля в раздел свойства в «Файлах».
 * Привязку к записям выбирают из записей списка, который задан в свойстве, —
 * так пользователю назначают роль; привязка к типу контента — та же привязка,
 * только выбирают всегда из типов раздела «Контент».
 */

/** Вкладка карточки «Свойства»: сюда попадают свойства без своей вкладки. */
export const MAIN_TAB = '';

/** Типы, поле которых карточка уже умеет рисовать. */
const EDITABLE: Record<string, FieldTypeValueOf> = {
  [PropertyType.String]: FieldType.String,
  [PropertyType.Number]: FieldType.Number,
  [PropertyType.Text]: FieldType.Text,
  [PropertyType.Html]: FieldType.Html,
  [PropertyType.List]: FieldType.List,
  // Варианты у привязки — того «Списка», на который она смотрит: их подставил сервер
  [PropertyType.ListOptionLink]: FieldType.List,
  [PropertyType.File]: FieldType.File,
  [PropertyType.Image]: FieldType.Image,
  [PropertyType.ContentLink]: FieldType.Link,
  [PropertyType.ContentTypeLink]: FieldType.Link,
  [PropertyType.Table]: FieldType.Table,
};

type FieldTypeValueOf = EditorField['type'];

/** Пояснение под полем скрытого свойства: почему оно пустое. */
const HIDDEN_NOTE = 'Значение не показывается после сохранения: оставьте пустым, чтобы не менять';

/** Пояснение под полем свойства из внешнего источника: почему оно закрыто. */
const EXTERNAL_NOTE = 'Заполняется из внешнего источника — в панели не правится';

/** Свойство — в поле карточки. */
export const propertyField = (property: EditorProperty): EditorField => {
  const type = EDITABLE[property.type];
  const isMultiple = property.multiple === true;

  if (type === undefined) {
    return {
      name: property.name,
      type: FieldType.String,
      note: 'Поле этого типа пока не правится',
      isReadOnly: true,
    };
  }

  // Подсказку свойству задают в его настройках — карточка ставит её под полем,
  // как пояснения полей раздела
  const hint = String(property.hint ?? '').trim();

  // Скрытое значение сервер не отдаёт: поле всегда пустое, набранное заменит
  // сохранённое. Обязательным его не держим — у сохранённой записи пустое
  // поле значит «прежнее», а не «нет значения»
  if (property.isHidden === true) {
    return {
      name: property.name,
      type: FieldType.Password,
      note: [hint, HIDDEN_NOTE].filter(Boolean).join('. '),
      ...(property.isExternal === true ? { isExternal: true } : {}),
    };
  }

  // Значение из внешнего источника в карточке не заполнить — и обязательным
  // для неё оно не бывает: его допишет сама внешняя система
  const isExternal = property.isExternal === true;
  const note = [hint, isExternal ? EXTERNAL_NOTE : ''].filter(Boolean).join('. ');

  return {
    name: property.name,
    type,
    ...(note ? { note } : {}),
    isRequired: property.required === true && !isExternal,
    ...(isExternal ? { isExternal } : {}),
    isMultiple,
    isMultiDomain: property.isMultiDomain === true,
    options: (property.options as { id: number; code: string; name: string }[] | undefined) ?? [],
    ...(type === FieldType.File || type === FieldType.Image
      ? {
          upload: {
            propertyId: property.id,
            isImageOnly: type === FieldType.Image,
            formats: (property.formats as string[] | undefined) ?? [],
            maxSizeMb: (property.maxSizeMb as number | null | undefined) ?? null,
            maxWidth: (property.maxWidth as number | null | undefined) ?? null,
            maxHeight: (property.maxHeight as number | null | undefined) ?? null,
          },
        }
      : {}),
    // Картинки в разметку грузят в раздел свойства, как у поля «Изображение», —
    // любые изображения, без ограничений формата и веса
    ...(type === FieldType.Html
      ? {
          upload: {
            propertyId: property.id,
            isImageOnly: true,
            formats: [],
            maxSizeMb: null,
            maxWidth: null,
            maxHeight: null,
          },
        }
      : {}),
    ...(type === FieldType.Link ? { linkList: linkListOf(property) } : {}),
    ...(type === FieldType.Table
      ? {
          table: {
            columns: (property.columns as number | null | undefined) ?? 1,
            headers: (property.headers as string[] | undefined) ?? [],
          },
        }
      : {}),
  };
};

/**
 * Ключ поля свойства — **номер** свойства (им значение уходит на сервер, а код
 * могут и переименовать), но с приставкой. Голый номер не годится: ключи-числа
 * объект ставит по возрастанию, а не по порядку вставки, — и поля встали бы
 * по номерам свойств, а не по их сортировке (системное «Роль» — в самый низ).
 */
const FIELD_PREFIX = 'property-';

/** Значения свойств записи, как их держит стор (по номерам), — в ключи полей карточки. */
export const fieldValuesOf = (values: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(values).map(([id, value]) => [`${FIELD_PREFIX}${id}`, value]));

/** Набранное в полях свойств — обратно к номерам: так значения ждёт сервер. */
export const propertyValuesOf = (values: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key.slice(FIELD_PREFIX.length), value]),
  );

/** Свойства одной вкладки карточки — её полями, в порядке сортировки свойств. */
export const tabFields = (properties: EditorProperty[], tab: string): EditorFields =>
  Object.fromEntries(
    properties
      .filter((property) => String(property.tab ?? '') === tab)
      .map((property) => [`${FIELD_PREFIX}${property.id}`, propertyField(property)]),
  );

/**
 * Вкладки карточки: первой всегда «Запись» — поля раздела и свойства, которым
 * вкладку не назначили. Остальные идут как в настройках списка.
 */
export const cardTabs = (
  tabs: EditorTab[],
  properties: EditorProperty[],
): { key: string; name: string; fields: EditorFields }[] => [
  { key: MAIN_TAB, name: 'Запись', fields: tabFields(properties, MAIN_TAB) },
  ...tabs.map((tab) => ({
    key: tab.code,
    name: tab.name.trim() || tab.code,
    fields: tabFields(properties, tab.code),
  })),
];
