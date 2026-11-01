import { useEditorForm } from '../../logic/editorForm';
import { FieldGroup } from './fields';
import styles from './editorForm.module.scss';

/**
 * Форма, описанная данными: подряд все видимые группы полей.
 * Что рисовать, берётся из контекста формы (`EditorFormProvider`), поэтому экрану
 * достаточно отдать описание полей и значения — разметку он не пишет.
 *
 * Шторка редактора контента раскладывает те же группы по вкладкам сама.
 */
export default function EditorForm() {
  const { groups } = useEditorForm();

  return (
    <div className={styles.form}>
      {groups.map((group) => (
        <FieldGroup key={group.key} groupKey={group.key} />
      ))}
    </div>
  );
}
