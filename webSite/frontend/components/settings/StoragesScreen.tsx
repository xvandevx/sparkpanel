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
import { storagesApi } from '../../logic/settings';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * «Хранилища» — подпункт «Настроек»: внешние хранилища файлов списком
 * на редакторе контента. Раздел отдаёт редактору Api и описание полей,
 * остальное редактор делает сам. Какое из них берёт новые файлы, выбирают
 * в «Настройках сайта» на вкладке «Файлы».
 *
 * Подключение — адрес, бакет, ключи — системные свойства списка: их сервер
 * заводит сам, и карточка ставит их рядом с полями раздела. Секретный ключ
 * сервер через API не отдаёт, а подключение сохраняет, только если хранилище
 * с ним отвечает. Хранилище, выбранное для новых файлов или с файлами внутри,
 * приходит с `isBlocked` — редактор не предлагает его удалить.
 */
const STORAGE_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true, note: 'Так хранилище называется в выборе' },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенное не выбрать для новых файлов; уже загруженные в него открываются',
  },
  sort: standardFields.sort,
};

const STORAGE_COLUMNS: EditorColumns = {
  name: { name: 'Хранилище', size: 200, isSort: true },
  filesCount: { name: 'Файлов', size: 100 },
  isActive: standardColumns.isActive,
  sort: standardColumns.sort,
};

/** Журнала у хранилищ нет, а свойства у них только системные — список сам по себе. */
const STORAGE_VIEW: EditorSettings = {
  addLabel: 'Добавить хранилище',
  isHistoryHidden: true,
  isListSettingsHidden: true,
};

const STORAGE_BLOCKED: BlockedSettings = {
  maxDepth: 1,
  codeMode: CodeMode.None,
  isHistoryEnabled: false,
};

export default function StoragesScreen() {
  return (
    <ContentEditor
      listKey={ListKey.storages}
      api={storagesApi}
      blockedSettings={STORAGE_BLOCKED}
      settings={STORAGE_VIEW}
      fields={STORAGE_FIELDS}
      columns={STORAGE_COLUMNS}
    />
  );
}
