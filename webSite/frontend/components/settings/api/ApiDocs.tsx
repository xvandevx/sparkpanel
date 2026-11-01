import dynamic from 'next/dynamic';
import { Alert, Button, Input, Space, Spin, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { useApiAddress, useApiDocs } from '../../../logic/externalApi';

// Scalar — Vue-приложение внутри React-обёртки, ему нужен браузер
const ApiReference = dynamic(() => import('./ApiReference'), {
  ssr: false,
  loading: () => <Spin className="block py-8" />,
});

/**
 * Вкладка «Документация»: спецификация внешнего API, которую сервер собирает
 * из настроек списков, во встроенном Scalar. Адрес спецификации — тот же,
 * по которому её берут генераторы клиентов (с ключом).
 */
export default function ApiDocs() {
  const address = useApiAddress();
  const docs = useApiDocs();

  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        showIcon
        title="Документация собирается из настроек списков при каждом открытии: завели тип контента или свойство — оно уже здесь, с кодом, типом и вариантами «Списка». Скрытые свойства в неё не попадают."
      />
      <Space.Compact className="w-full">
        <Input readOnly value={address.specUrl} style={{ fontFamily: 'monospace' }} />
        <Button icon={<DownloadOutlined />} disabled={!docs.spec} onClick={docs.download}>
          Скачать
        </Button>
      </Space.Compact>
      <Typography.Text type="secondary">
        По этому адресу спецификацию отдаёт сервер — с ключом в заголовке <Typography.Text code>X-Api-Key</Typography.Text>.
      </Typography.Text>

      {docs.error && <Alert type="error" showIcon title={docs.error} />}
      {docs.isLoading && <Spin className="block py-8" />}
      {docs.spec && <ApiReference spec={docs.spec} />}
    </div>
  );
}
