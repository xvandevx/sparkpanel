import {
  ContentEditor,
  FieldType,
  standardColumns,
  standardFields,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { useUsersAccess } from '../../logic/users';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * «Роли» — роли пользователей панели на редакторе контента. Пользователю роль
 * назначают в его карточке, системным свойством «Роль»; назначенную роль
 * сервер не удалит — она приходит с `isBlocked`, и вместо корзины виден замок.
 * Кода у роли нет: назначают её по номеру. Описание и остальное о роли
 * заводят свойствами списка.
 */
const ROLE_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенная роль остаётся у пользователей, но прав не даёт',
  },
  sort: standardFields.sort,
};

const ROLE_COLUMNS: EditorColumns = {
  name: { name: 'Роль', size: 200, isSort: true, isSearch: true },
  isActive: standardColumns.isActive,
  sort: standardColumns.sort,
};

const ROOT_VIEW: EditorSettings = { addLabel: 'Добавить роль', isBackupShown: true };

/** Остальным роли на просмотр: журнал и настройки списка — часть управления. */
const READ_VIEW: EditorSettings = { isHistoryHidden: true, isListSettingsHidden: true };

export default function RolesScreen() {
  const { isRoot, rolesApi } = useUsersAccess();

  return (
    <ContentEditor
      listKey={ListKey.roles}
      api={rolesApi}
      blockedSettings={{
        maxDepth: 1,
        codeMode: CodeMode.None,
        // Роли — управление панелью, а не контент сайта: публиковать некуда
        isDraftEnabled: false,
      }}
      settings={isRoot ? ROOT_VIEW : READ_VIEW}
      fields={ROLE_FIELDS}
      columns={ROLE_COLUMNS}
    />
  );
}
