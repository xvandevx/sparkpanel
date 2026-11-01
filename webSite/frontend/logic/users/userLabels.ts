/**
 * Подписи учётной записи в таблице. Строка таблицы — запись как её отдал
 * сервер, поэтому и читаются поля как есть.
 */

/** Главный администратор в панели один — его видно сразу. */
export const rootMark = (row: Record<string, unknown>): string =>
  row.isRoot === true ? 'Главный администратор' : '';

/** Может ли человек войти: отключённый остаётся в списке. */
export const accessLabel = (row: Record<string, unknown>): string =>
  row.isActive === false ? 'Отключён' : 'Разрешён';
