import { Button, Input, Space, Table } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionIcon } from '../ui';
import type { EditorField } from './record';
import { addTableRow, removeTableRow, setTableCell, tableRows } from './tableValue';

/**
 * Поле «Таблица»: столбцы и их заголовки заданы в настройках свойства, строки
 * добавляют здесь — сколько нужно записи. Значение — строки ячеек.
 *
 * Шапка видна, только если хоть одному столбцу дали заголовок: пустая шапка
 * лишь занимает место.
 */
export default function TableField({
  field,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  isLocked: boolean;
  onChange: (value: unknown) => void;
}) {
  const { columns, headers } = field.table ?? { columns: 1, headers: [] };
  const rows = tableRows(value, columns);

  return (
    <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
      <Table
        size="small"
        bordered
        pagination={false}
        showHeader={headers.some((header) => header.trim() !== '')}
        rowKey="index"
        locale={{ emptyText: 'Строк пока нет' }}
        dataSource={rows.map((cells, index) => ({ index, cells }))}
        columns={[
          ...Array.from({ length: columns }, (_column, column) => ({
            key: column,
            title: headers[column] ?? '',
            render: (_cell: unknown, row: { index: number; cells: string[] }) => (
              <Input
                variant="borderless"
                value={row.cells[column]}
                disabled={isLocked}
                aria-label={`Строка ${row.index + 1}, столбец ${column + 1}`}
                onChange={(event) =>
                  onChange(setTableCell(rows, row.index, column, event.target.value))
                }
              />
            ),
          })),
          ...(isLocked
            ? []
            : [
                {
                  key: 'actions',
                  width: 40,
                  render: (_cell: unknown, row: { index: number }) => (
                    <ActionIcon
                      title="Убрать строку"
                      icon={<DeleteOutlined />}
                      isDanger
                      onClick={() => onChange(removeTableRow(rows, row.index))}
                    />
                  ),
                },
              ]),
        ]}
      />

      {!isLocked && (
        <Button icon={<PlusOutlined />} onClick={() => onChange(addTableRow(rows, columns))}>
          Добавить строку
        </Button>
      )}
    </Space>
  );
}
