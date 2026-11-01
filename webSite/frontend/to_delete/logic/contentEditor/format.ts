import type { EditorHistoryAction } from './types';

/** Форматирование для таблиц редактора: даты, значения полей, подписи действий. */

export const HISTORY_ACTION_LABELS: Record<EditorHistoryAction, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
};

export const HISTORY_ACTION_COLORS: Record<EditorHistoryAction, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
};

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('ru-RU');
}

/** Длинные значения в истории обрезаются: столбец «Было/Стало» должен читаться. */
const MAX_VALUE_LENGTH = 600;

const cut = (value: string): string =>
  value.length > MAX_VALUE_LENGTH ? `${value.slice(0, MAX_VALUE_LENGTH)}…` : value;

export function formatHistoryValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return cut(value);

  try {
    return cut(JSON.stringify(value, null, 2));
  } catch {
    return String(value);
  }
}

/** Подпись поля в истории; неизвестный ключ показываем как есть — так видно новое поле. */
export const historyFieldLabel = (
  labels: Record<string, string>,
  field: string,
): string => labels[field] ?? field;
