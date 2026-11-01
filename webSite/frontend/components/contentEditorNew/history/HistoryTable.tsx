import { Alert, Empty, Space, Table, Tag, Typography } from 'antd';
import type { TablePaginationConfig } from 'antd';
import type {
  EditorHistoryChange,
  EditorHistoryRecord,
} from '../../../redux/action-creaters/contentEditorNew';
import {
  ACTION_COLORS,
  ACTION_LABELS,
  fieldLabel,
  formatHistoryDate,
  formatHistoryValue,
} from './historyFormat';

/** Значение «было/стало»: переносы сохраняем — в журнал попадают и тексты, и JSON. */
const VALUE_STYLE = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  margin: 0,
} as const;

const SECONDARY_STYLE = { fontSize: 12 } as const;

/**
 * Таблица правок — общая для журнала списка и истории одной записи. Строка
 * раскрывается: какие поля поменялись, что в них было и что стало.
 */
export default function HistoryTable({
  records,
  labels,
  isLoading,
  error,
  pagination,
  isRecordShown = false,
  openableIds,
  onOpenRecord,
}: {
  records: EditorHistoryRecord[];
  /** Подписи полей: `props.price` → «Цена» */
  labels: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  /** Страницы журнала; без них — одной лентой (история записи короткая) */
  pagination?: TablePaginationConfig;
  /** Колонка «Запись»: в журнале списка нужна, в истории одной записи лишняя */
  isRecordShown?: boolean;
  /**
   * Записи, которые есть в таблице: журнал шире её — удалённую открыть нечем,
   * и её название показывается без ссылки
   */
  openableIds?: ReadonlySet<string>;
  /** Открыть запись из журнала в карточке */
  onOpenRecord?: (recordId: string) => void;
}) {
  if (error !== null) return <Alert type="error" showIcon message={error} />;

  const columns = [
    {
      title: 'Когда',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatHistoryDate(value),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action: EditorHistoryRecord['action']) => (
        <Tag color={ACTION_COLORS[action]}>{ACTION_LABELS[action]}</Tag>
      ),
    },
    ...(isRecordShown
      ? [
          {
            title: 'Запись',
            key: 'record',
            width: 240,
            render: (_: unknown, row: EditorHistoryRecord) => {
              const name = row.recordName || row.recordCode || `№ ${row.recordId}`;
              const isOpenable =
                onOpenRecord !== undefined && openableIds?.has(row.recordId) === true;
              return (
                <Space orientation="vertical" size={0}>
                  {isOpenable ? (
                    <Typography.Link onClick={() => onOpenRecord?.(row.recordId)}>
                      {name}
                    </Typography.Link>
                  ) : (
                    <Typography.Text>{name}</Typography.Text>
                  )}
                  {row.recordCode && row.recordCode !== name && (
                    <Typography.Text type="secondary" style={SECONDARY_STYLE}>
                      {row.recordCode}
                    </Typography.Text>
                  )}
                </Space>
              );
            },
          },
        ]
      : []),
    {
      title: 'Кто',
      key: 'author',
      width: 220,
      render: (_: unknown, row: EditorHistoryRecord) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{row.authorName || row.authorEmail || 'Неизвестно'}</Typography.Text>
          {row.authorIp && (
            <Typography.Text type="secondary" style={SECONDARY_STYLE}>
              {row.authorIp}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Что изменилось',
      key: 'changes',
      render: (_: unknown, row: EditorHistoryRecord) =>
        row.changes.length === 0 ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Space size={[4, 4]} wrap>
            {row.changes.map((change) => (
              <Tag key={change.field}>{fieldLabel(labels, change.field)}</Tag>
            ))}
          </Space>
        ),
    },
  ];

  const changeColumns = [
    {
      title: 'Поле',
      dataIndex: 'field',
      key: 'field',
      width: 220,
      render: (field: string) => (
        <Typography.Text strong>{fieldLabel(labels, field)}</Typography.Text>
      ),
    },
    {
      title: 'Было',
      dataIndex: 'before',
      key: 'before',
      render: (value: unknown) => <pre style={VALUE_STYLE}>{formatHistoryValue(value)}</pre>,
    },
    {
      title: 'Стало',
      dataIndex: 'after',
      key: 'after',
      render: (value: unknown) => <pre style={VALUE_STYLE}>{formatHistoryValue(value)}</pre>,
    },
  ];

  return (
    <Table
      size="small"
      rowKey="id"
      loading={isLoading}
      columns={columns}
      dataSource={records}
      pagination={pagination ?? false}
      locale={{ emptyText: <Empty description="Изменений пока нет" /> }}
      expandable={{
        // Раскрывать нечего у правки без полей
        rowExpandable: (row: EditorHistoryRecord) => row.changes.length > 0,
        expandedRowRender: (row: EditorHistoryRecord) => (
          <Table<EditorHistoryChange>
            size="small"
            rowKey="field"
            pagination={false}
            columns={changeColumns}
            dataSource={row.changes}
          />
        ),
      }}
    />
  );
}
