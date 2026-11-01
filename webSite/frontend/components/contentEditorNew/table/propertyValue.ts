import { linkKeyOf } from '../../../logic/contentLinks';
import { domainValuesOf, ownDomainCount } from '../../../logic/domains';
import { htmlText } from '../../../logic/htmlText';
import { PropertyType } from '../../../logic/listSettings';
import { plural } from '../../../logic/plural';
import type { FileDto } from '../../../logic/files';
import type { EditorProperty } from '../../../redux/reducers/contentEditorNewReducer';

/**
 * Значение свойства — в ячейку таблицы. В записи лежит то, что понимает
 * сервер: код варианта, номер файла, привязка `{ listKey, recordId }`;
 * человеку нужны подпись варианта, имя файла и название записи.
 *
 * Чистая функция: файлы и названия привязок приходят готовыми.
 */

/** Что в ячейке: текст, а у изображения — ещё и превью. */
export interface PropertyCellContent {
  text: string;
  /** Адреса картинок для превью; у остальных типов пусто */
  images: string[];
}

/** Откуда брать то, чего в значении нет: файлы по номеру и названия привязок. */
export interface PropertyLookup {
  fileById: Map<number, FileDto>;
  /** Ключ привязки «список/запись» → название записи */
  linkNames: Map<string, string>;
}

export function propertyValue(
  property: EditorProperty,
  value: unknown,
  lookup: PropertyLookup,
): PropertyCellContent {
  // У мультидоменного в ячейке — значение для всех доменов и сколько у него
  // своих по доменам: показать все рядом таблице негде
  if (property.isMultiDomain === true) {
    const values = domainValuesOf(value);
    const content = singleValue(property, values[0].value, lookup);
    const count = ownDomainCount(values);
    if (count === 0) return content;
    const more = `+${plural(count, 'домен', 'домена', 'доменов')}`;
    return { ...content, text: [content.text, more].filter(Boolean).join(' ') };
  }
  return singleValue(property, value, lookup);
}

function singleValue(
  property: EditorProperty,
  value: unknown,
  lookup: PropertyLookup,
): PropertyCellContent {
  // У таблицы массив — это её строки, а не несколько значений
  const items =
    property.type !== PropertyType.Table && Array.isArray(value)
      ? value
      : value === null || value === undefined || value === ''
        ? []
        : [value];
  const text = (list: string[]) => ({ text: list.filter(Boolean).join(', '), images: [] });

  switch (property.type) {
    case PropertyType.List:
    case PropertyType.ListOptionLink: {
      // Значение — номер варианта, в ячейке — его название
      const options = (property.options as { id: number; name: string }[] | undefined) ?? [];
      return text(items.map((id) => options.find((option) => option.id === Number(id))?.name ?? String(id)));
    }
    case PropertyType.File:
      return text(items.map((id) => lookup.fileById.get(Number(id))?.name ?? ''));
    case PropertyType.Image: {
      const files = items.map((id) => lookup.fileById.get(Number(id)));
      return {
        text: '',
        images: files.flatMap((file) => (file ? [file.url] : [])),
      };
    }
    case PropertyType.ContentLink:
    case PropertyType.ContentTypeLink:
      return text(items.map((link) => lookup.linkNames.get(linkKeyOf(link) ?? '') ?? ''));
    // Таблица в ячейку не влезает — показываем, сколько в ней строк
    case PropertyType.Table: {
      const rows = Array.isArray(value) ? value.length : 0;
      return text(rows > 0 ? [plural(rows, 'строка', 'строки', 'строк')] : []);
    }
    // В ячейке разметка не нужна — только текст из неё
    case PropertyType.Html:
      return text(items.map((html) => htmlText(String(html))));
    default:
      return text(items.map(String));
  }
}
