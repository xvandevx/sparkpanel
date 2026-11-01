import { EditorFieldType, type EditorFieldDef, type EditorValues } from '../editorForm';
import { NEW_RECORD_ID } from './editorApi';
import { rowPath } from './recordPath';
import { PATH_FIELD, SORT_FIELD } from './standardFields';
import type { EditorRecord, EditorRow } from './types';

/**
 * Запись ↔ значения формы ↔ тело запроса — по описанию полей, без кода раздела.
 *
 * Раньше каждый раздел писал три почти одинаковые функции (`valuesOf`,
 * `emptyValues`, `toPayload`), где поле за полем повторялись одни и те же
 * приведения: строка через `String(… ?? '')`, выключатель через `!== false`,
 * пустой текст в `null`. Поле и так описано типом — значит, приведение выводится
 * из описания, а не пишется заново.
 *
 * Чистые функции: ни React, ни сети.
 */

/** Шаг порядка: между соседями остаётся место, чтобы вставить запись посередине. */
export const POSITION_STEP = 100;

/** Ключи полей, которые редактор ведёт сам. */
const ID_FIELD = 'id';

const PARENT_FIELD = 'parentId';

/** Поля без значения: они ничего не хранят и в запрос не уходят. */
const VIEW_ONLY: EditorFieldType[] = [EditorFieldType.ReadOnly, EditorFieldType.Links];

const text = (value: unknown): string => String(value ?? '').trim();

/** Значения формы по записи списка. */
export function recordValues(fields: EditorFieldDef[], record: EditorRecord): EditorValues {
  const values: EditorValues = {};

  for (const field of fields) {
    // «Сортировка» в карточке — это `position` записи: в базе поле называется так
    const raw = field.key === SORT_FIELD ? record.position : record[field.key];

    switch (field.type) {
      case EditorFieldType.Switch:
        // Выключателю по умолчанию «включено»: так ведут себя флаги активности
        values[field.key] = raw !== false;
        break;

      case EditorFieldType.Number:
        values[field.key] = typeof raw === 'number' ? raw : field.nullable ? null : 0;
        break;

      case EditorFieldType.Select:
        values[field.key] = raw === undefined || raw === null ? null : String(raw);
        break;

      case EditorFieldType.Media:
      case EditorFieldType.Table:
      case EditorFieldType.Tags:
      case EditorFieldType.File:
        // Значение составное — отдаём как есть, приводить тут нечего
        values[field.key] = raw ?? null;
        break;

      default:
        values[field.key] = raw === undefined || raw === null ? '' : String(raw);
    }
  }

  return values;
}

/**
 * Значения формы новой записи. Порядок считается по уже существующим — за
 * последним; остальное берётся из `defaultValue` поля, а без него — из пустого
 * значения его типа.
 */
export function emptyRecordValues(
  fields: EditorFieldDef[],
  rows: EditorRow[],
  /** Внутри какой записи создаём: у дерева порядок и адрес считаются среди соседей */
  parentId: string | null = null,
): EditorValues {
  const values: EditorValues = {};
  const siblings = siblingsOf(rows, parentId);

  for (const field of fields) {
    if (field.key === ID_FIELD) {
      // Ключа ещё нет, но поле в карточке есть — пишем в него, что его выдаст сервер
      values[field.key] = NEW_RECORD_ID;
      continue;
    }
    if (field.key === PARENT_FIELD && field.defaultValue === undefined) {
      // «Добавить внутрь» — это и есть выбранный родитель
      values[field.key] = parentId;
      continue;
    }
    if (field.key === PATH_FIELD) {
      // Кода у новой записи ещё нет, поэтому адрес пока родительский
      values[field.key] = rowPath(rows, parentId, '');
      continue;
    }
    if (field.key === SORT_FIELD && field.defaultValue === undefined) {
      values[field.key] = nextPosition(siblings);
      continue;
    }
    if (field.defaultValue !== undefined) {
      values[field.key] = field.defaultValue;
      continue;
    }

    switch (field.type) {
      case EditorFieldType.Switch:
        values[field.key] = true;
        break;
      case EditorFieldType.Number:
        values[field.key] = field.nullable ? null : 0;
        break;
      case EditorFieldType.Select:
        values[field.key] = null;
        break;
      case EditorFieldType.Media:
      case EditorFieldType.Table:
      case EditorFieldType.Tags:
      case EditorFieldType.File:
        values[field.key] = null;
        break;
      default:
        values[field.key] = '';
    }
  }

  return values;
}

/** Соседи будущей записи: те, кто лежит внутри того же родителя. */
function siblingsOf(rows: EditorRow[], parentId: string | null): EditorRow[] {
  if (parentId === null) return rows;

  const find = (list: EditorRow[]): EditorRow[] | null => {
    for (const row of list) {
      if (row.id === parentId) return row.children ?? [];
      const inside = row.children?.length ? find(row.children) : null;
      if (inside) return inside;
    }
    return null;
  };

  return find(rows) ?? rows;
}

/** Порядок следующей записи: за самой дальней из уже существующих. */
export function nextPosition(rows: EditorRow[]): number {
  const last = rows.reduce((max, row) => Math.max(max, Number(row.position) || 0), 0);
  return last + POSITION_STEP;
}

/**
 * Тело запроса по значениям формы. Поля, которые ничего не хранят
 * (идентификатор, ссылки), не отправляются; строки обрезаются по краям,
 * а у необязательного поля пустая строка уходит как `null` — так его и ждёт
 * бэкенд, для которого «не заполнено» и «пустая строка» разные вещи.
 */
export function recordPayload(
  fields: EditorFieldDef[],
  values: EditorValues,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  for (const field of fields) {
    if (VIEW_ONLY.includes(field.type)) continue;
    const value = values[field.key];
    const key = field.key === SORT_FIELD ? 'position' : field.key;

    switch (field.type) {
      case EditorFieldType.Switch:
        payload[key] = value !== false;
        break;

      case EditorFieldType.Number:
        payload[key] = field.nullable && value === null ? null : Number(value) || 0;
        break;

      case EditorFieldType.Media:
      case EditorFieldType.Table:
      case EditorFieldType.Tags:
      case EditorFieldType.File:
        payload[key] = value ?? null;
        break;

      default: {
        const trimmed = text(value);
        payload[key] = trimmed === '' && field.nullable ? null : trimmed;
      }
    }
  }

  return payload;
}
