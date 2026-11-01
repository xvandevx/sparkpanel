import {
  ContentEditor,
  FieldType,
  standardColumns,
  standardFields,
  type BlockedSettings,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { contentsApi } from '../../logic/contents';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * Раздел «Контент», корень: типы контента («Новости», «Статьи») на редакторе
 * контента. Своего экрана раздел не пишет — называет код списка, отдаёт Api
 * и описывает колонки. В тип переходят из строки таблицы (`recordPath`):
 * там его элементы.
 *
 * Тип с элементами или вложенными типами сервер не удалит — он приходит
 * с `isBlocked`, и вместо корзины виден замок. Код и родителя добавляет
 * редактор по настройкам списка; глубина дерева — обычная настройка.
 */
const CONTENT_FIELDS: EditorFields = {
  name: {
    name: 'Название',
    isRequired: true,
    note: 'Оно же — имя списка элементов типа',
  },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Элементы выключенного типа на сайт не попадают',
  },
  sort: standardFields.sort,
};

const CONTENT_COLUMNS: EditorColumns = {
  ...standardColumns,
  itemsCount: { name: 'Элементов', size: 120 },
};

const CONTENT_VIEW: EditorSettings = { addLabel: 'Добавить тип' };

/**
 * Имя списка закрыто: так раздел назван в крошках и над таблицей. Код типа
 * обязателен: он же код списка его элементов, по нему этот список находит
 * сайт. Занят другим списком — сервер не сохранит тип.
 */
const CONTENT_BLOCKED: BlockedSettings = {
  codeMode: CodeMode.Required,
  // Тип — структура разделов, а не контент: черновики бывают у его элементов
  isDraftEnabled: false,
};

export default function ContentsScreen() {
  return (
    <ContentEditor
      listKey={ListKey.contents}
      api={contentsApi}
      blockedSettings={CONTENT_BLOCKED}
      settings={CONTENT_VIEW}
      fields={CONTENT_FIELDS}
      columns={CONTENT_COLUMNS}
      recordPath="/admin/contents/:id"
    />
  );
}
