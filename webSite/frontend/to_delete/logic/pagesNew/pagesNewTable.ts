import type { PageDto } from '../../src/api/client';
import type { NewEditorColumn, NewEditorRow } from '../contentEditorNew';

/** Колонки и строки таблицы страниц для нового редактора. Чистые функции. */

export const pagesNewColumns: NewEditorColumn[] = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'name', title: 'Название' },
  { key: 'code', title: 'Код', width: 200 },
  { key: 'isActive', title: 'Активна', width: 120 },
];

export const toPagesNewRows = (items: PageDto[]): NewEditorRow[] =>
  [...items]
    .sort((a, b) => a.id - b.id)
    .map((page) => ({
      id: String(page.id),
      name: page.name,
      code: page.code || '—',
      isActive: page.isActive ? 'Да' : 'Нет',
    }));
