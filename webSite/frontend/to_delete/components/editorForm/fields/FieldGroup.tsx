import { Typography } from 'antd';
import { isFieldVisible, useEditorForm } from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';
import EditorField from './EditorField';

/** Группа полей: заголовок, пояснение и сами поля. */
export default function FieldGroup({ groupKey }: { groupKey: string }) {
  const { fields, groups, values } = useEditorForm();
  const group = groups.find((item) => item.key === groupKey);
  if (!group) return null;

  const visible = group.fields.filter((key) => {
    const field = fields.find((item) => item.key === key);
    return field ? isFieldVisible(field, values) : false;
  });

  return (
    <div className={styles.group}>
      {group.title && (
        <Typography.Title level={5} className={styles.groupTitle}>
          {group.title}
        </Typography.Title>
      )}
      {group.description && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {group.description}
        </Typography.Text>
      )}
      {visible.map((key) => (
        <EditorField key={key} fieldKey={key} />
      ))}
    </div>
  );
}
