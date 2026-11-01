/**
 * Дата человеку — коротко, до минут: 16.09.2026, 22:15. Чистая функция.
 * Пустое или непонятное значение — пустая строка: у записи, которую собирает
 * сервер (группа, раздел свойства), дат нет.
 */
export const formatDateTime = (value: unknown): string => {
  if (typeof value !== 'string' || value === '') return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
