import { Button, Input, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  addTableRow,
  removeTableRow,
  setTableCell,
  tableCells,
  useEditorForm,
} from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';

/**
 * Поле «таблица»: столбцы и их заголовки заданы настройками свойства, строки
 * добавляются здесь — сколько нужно записи. Значение — строки ячеек.
 */
export default function TableField({ fieldKey }: { fieldKey: string }) {
  const { fields, values, setFieldValue } = useEditorForm();
  const field = fields.find((item) => item.key === fieldKey);
  if (!field?.table) return null;

  const { columns, headers } = field.table;
  const value = values[fieldKey];
  const disabled = field.disabled?.(values) ?? false;
  const rows = tableCells(value, columns);
  const hasHeaders = headers.some((header) => header.trim());

  return (
    <div className={styles.tableField}>
      <table>
        {hasHeaders && (
          <thead>
            <tr>
              {Array.from({ length: columns }, (_cell, column) => (
                <th key={column}>{headers[column] ?? ''}</th>
              ))}
              {!disabled && <th aria-label="Убрать строку" />}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, columnIndex) => (
                <td key={columnIndex}>
                  <Input
                    size="small"
                    variant="borderless"
                    value={cell}
                    disabled={disabled}
                    aria-label={`Строка ${rowIndex + 1}, столбец ${columnIndex + 1}`}
                    onChange={(event) =>
                      setFieldValue(
                        fieldKey,
                        setTableCell(value, columns, rowIndex, columnIndex, event.target.value),
                      )
                    }
                  />
                </td>
              ))}
              {!disabled && (
                <td className={styles.tableRowAction}>
                  <Tooltip title="Убрать строку">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={`Убрать строку ${rowIndex + 1}`}
                      onClick={() => setFieldValue(fieldKey, removeTableRow(value, columns, rowIndex))}
                    />
                  </Tooltip>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {!disabled && (
        <Button
          size="small"
          icon={<PlusOutlined />}
          onClick={() => setFieldValue(fieldKey, addTableRow(value, columns))}
        >
          Добавить строку
        </Button>
      )}
    </div>
  );
}
