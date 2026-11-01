import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../redux';
import {
  loadUserHistoryThunk,
  loadUsersJournalThunk,
} from '../../redux/action-creaters/users';
import type { CreateUserDto, UpdateUserDto } from '../../src/api/client';
import { useLogin } from '../auth';
import {
  formatDateTime,
  toEditorHistoryPage,
  toEditorHistoryRecord,
  useRecordRoute,
  type ContentEditorController,
  type EditorRecord,
  type EditorRow,
  type EditorValues,
} from '../contentEditor';
import { ListKey } from '../listSettings';
import {
  USER_HISTORY_LABELS,
  USER_ROLE_LABELS,
  userColumns,
  userFields,
  userTabs,
} from './usersFields';
import { useUsersActions } from './useUsersActions';

/**
 * Раздел «Пользователи» для универсального редактора контента: учётные записи панели.
 *
 * Два отличия от остальных разделов, оба следуют из предметной области:
 * список видят все, а правит только главный администратор (`readOnly` у остальных);
 * удаления нет вовсе — доступ забирают выключателем, иначе данные учётной записи
 * (страницы, настройки, авторство в журнале) остались бы без хозяина.
 */
export const useUsersController = (): ContentEditorController => {
  const { items, loading, saving, error } = useSelector((state: RootState) => state.users);
  const { user } = useLogin();
  const { save: saveUser } = useUsersActions();
  const { selectedId } = useRecordRoute();
  const dispatch = useDispatch<AppDispatch>();

  const canEdit = user?.role === 'root';

  // Дерева у учётных записей нет — таблица плоская. Идентификатор редактор ждёт строкой.
  const rows = useMemo<EditorRow[]>(
    () => items.map((item) => ({ ...item, id: String(item.id) })),
    [items],
  );

  // Записи ещё нет в адресе страницы — значит открыта форма новой:
  // пароль для неё обязателен, у существующей пустое поле означает «не менять».
  const fields = useMemo(
    () => userFields({ canEdit, isNew: selectedId === null }),
    [canEdit, selectedId],
  );

  const valuesOf = useCallback(
    (record: EditorRecord): EditorValues => ({
      id: record.id,
      email: String(record.email ?? ''),
      // Пароль не приходит с сервера и не может прийти: наружу отдаётся только хэш-безопасный
      // UserDto. Поле всегда открывается пустым — это «новый пароль», а не текущий.
      password: '',
      name: String(record.name ?? ''),
      role: String(record.role ?? 'user'),
      roleLabel: USER_ROLE_LABELS[String(record.role)] ?? String(record.role),
      isActive: record.isActive !== false,
      createdAt: formatDateTime(record.createdAt as string),
      passwordChangedAt: formatDateTime(record.passwordChangedAt as string),
    }),
    [],
  );

  const emptyValues = useCallback(
    (): EditorValues => ({
      id: NEW_RECORD_ID,
      email: '',
      password: '',
      name: '',
      role: 'user',
      roleLabel: USER_ROLE_LABELS.user,
      isActive: true,
      createdAt: '',
      passwordChangedAt: '',
    }),
    [],
  );

  const save = useCallback(
    async ({ id, values }: { id: string | null; values: EditorValues }) => {
      const saved = await saveUser(id ? Number(id) : null, toUserPayload(values, id === null));
      return saved ? String(saved.id) : null;
    },
    [saveUser],
  );

  const loadRecordHistory = useCallback(
    async (id: string) =>
      (await dispatch(loadUserHistoryThunk(Number(id)))).map(toEditorHistoryRecord),
    [dispatch],
  );

  const loadJournal = useCallback(
    async (limit: number, offset: number) =>
      toEditorHistoryPage(await dispatch(loadUsersJournalThunk(limit, offset))),
    [dispatch],
  );

  return {
    list: {
      title: 'Пользователи панели',
      addLabel: 'Добавить пользователя',
      rows,
      columns: useMemo(userColumns, []),
      isLoading: loading,
      isSaving: saving,
      error,
      readOnly: !canEdit,
    },
    form: {
      fields,
      tabs: useMemo(userTabs, []),
      valuesOf,
      emptyValues,
    },
    actions: {
      // Удаления нет ни в интерфейсе, ни в API — см. комментарий к хуку
      save,
    },
    history: {
      // Журнал — часть управления: у кого нет прав править, у того его и нет
      ...(canEdit ? { loadRecord: loadRecordHistory, loadJournal } : {}),
      fieldLabels: USER_HISTORY_LABELS,
    },
    settings: { key: ListKey.users },
  };
};

/** Идентификатор в форме новой записи: настоящий выдаст бэкенд при сохранении. */
const NEW_RECORD_ID = 'будет присвоен при сохранении';

const text = (value: unknown): string => String(value ?? '').trim();

/**
 * Значения формы → тело запроса.
 *
 * Пароль уходит, только если его ввели: у существующей записи пустое поле означает
 * «оставить прежний», и присылать пустую строку нельзя — бэкенд отвергнет её как
 * слишком короткий пароль. Роль не отправляется никогда: её через API не меняют.
 */
function toUserPayload(values: EditorValues, isNew: boolean): CreateUserDto | UpdateUserDto {
  const password = String(values.password ?? '');

  return {
    email: text(values.email),
    name: text(values.name),
    isActive: values.isActive !== false,
    ...(password || isNew ? { password } : {}),
  } as CreateUserDto | UpdateUserDto;
}
