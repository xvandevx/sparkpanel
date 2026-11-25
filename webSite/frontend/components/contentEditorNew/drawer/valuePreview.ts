import { htmlText } from '../../../logic/htmlText';
import { plural } from '../../../logic/plural';
import { FieldType, isFileField, type EditorField } from './record';

/**
 * Значение поля одной строкой — для свёрнутой строки мультидоменного поля:
 * по ней узнают, что там, не раскрывая. Значение — как в черновике карточки:
 * у «Списка» номера вариантов, у таблицы строки ячеек. Пусто — пустая строка.
 *
 * Названий файлов и привязанных записей здесь нет (их знает только само поле),
 * поэтому у них — сколько выбрано.
 */
export const valuePreview = (field: EditorField, value: unknown): string => {
  // У таблицы массив — это её строки, а не несколько значений
  if (field.type === FieldType.Table) {
    const rows = Array.isArray(value) ? value.filter((row) => Array.isArray(row) && row.some(Boolean)).length : 0;
    return rows > 0 ? plural(rows, 'строка', 'строки', 'строк') : '';
  }

  const items = (Array.isArray(value) ? value : [value]).filter(
    (item) => item !== null && item !== undefined && item !== '',
  );
  if (items.length === 0) return '';

  if (isFileField(field)) return plural(items.length, 'файл', 'файла', 'файлов');
  if (field.type === FieldType.Link) return plural(items.length, 'запись', 'записи', 'записей');
  if (field.type === FieldType.Password) return '••••••';
  if (field.type === FieldType.Switch) return value === true ? 'Да' : 'Нет';
  if (field.type === FieldType.List) {
    const options = field.options ?? [];
    return items.map((id) => options.find((option) => option.id === Number(id))?.name ?? String(id)).join(', ');
  }
  if (field.type === FieldType.Html) return items.map((html) => htmlText(String(html))).filter(Boolean).join(' ');
  return items.map(String).join(', ');
};
