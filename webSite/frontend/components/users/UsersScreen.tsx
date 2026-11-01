import {
  ContentEditor,
  FieldType,
  standardColumns,
  standardFields,
  type EditorColumns,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { accessLabel, rootMark, useUsersAccess } from '../../logic/users';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * «Пользователи» — учётные записи панели на редакторе контента. Своего экрана
 * раздел не пишет: называет код списка, отдаёт Api и описывает поля.
 *
 * Роли среди полей нет: её назначают системным свойством «Роль» — сервер
 * заводит его сам, и карточка ставит его рядом с полями раздела. Удалить можно
 * любого, кроме главного администратора: он приходит с `isBlocked` и отмечен
 * меткой у email.
 */
const USER_FIELDS: EditorFields = {
  name: { name: 'Имя', note: 'Показывается в панели и в журнале изменений' },
  email: { name: 'Email', isRequired: true, note: 'Он же логин для входа в панель' },
  password: {
    name: 'Пароль',
    type: FieldType.Password,
    note: 'У нового пользователя обязателен, не короче 6 символов. У сохранённого пустое поле — пароль прежний: панель хранит только хэш и показать его не может',
  },
  isActive: {
    name: 'Доступ в панель',
    type: FieldType.Switch,
    note: 'Выключенный пользователь остаётся в списке, но войти не может. Главного администратора отключить и удалить нельзя',
  },
  sort: standardFields.sort,
};

const USER_COLUMNS: EditorColumns = {
  email: {
    name: 'Email',
    size: 280,
    isSort: true,
    isSearch: true,
    // Метка у email, а не только своя колонка: колонку могут спрятать в виде таблицы
    badge: { key: 'isRoot', name: 'Главный администратор', color: 'gold' },
  },
  name: { name: 'Имя', size: 240, isSort: true, isSearch: true },
  isRoot: { name: 'Администратор', size: 220, logic: rootMark },
  isActive: { name: 'Вход', size: 120, logic: accessLabel },
  sort: standardColumns.sort,
};

/** Главный администратор видит всё: журнал, настройки списка, «Добавить». */
const ROOT_VIEW: EditorSettings = { addLabel: 'Добавить пользователя', isBackupShown: true };

/** Остальным список на просмотр: журнал и настройки списка — часть управления. */
const READ_VIEW: EditorSettings = { isHistoryHidden: true, isListSettingsHidden: true };

export default function UsersScreen() {
  const { isRoot, usersApi } = useUsersAccess();

  return (
    <ContentEditor
      listKey={ListKey.users}
      api={usersApi}
      // Кода у учётной записи нет — её находят по email, вложенности тоже нет
      blockedSettings={{
        maxDepth: 1,
        codeMode: CodeMode.None,
        // Учётные записи — управление панелью, а не контент сайта: публиковать некуда
        isDraftEnabled: false,
      }}
      settings={isRoot ? ROOT_VIEW : READ_VIEW}
      fields={USER_FIELDS}
      columns={USER_COLUMNS}
    />
  );
}
