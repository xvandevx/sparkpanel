import { PASSWORD_MIN_LENGTH, validateEmail, validatePassword } from '../auth/validate';
import {
  EditorColumnVariant,
  EditorFieldType,
  formatDateTime,
  type EditorColumnDef,
  type EditorFieldDef,
  type EditorTabDef,
  type EditorValues,
} from '../contentEditor';

/**
 * Описание раздела «Пользователи» для универсального редактора: колонки таблицы,
 * поля формы и вкладки шторки. Чистые данные — ни React, ни сети.
 */

export const USER_ROLE_LABELS: Record<string, string> = {
  root: 'Администратор',
  user: 'Пользователь',
};

/** Главный администратор: его роль и доступ не редактируются ни при каких правах. */
const isRoot = (values: EditorValues): boolean => values.role === 'root';

export const userColumns = (): EditorColumnDef[] => [
  {
    key: 'email',
    title: 'Email',
    dataIndex: 'email',
    width: 300,
    variant: EditorColumnVariant.Code,
    hint: (record) =>
      record.role === 'root' ? 'Главный администратор — доступ ко всей панели' : null,
  },
  {
    key: 'name',
    title: 'Имя',
    width: 220,
    value: (record) => String(record.name || '—'),
  },
  {
    key: 'role',
    title: 'Роль',
    width: 170,
    variant: EditorColumnVariant.Tag,
    value: (record) => USER_ROLE_LABELS[String(record.role)] ?? String(record.role),
    color: (record) => (record.role === 'root' ? 'blue' : 'default'),
  },
  {
    key: 'isActive',
    title: 'Доступ',
    dataIndex: 'isActive',
    width: 110,
    variant: EditorColumnVariant.Flag,
  },
  {
    key: 'createdAt',
    title: 'Заведён',
    width: 190,
    value: (record) => formatDateTime(record.createdAt as string),
  },
];

/**
 * Поля формы.
 *
 * `canEdit` — право правки (только у главного администратора): у остальных поля
 * видны, но заблокированы. `isNew` — записи ещё нет, и пароль для неё обязателен;
 * у существующей пустое поле пароля означает «оставить прежний».
 */
export function userFields(params: { canEdit: boolean; isNew: boolean }): EditorFieldDef[] {
  const { canEdit, isNew } = params;
  const locked = () => !canEdit;

  return [
    {
      key: 'id',
      label: 'Идентификатор',
      type: EditorFieldType.ReadOnly,
      note: 'Присваивается системой и не меняется',
    },
    {
      key: 'email',
      label: 'Email',
      type: EditorFieldType.Text,
      required: true,
      placeholder: 'editor@copanel.app',
      note: 'Он же логин для входа в панель',
      disabled: locked,
      validate: (value) => validateEmail(String(value ?? '')),
    },
    {
      key: 'password',
      label: isNew ? 'Пароль' : 'Новый пароль',
      type: EditorFieldType.Password,
      required: isNew,
      placeholder: isNew ? `Минимум ${PASSWORD_MIN_LENGTH} символов` : 'Оставьте пустым',
      note: isNew
        ? `Минимум ${PASSWORD_MIN_LENGTH} символов. Показать его потом будет нельзя — панель хранит только хэш.`
        : 'Пустое поле — пароль остаётся прежним. Заполненное — будет заменён.',
      disabled: locked,
      // Пустой пароль у существующей записи — это «не менять», а не ошибка.
      validate: (value) => {
        const password = String(value ?? '');
        if (!isNew && !password) return null;
        return validatePassword(password);
      },
    },
    {
      key: 'name',
      label: 'Имя',
      type: EditorFieldType.Text,
      placeholder: 'Мария',
      note: 'Показывается в панели и в журнале изменений',
      disabled: locked,
    },
    {
      key: 'roleLabel',
      label: 'Роль',
      type: EditorFieldType.ReadOnly,
      note: 'Главный администратор в системе один и назначается при первичной настройке',
    },
    {
      key: 'isActive',
      label: 'Доступ в панель',
      type: EditorFieldType.Switch,
      note: 'Выключенный пользователь остаётся в списке, но войти не может',
      // Отключить главного администратора нельзя: войти после этого будет некому
      disabled: (values) => locked() || isRoot(values),
    },
    {
      key: 'createdAt',
      label: 'Учётная запись заведена',
      type: EditorFieldType.ReadOnly,
    },
    {
      key: 'passwordChangedAt',
      label: 'Пароль изменён',
      type: EditorFieldType.ReadOnly,
    },
  ];
}

export const userTabs = (): EditorTabDef[] => [
  {
    key: 'account',
    label: 'Учётная запись',
    groups: [
      {
        key: 'login',
        title: 'Вход в систему',
        description: 'Email и пароль, с которыми пользователь входит в панель',
        fields: ['email', 'password'],
      },
      {
        key: 'profile',
        title: 'Профиль и доступ',
        fields: ['name', 'roleLabel', 'isActive'],
      },
      {
        key: 'system',
        title: 'Системные данные',
        description: 'Заполняются системой, вручную не меняются',
        fields: ['id', 'createdAt', 'passwordChangedAt'],
      },
    ],
  },
];

/**
 * Подписи полей в истории изменений: ключи те же, что в снимке на бэкенде.
 * Пароля в снимке нет — только дата его смены: сам пароль в журнал не попадает.
 */
export const USER_HISTORY_LABELS: Record<string, string> = {
  email: 'Email',
  name: 'Имя',
  role: 'Роль',
  isActive: 'Доступ в панель',
  passwordChangedAt: 'Пароль изменён',
};
