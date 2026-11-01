import { ContentEditor } from '../contentEditor';
import { useFormsController, useLoadForms } from '../../logic/forms';

/**
 * Раздел «Веб-формы»: формы обратной связи в универсальном редакторе контента.
 * Верхний уровень таблицы — сами формы, вложенные строки — их поля: вопрос
 * посетителю живёт только внутри своей формы.
 */
export default function FormsScreen() {
  // Загружаем список один раз на раздел, а не в каждом компоненте
  useLoadForms();

  const { list, form, actions, history, settings } = useFormsController();

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
