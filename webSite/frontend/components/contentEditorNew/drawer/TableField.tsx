import { useState } from 'react';
import { Button, Input, Space, Table, Typography } from 'antd';
import { DeleteOutlined, FullscreenExitOutlined, FullscreenOutlined, PlusOutlined } from '@ant-design/icons';
import { ActionIcon } from '../ui';
import FieldFullscreen from './FieldFullscreen';
import type { EditorField } from './record';
import { addTableRow, removeTableRow, setTableCell, tableRows } from './tableValue';

/** Столбец не уже этого: в узкую ячейку значение не прочитать. */
const MIN_COLUMN_WIDTH = 150;

/** Столбец с корзиной строки. */
const ACTIONS_WIDTH = 40;

/**
 * Поле «Таблица»: столбцы и их заголовки заданы в настройках свойства, строки
 * добавляют здесь — сколько нужно записи. Значение — строки ячеек.
 *
 * Шапка видна, только если хоть одному столбцу дали заголовок: пустая шапка
 * лишь занимает место. Столбец не уже 150 px: не помещаются — таблица
 * прокручивается вбок сама, а не сжимает ячейки. Широкую таблицу удобнее
 * править на весь экран — кнопка справа под таблицей, как у поля «HTML».
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
  const [isFullscreen, setFullscreen] = useState(false);

  const addButton = !isLocked && (
    <Button icon={<PlusOutlined />} onClick={() => onChange(addTableRow(rows, columns))}>
      Добавить строку
    </Button>
  );

  const table = (
    <Table
      size="small"
      bordered
      pagination={false}
      showHeader={headers.some((header) => header.trim() !== '')}
      rowKey="index"
      locale={{ emptyText: 'Строк пока нет' }}
      // Сумма наименьших ширин: шире поля — прокрутка вбок, уже — столбцы растягиваются
      scroll={{ x: columns * MIN_COLUMN_WIDTH + (isLocked ? 0 : ACTIONS_WIDTH) }}
      dataSource={rows.map((cells, index) => ({ index, cells }))}
      columns={[
        ...Array.from({ length: columns }, (_column, column) => ({
          key: column,
          title: headers[column] ?? '',
          minWidth: MIN_COLUMN_WIDTH,
          render: (_cell: unknown, row: { index: number; cells: string[] }) => (
            <Input
              variant="borderless"
              value={row.cells[column]}
              disabled={isLocked}
              aria-label={`Строка ${row.index + 1}, столбец ${column + 1}`}
              onChange={(event) => onChange(setTableCell(rows, row.index, column, event.target.value))}
            />
          ),
        })),
        ...(isLocked
          ? []
          : [
              {
                key: 'actions',
                width: ACTIONS_WIDTH,
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
  );

  return (
    <>
      {isFullscreen ? (
        // Таблица одна: пока открыто окно, в карточке её нет
        <Typography.Text type="secondary">Открыто на весь экран</Typography.Text>
      ) : (
        <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
          {table}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {addButton}
            <Button
              type="text"
              icon={<FullscreenOutlined />}
              title="На весь экран"
              aria-label="На весь экран"
              style={{ marginLeft: 'auto' }}
              onClick={() => setFullscreen(true)}
            />
          </div>
        </Space>
      )}

      {isFullscreen && (
        <FieldFullscreen
          title={field.name}
          onClose={() => setFullscreen(false)}
          header={
            <Space size={12} style={{ marginLeft: 'auto' }}>
              {addButton}
              <Button icon={<FullscreenExitOutlined />} onClick={() => setFullscreen(false)}>
                Свернуть
              </Button>
            </Space>
          }
        >
          {/* Строк больше, чем влезает в окно, — прокручивается сама таблица, шапка окна на месте */}
          <div style={{ height: '100%', overflowY: 'auto' }}>{table}</div>
        </FieldFullscreen>
      )}
    </>
  );
}
