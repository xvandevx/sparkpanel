import { ContentEditor, type EditorSettings } from '../contentEditorNew';
import { fieldsApi } from '../../logic/forms';
import { CodeMode, ListKey } from '../../logic/listSettings';

/**
 * «Поля форм» — вопросы посетителю на редакторе контента. Поле не принадлежит
 * форме: его подключают в карточке формы, системным свойством «Поля», поэтому
 * одно поле («Телефон») стоит в скольких угодно формах. Подключённое поле
 * сервер не удалит — оно приходит с `isBlocked`, и вместо корзины виден замок.
 *
 * Поля и колонки — стандартные (название, код, активность): плейсхолдер —
 * системное свойство, его карточка ставит сама, а тип, обязательность и прочее
 * заводят свойствами в «Настройках списка».
 */
const FIELD_VIEW: EditorSettings = { addLabel: 'Добавить поле' };

export default function FieldsScreen() {
  return (
    <ContentEditor
      listKey={ListKey.formFields}
      api={fieldsApi}
      // Код поля — имя значения в заявке: он обязателен и не повторяется,
      // иначе в форме с двумя одинаковыми кодами ответы перепутаются
      blockedSettings={{
        code: ListKey.formFields,
        maxDepth: 1,
        codeMode: CodeMode.Unique,
      }}
      settings={FIELD_VIEW}
    />
  );
}
