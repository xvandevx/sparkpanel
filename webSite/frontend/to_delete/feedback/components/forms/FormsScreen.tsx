import {
  ContentEditor,
  FieldType,
  type EditorFields,
  type EditorSettings,
} from '../contentEditorNew';
import { formsApi } from '../../logic/forms';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * «Формы» — формы обратной связи на редакторе контента. Своего экрана раздел
 * не пишет: называет код списка, отдаёт Api и описывает поля.
 *
 * Полей формы среди полей карточки нет: их подключают системным свойством
 * «Поля» — сервер заводит его сам, и карточка ставит его рядом с полями
 * раздела. Получателя заявок, текст после отправки и прочее заводят
 * свойствами в «Настройках списка».
 */
const FORM_FIELDS: EditorFields = {
  name: { name: 'Название', isRequired: true },
  isActive: {
    name: 'Активность',
    type: FieldType.Switch,
    note: 'Выключенная форма остаётся в списке, но на сайт не попадает',
  },
};

const FORM_VIEW: EditorSettings = { addLabel: 'Добавить форму' };

export default function FormsScreen() {
  return (
    <ContentEditor
      listKey={ListKey.forms}
      api={formsApi}
      // По коду форму подключают на сайте: он обязателен и не повторяется.
      // Вложенности и меты у формы нет — это не страница
      blockedSettings={{
        code: ListKey.forms,
        maxDepth: 1,
        codeMode: CodeMode.Unique,
      }}
      settings={FORM_VIEW}
      fields={FORM_FIELDS}
    />
  );
}
