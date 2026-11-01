/**
 * Публичный вход редактора контента. Разделы подключают только `ContentEditor`;
 * его внутренняя раскладка (header / table / drawer / fields / history) —
 * деталь реализации и меняется, не затрагивая страницы.
 */
export { default as ContentEditor } from './ContentEditor';
