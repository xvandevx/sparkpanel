import {
  ContentEditor,
  standardColumns,
  standardFields,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { fileSectionsApi } from '../../logic/files';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * Раздел «Файлы», корень: дерево разделов на редакторе контента. Своего экрана
 * раздел не пишет — называет код списка, отдаёт Api и описывает колонки.
 * В раздел переходят из строки таблицы (`recordPath`): там его файлы.
 *
 * Разделы свойств «Файл» и «Изображение» приходят с флагами `isBlocked`
 * и `isReadOnly`: их собирает сервер по файлам, загруженным через
 * свойство, в базе их нет — перейти можно, править и удалять нельзя. Лежат они
 * в группе своего списка (`isGroup`, в названии путь: «Контент / SEO / Мета-теги»).
 *
 * Код раздела закрыт: его нет — сайт берёт файлы по номеру, а не по разделу.
 * Глубина дерева не закрыта: «Уровней вложенности» у разделов — обычная
 * настройка списка, по умолчанию 2 (её задаёт сервер).
 */
const SECTION_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  sort: standardFields.sort,
};

const SECTION_COLUMNS: EditorColumns = {
  name: { name: 'Раздел', size: 200, isSort: true, isSearch: true },
  filesCount: {
    name: 'Файлов',
    size: 120,
    // В группе файлов не бывает — ноль там читался бы как «пустой раздел»
    logic: (row) => (row.isGroup === true ? '' : String(row.filesCount ?? 0)),
  },
  // Группы встают выше разделов, но своей сортировки у них нет — не показываем
  sort: { ...standardColumns.sort, logic: (row) => (row.isReadOnly === true ? '' : String(row.sort ?? '')) },
};

/**
 * Журнала у разделов нет (их правки никуда не пишутся), а свойства и устройство
 * списка не настраивают: дерево и всё остальное закрыто разделом.
 */
const SECTION_VIEW: EditorSettings = {
  addLabel: 'Добавить раздел',
  isHistoryHidden: true,
  isExportHidden: true,
};

export default function FilesScreen() {
  return (
    <ContentEditor
      listKey={ListKey.fileSections}
      api={fileSectionsApi}
      blockedSettings={{
        codeMode: CodeMode.None,
        isHistoryEnabled: false,
        // Файлы заменяют загрузкой, а не правкой с публикацией
        isDraftEnabled: false,
      }}
      settings={SECTION_VIEW}
      fields={SECTION_FIELDS}
      columns={SECTION_COLUMNS}
      recordPath="/admin/files/:id"
    />
  );
}
