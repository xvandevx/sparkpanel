import {
  ContentEditor,
  FieldType,
  standardColumns,
  standardFields,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { pagesApi } from '../../logic/pages';
import { ListKey } from '../../logic/listSettings';

/**
 * Раздел «Страницы» на новом редакторе контента: пока таблица страниц.
 * Своего экрана раздел не пишет — называет код списка, отдаёт Api, где лежат
 * записи, и описывает колонки. Полный адрес страницы складывает сервер
 * из сегментов родителей и отдаёт полем `path`: по нему и ищут.
 *
 * Две настройки списка раздел закрывает: страницы вкладываются друг в друга
 * по самой своей природе, а сайт ищет их по коду `pages`. Символьный код
 * записей — как у любого списка: к адресу он не относится.
 */
/**
 * Поля карточки страницы — ровно те, что есть у самой страницы. Кода
 * и родителя здесь нет: их добавляет редактор по настройкам списка. Адреса
 * тоже: это системное свойство «Адрес», его сервер заводит сам, и карточка
 * ставит его рядом с полями раздела; текст — такое же свойство, только
 * заведённое в «Настройках». Вынесены из компонента: у литерала внутри
 * каждый рендер новая ссылка.
 */
const PAGE_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенная страница на сайте не открывается',
  },
  sort: standardFields.sort,
};

/**
 * Колонки таблицы страниц — они же колонки по умолчанию в шторке «Колонки
 * таблицы». Константой модуля, а не литералом: по ссылке редактор решает,
 * не пора ли пересобрать вид таблицы.
 */
const PAGE_COLUMNS: EditorColumns = {
  name: { name: 'Название', size: 200, isSort: true, isSearch: true },
  path: { name: 'Адрес', size: 260, isSort: true, isSearch: true },
  isActive: {
    name: 'Активность',
    size: 140,
    logic: (row) => (row.isActive === false ? 'Нет' : 'Да'),
  },
  sort: standardColumns.sort,
};

/** Страницы — контент сайта: их список можно снять резервной копией и вернуть. */
const PAGE_VIEW: EditorSettings = { isBackupShown: true };

export default function PagesScreen() {
  return (
    <ContentEditor
      listKey={ListKey.pages}
      api={pagesApi}
      settings={PAGE_VIEW}
      blockedSettings={{
        // Дерево без предела: страницы вкладываются друг в друга по своей природе
        maxDepth: null,
      }}
      fields={PAGE_FIELDS}
      columns={PAGE_COLUMNS}
    />
  );
}
