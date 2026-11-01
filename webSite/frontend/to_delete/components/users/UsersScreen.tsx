import { ContentEditor } from '../contentEditor';
import { useUsersController, useLoadUsers } from '../../logic/users';

/**
 * Раздел «Пользователи»: учётные записи панели в универсальном редакторе контента.
 * Список видят все, правит только главный администратор — у остальных редактор
 * открывается на просмотр.
 */
export default function UsersScreen() {
  // Загружаем список один раз на раздел, а не в каждом компоненте
  useLoadUsers();

  const { list, form, actions, history, settings } = useUsersController();

  return (
    <ContentEditor
      list={list}
      form={form}
      actions={actions}
      history={history}
      settings={settings}
    />
  );
}
