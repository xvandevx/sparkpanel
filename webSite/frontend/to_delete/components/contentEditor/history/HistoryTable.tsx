import { Empty, Space, Table, Tag, Typography } from 'antd';
import type { TablePaginationConfig } from 'antd';
import {
  HISTORY_ACTION_COLORS,
  HISTORY_ACTION_LABELS,
  formatDateTime,
  formatHistoryValue,
  historyFieldLabel,
  type EditorHistoryRecord,
} from '../../../logic/contentEditor';
import styles from '../contentEditor.module.scss';

/**
 * Таблица изменений — общая для истории одной записи и журнала раздела.
 * Строка раскрывается: что именно поменялось и каким было состояние записи целиком.
 */
export default function HistoryTable({
  records,
  fieldLabels,
  isLoading = false,
  pagination,
  showRecordColumn = false,
  onOpenRecord,
  canOpenRecord,
}: {
  records: EditorHistoryRecord[];
  /** Подписи полей: `meta.title` → «Мета заголовок» */
  fieldLabels: Record<string, string>;
  isLoading?: boolean;
  pagination?: TablePaginationConfig | false;
  /** В журнале раздела нужна колонка «Запись» — в истории одной записи она лишняя */
  showRecordColumn?: boolean;
  /** Переход к записи из журнала; без него ссылки нет */
  onOpenRecord?: (id: string) => void;
  /** Есть ли такая запись в таблице: журнал шире её, удалённые открывать нечем */
  canOpenRecord?: (id: string) => boolean;
}) {

  const columns = [
    {
      title: 'Дата',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Действие',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (action: EditorHistoryRecord['action']) => (
        <Tag color={HISTORY_ACTION_COLORS[action]}>{HISTORY_ACTION_LABELS[action]}</Tag>
      ),
    },
    ...(showRecordColumn
      ? [
          {
            title: 'Запись',
            key: 'record',
            width: 240,
            render: (_: unknown, record: EditorHistoryRecord) => (
              <Space orientation="vertical" size={0}>
                {/* Записи, которой в таблице нет, ссылка не даётся: она бы
                    поменяла адрес и не открыла ничего */}
                {onOpenRecord && (canOpenRecord?.(record.entityId) ?? true) ? (
                  <Typography.Link onClick={() => onOpenRecord(record.entityId)}>
                    {record.entityName || record.entityCode || 'Без названия'}
                  </Typography.Link>
                ) : (
                  <Typography.Text>
                    {record.entityName || record.entityCode || 'Без названия'}
                  </Typography.Text>
                )}
                {record.entityCode && (
                  <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                    {record.entityCode}
                  </Typography.Text>
                )}
              </Space>
            ),
          },
        ]
      : []),
    {
      title: 'Кто',
      key: 'author',
      width: 200,
      render: (_: unknown, record: EditorHistoryRecord) => (
        <Space orientation="vertical" size={0}>
          <Typography.Text>{record.authorName || record.authorEmail || 'Неизвестно'}</Typography.Text>
          {record.authorIp && (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {record.authorIp}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Что изменилось',
      key: 'changes',
      render: (_: unknown, record: EditorHistoryRecord) =>
        record.changes.length === 0 ? (
          <Typography.Text type="secondary">—</Typography.Text>
        ) : (
          <Space size={[4, 4]} wrap>
            {record.changes.map((change) => (
              <Tag key={change.field}>{historyFieldLabel(fieldLabels, change.field)}</Tag>
            ))}
          </Space>
        ),
    },
  ];

  return (
    <Table
      size="small"
      rowKey="id"
      loading={isLoading}
      columns={columns}
      dataSource={records}
      pagination={pagination ?? { defaultPageSize: 10, showSizeChanger: false }}
      locale={{ emptyText: <Empty description="Изменений пока нет" /> }}
      expandable={{
        expandedRowRender: (record: EditorHistoryRecord) => (
          <div className={styles.historyDetails}>
            <Table
              size="small"
              rowKey="field"
              pagination={false}
              dataSource={record.changes}
              locale={{ emptyText: 'Изменённых полей нет' }}
              columns={[
                {
                  title: 'Поле',
                  dataIndex: 'field',
                  key: 'field',
                  width: 240,
                  render: (field: string) => (
                    <Space orientation="vertical" size={0}>
                      <Typography.Text strong>
                        {historyFieldLabel(fieldLabels, field)}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {field}
                      </Typography.Text>
                    </Space>
                  ),
                },
                {
                  title: 'Было',
                  dataIndex: 'before',
                  key: 'before',
                  render: (value: unknown) => (
                    <pre className={styles.historyValue}>{formatHistoryValue(value)}</pre>
                  ),
                },
                {
                  title: 'Стало',
                  dataIndex: 'after',
                  key: 'after',
                  render: (value: unknown) => (
                    <pre className={styles.historyValue}>{formatHistoryValue(value)}</pre>
                  ),
                },
              ]}
            />
            <details>
              <summary>Состояние записи на момент изменения</summary>
              <pre className={styles.historyValue}>
                {JSON.stringify(record.snapshot ?? {}, null, 2)}
              </pre>
            </details>
          </div>
        ),
      }}
    />
  );
}
