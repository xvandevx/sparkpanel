import { ContentEditor } from '../contentEditor';
import { useFileSectionsController, useLoadFileSections } from '../../logic/files';

/**
 * Первый экран раздела «Файлы» (`/admin/files`): разделы медиатеки.
 * Сами файлы живут на собственной странице раздела — туда ведёт кнопка
 * перехода в строке.
 */
export default function SectionsScreen() {
  // Разделы грузим один раз на раздел — здесь, а не в контроллере:
  // до этого места доходит только авторизованный (см. AdminLayout).
  useLoadFileSections();

  const { list, form, actions, settings } = useFileSectionsController();

  return (
    <ContentEditor
      list={list}
      form={form}
      actions={actions}
      settings={settings}
    />
  );
}
