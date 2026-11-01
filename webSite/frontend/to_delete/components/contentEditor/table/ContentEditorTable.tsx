import { useEffect, useMemo, useRef, useState } from 'react';
import { Table } from 'antd';
import {
  expandableRowKeys,
  type EditorColumnDef,
  type EditorRow,
} from '../../../logic/contentEditor';
import styles from '../contentEditor.module.scss';
import RowActions, { type EditorRowActions } from './RowActions';
import TableCell from './TableCell';

/** Таблица записей. Вложенность — через `children` строки: antd рисует дерево сам. */
export default function ContentEditorTable({
  rows,
  columns,
  isLoading,
  selectedId,
  onOpen,
  actions,
}: {
  /** Строки раздела, уже собранные в дерево */
  rows: EditorRow[];
  /** Описание колонок — данными, без разметки */
  columns: EditorColumnDef[];
  isLoading: boolean;
  /** Открытая запись: её строка подсвечена */
  selectedId: string | null;
  onOpen: (id: string) => void;
  /** Что умеет строка — кнопки в последней колонке */
  actions: EditorRowActions;
}) {
  const expandableKeys = useMemo(() => expandableRowKeys(rows), [rows]);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  /** Уже раскрытые хотя бы раз: свёрнутое пользователем не раскрываем заново */
  const autoExpanded = useRef(new Set<string>());

  useEffect(() => {
    const fresh = expandableKeys.filter((key) => !autoExpanded.current.has(key));
    if (fresh.length === 0) return;
    fresh.forEach((key) => autoExpanded.current.add(key));
    setExpandedKeys((prev) => [...prev, ...fresh]);
  }, [expandableKeys]);

  const tableColumns = [
    ...columns.map((column) => ({
      key: column.key,
      title: column.title,
      dataIndex: column.dataIndex,
      width: column.width,
      render: (_: unknown, record: EditorRow) => <TableCell column={column} record={record} />,
    })),
    {
      key: 'actions',
      title: '',
      width: actionsWidth(actions),
      render: (_: unknown, record: EditorRow) => (
        <RowActions record={record} selectedId={selectedId} actions={actions} />
      ),
    },
  ];

  return (
    <Table
      className={styles.table}
      size="middle"
      rowKey="id"
      loading={isLoading}
      columns={tableColumns}
      dataSource={rows}
      expandable={{
        expandedRowKeys: expandedKeys,
        onExpandedRowsChange: (keys) => setExpandedKeys(keys.map(String)),
      }}
      // Узкому экрану таблица не даёт сжать колонки до нечитаемого состояния
      scroll={{ x: 'max-content' }}
      onRow={(record) => ({ onClick: () => onOpen(record.id) })}
      rowClassName={(record) => (record.id === selectedId ? styles.selectedRow : '')}
      pagination={false}
      locale={{ emptyText: 'Записей пока нет' }}
    />
  );
}

/** Ширина колонки кнопок: каждая кнопка добавляет свои ~40px. */
const actionsWidth = (actions: EditorRowActions): number =>
  110 + (actions.isNested ? 40 : 0) + (actions.rowAction ? 40 : 0);
