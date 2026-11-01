import type { EditorHistoryAction } from '../../../redux/action-creaters/contentEditorNew';
import type { EditorProperty } from '../../../redux/reducers/contentEditorNewReducer';
import type { EditorFields } from '../drawer';

/**
 * Журнал человеку: подписи действий и полей, даты, значения. Чистые функции —
 * ни React, ни сети; разметку по ним рисует таблица истории.
 */

export const ACTION_LABELS: Record<EditorHistoryAction, string> = {
  create: 'Создание',
  update: 'Изменение',
  delete: 'Удаление',
};

export const ACTION_COLORS: Record<EditorHistoryAction, string> = {
  create: 'green',
  update: 'blue',
  delete: 'red',
};

/**
 * Подписи полей, которые сервер пишет в журнал у любой записи. Поля раздела
 * и свойства подписываются по своим описаниям — см. `historyLabels`.
 */
const COMMON_LABELS: Record<string, string> = {
  name: 'Название',
  code: 'Код',
  isActive: 'Активность',
  parentId: 'Родитель',
  position: 'Порядок',
  // Номер записи в системе-источнике: его пишет интеграция
  externalId: 'Внешний ID',
  // Родитель записи в дереве, которое ведут настройки списка
  'tree.parentId': 'Родитель',
};

/** Свойства лежат в журнале под своим кодом с приставкой: `props.price`. */
const PROPERTY_PREFIX = 'props.';

/**
 * Ключ поля журнала → подпись: общие поля, поля раздела, свойства записей.
 * Свойство подписывается текущим именем: журнал хранит код, и переименованное
 * свойство в старых правках показывается по-новому — это одно и то же свойство.
 */
export const historyLabels = (
  fields: EditorFields,
  properties: EditorProperty[],
): Record<string, string> => ({
  ...COMMON_LABELS,
  ...Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.name])),
  ...Object.fromEntries(
    properties.map((property) => [`${PROPERTY_PREFIX}${property.code}`, property.name]),
  ),
});

/** Подпись поля; незнакомое (удалённое свойство) — как его записал сервер. */
export const fieldLabel = (labels: Record<string, string>, field: string): string =>
  labels[field] ?? field;

/** Когда правили: 16.09.2026, 22:15:04. */
export const formatHistoryDate = (value: string): string => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('ru-RU');
};

/** Длинные значения обрезаются: столбцы «Было» и «Стало» должны читаться. */
const MAX_VALUE_LENGTH = 400;

const cut = (text: string): string =>
  text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;

/** Значение поля в журнале: пустое — прочерком, логическое — словом. */
export const formatHistoryValue = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value === 'string') return cut(value);
  if (typeof value === 'number') return String(value);
  return cut(JSON.stringify(value, null, 2));
};
