/**
 * Фильтр таблицы по колонкам раздела и свойствам записей: плашка над таблицей
 * (поиск и чипы полей). Отбирает записи сервер — фильтр уходит в запрос страницы.
 * Набор полей — общий на список и лежит на сервере, выбранное — в адресе страницы.
 */
export { default as FilterPanel } from './FilterPanel';
export { useFilters } from './useFilters';
export { activeFilterEntries } from './columnFilter';
export type { FilterEntry } from './columnFilter';
