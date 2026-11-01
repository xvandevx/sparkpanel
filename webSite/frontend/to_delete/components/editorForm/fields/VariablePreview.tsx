import { Typography } from 'antd';
import { previewTemplate, unknownVariables, type EditorVariable } from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';

/**
 * Предпросмотр шаблона: как строка будет выглядеть после подстановки значений
 * конкретного элемента. Пустой шаблон не показываем — подставлять нечего.
 */
export default function VariablePreview({
  template,
  variables,
}: {
  template: string;
  variables: EditorVariable[];
}) {
  if (!template.trim()) return null;

  const unknown = unknownVariables(template, variables);

  return (
    <div className={styles.preview}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Пример подстановки
      </Typography.Text>
      <div>{previewTemplate(template, variables)}</div>
      {unknown.length > 0 && (
        <Typography.Text type="warning" style={{ fontSize: 12 }}>
          Неизвестные переменные: {unknown.map((name) => `#${name}#`).join(', ')}
        </Typography.Text>
      )}
    </div>
  );
}
