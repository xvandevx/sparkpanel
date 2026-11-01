import { Alert, Button, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useHistoryJournal, type EditorHistoryPage } from '../../../logic/contentEditor';
import HistoryTable from './HistoryTable';

/** Общий журнал раздела: все изменения всех записей, страницами. */
export default function HistoryJournal({
  load,
  fieldLabels,
  onOpenRecord,
  canOpenRecord,
}: {
  /** Загрузка страницы журнала */
  load?: (limit: number, offset: number) => Promise<EditorHistoryPage>;
  fieldLabels: Record<string, string>;
  /** Переход к записи из журнала */
  onOpenRecord: (id: string) => void;
  /** Есть ли такая запись в таблице: журнал шире её */
  canOpenRecord?: (id: string) => boolean;
}) {
  const { records, total, page, pageSize, isLoading, error, reload, changePage } =
    useHistoryJournal(load);

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Space>
        <Button icon={<ReloadOutlined />} loading={isLoading} onClick={() => reload()}>
          Обновить
        </Button>
        <Typography.Text type="secondary">Всего изменений: {total}</Typography.Text>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}
      <HistoryTable
        records={records}
        isLoading={isLoading}
        fieldLabels={fieldLabels}
        onOpenRecord={onOpenRecord}
        canOpenRecord={canOpenRecord}
        showRecordColumn
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50', '100'],
          showTotal: (count, range) => `${range[0]}–${range[1]} из ${count}`,
          onChange: (nextPage, nextPageSize) => changePage(nextPage, nextPageSize ?? pageSize),
        }}
      />
    </Space>
  );
}
