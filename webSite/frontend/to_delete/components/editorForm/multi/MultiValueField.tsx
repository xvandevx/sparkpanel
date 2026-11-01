import { Button, Input, InputNumber, Space, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  EditorFieldType,
  addMultiValue,
  multiValues,
  removeMultiValue,
  setMultiValue,
  useEditorForm,
} from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';
import { RichTextField } from '../richText';

/**
 * Поле с несколькими значениями: столько строк, сколько значений, плюс
 * «Добавить». Так выглядит галочка «Множественное» у типов, у которых нет
 * своего выбора нескольких, — строки, числа, текста и разметки.
 *
 * Пустая строка для ввода есть всегда: у записи без значений поле иначе было бы
 * просто кнопкой.
 */
export default function MultiValueField({ fieldKey }: { fieldKey: string }) {
  const { fields, values, setFieldValue } = useEditorForm();
  const field = fields.find((item) => item.key === fieldKey);
  if (!field) return null;

  const value = values[fieldKey];
  const disabled = field.disabled?.(values) ?? false;
  const isNumber = field.type === EditorFieldType.Number;
  const empty = isNumber ? null : '';

  const stored = multiValues(value);
  const items = stored.length ? stored : [empty];

  const change = (index: number, next: unknown) =>
    setFieldValue(fieldKey, setMultiValue(items, index, next));

  const control = (item: unknown, index: number) => {
    if (isNumber) {
      return (
        <InputNumber
          value={typeof item === 'number' ? item : null}
          min={field.min ?? 0}
          disabled={disabled}
          placeholder={field.placeholder}
          style={{ width: '100%' }}
          onChange={(next) => change(index, typeof next === 'number' ? next : null)}
        />
      );
    }

    if (field.type === EditorFieldType.RichText) {
      return (
        <RichTextField
          fieldKey={fieldKey}
          value={String(item ?? '')}
          onChange={(html) => change(index, html)}
        />
      );
    }

    if (field.type === EditorFieldType.Textarea || field.type === EditorFieldType.Html) {
      return (
        <Input.TextArea
          value={String(item ?? '')}
          rows={field.rows ?? 3}
          disabled={disabled}
          placeholder={field.placeholder}
          className={field.type === EditorFieldType.Html ? styles.mono : undefined}
          onChange={(event) => change(index, event.target.value)}
        />
      );
    }

    return (
      <Input
        value={String(item ?? '')}
        disabled={disabled}
        placeholder={field.placeholder}
        onChange={(event) => change(index, event.target.value)}
      />
    );
  };

  return (
    <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
      {items.map((item, index) => (
        <div key={index} className={styles.multiValueRow}>
          <div>{control(item, index)}</div>
          {!disabled && (
            <Tooltip title="Убрать значение">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label={`Убрать значение ${index + 1}`}
                // Последняя строка не убирается, а очищается: поле не должно
                // схлопнуться в одну кнопку
                onClick={() =>
                  setFieldValue(
                    fieldKey,
                    items.length > 1 ? removeMultiValue(items, index) : [empty],
                  )
                }
              />
            </Tooltip>
          )}
        </div>
      ))}

      {!disabled && (
        <Button
          size="small"
          icon={<PlusOutlined />}
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setFieldValue(fieldKey, addMultiValue(items, empty))}
        >
          Добавить значение
        </Button>
      )}
    </Space>
  );
}
