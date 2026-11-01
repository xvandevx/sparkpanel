import { Alert, Button, Space, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useRecordHistory, type EditorHistorySource } from '../../../logic/contentEditor';
import HistoryTable from './HistoryTable';

/** Вкладка «История» в шторке: изменения открытой записи. */
export default function HistoryTab({ history }: { history: EditorHistorySource }) {
  const { records, isLoading, error, reload } = useRecordHistory(history);

  if (!history.recordId) {
    return <Typography.Text type="secondary">История появится после сохранения.</Typography.Text>;
  }

  return (
    <Space orientation="vertical" size={12} style={{ width: '100%' }}>
      <Space>
        <Button icon={<ReloadOutlined />} loading={isLoading} onClick={() => reload()}>
          Обновить
        </Button>
        <Typography.Text type="secondary">Изменений: {records.length}</Typography.Text>
      </Space>
      {error && <Alert type="error" showIcon message={error} />}
      <HistoryTable records={records} isLoading={isLoading} fieldLabels={history.fieldLabels} />
    </Space>
  );
}
