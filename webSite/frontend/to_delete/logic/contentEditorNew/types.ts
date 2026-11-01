/**
 * Контракт нового редактора контента. Пока только таблица: раздел отдаёт
 * колонки и уже отформатированные строки, редактор их рисует.
 */

/** Колонка таблицы — данными, без разметки. Ячейка берётся из строки по `key`. */
export interface NewEditorColumn {
  key: string;
  title: string;
  width?: number;
}

/** Строка таблицы: идентификатор и готовые к показу значения по ключам колонок. */
export interface NewEditorRow {
  id: string;
  [column: string]: string;
}

/** Подключение раздела к редактору — одним объектом, пропсом от экрана. */
export interface NewEditorController {
  title: string;
  columns: NewEditorColumn[];
  rows: NewEditorRow[];
  isLoading: boolean;
  error: string | null;
}
