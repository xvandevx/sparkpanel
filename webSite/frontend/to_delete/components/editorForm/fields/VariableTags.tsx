import { Tag, Tooltip, Typography } from 'antd';
import { variableToken, type EditorVariable } from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';

/** Список переменных шаблона: клик вставляет переменную в поле. */
export default function VariableTags({
  variables,
  onInsert,
}: {
  variables: EditorVariable[];
  onInsert: (name: string) => void;
}) {
  return (
    <div className={styles.variables}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Переменные:
      </Typography.Text>
      {variables.map((variable) => (
        <Tooltip key={variable.name} title={variable.label}>
          <Tag
            style={{ cursor: 'pointer', margin: 0 }}
            onClick={() => onInsert(variable.name)}
          >
            {variableToken(variable.name)}
          </Tag>
        </Tooltip>
      ))}
    </div>
  );
}
