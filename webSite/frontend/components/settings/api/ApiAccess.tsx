import { useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Popconfirm, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { formatDateTime } from '../../../logic/dateFormat';
import { keyRightsText, lastUsedText, maskedKey, useApiAddress, useApiKeys, type ApiKey } from '../../../logic/externalApi';
import ApiKeyDialog from './ApiKeyDialog';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/** Вкладка «Доступ»: адрес и правила API, ключи доступа. */
export default function ApiAccess() {
  const { message } = App.useApp();
  const address = useApiAddress();
  const keys = useApiKeys();
  const [isCreating, setIsCreating] = useState(false);

  const revoke = async (key: ApiKey) => {
    try {
      await keys.revoke(key);
      message.success('Ключ отозван');
    } catch (error) {
      message.error(errorText(error, 'Не удалось отозвать ключ'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card title="Адрес и правила">
        <Descriptions
          bordered
          column={1}
          size="small"
          styles={{ label: { width: 200 } }}
          items={[
            {
              key: 'url',
              label: 'Адрес API',
              children: <Typography.Text code copyable>{address.baseUrl}</Typography.Text>,
            },
            {
              key: 'auth',
              label: 'Авторизация',
              children: (
                <>
                  Заголовок <Typography.Text code>X-Api-Key</Typography.Text>. Читает любой ключ, пишет — ключ
                  с правом записи и только в разрешённые ему списки
                </>
              ),
            },
            {
              key: 'data',
              label: 'Что отдаётся',
              children: 'Страницы, контент, каталог и домены — активные опубликованные записи. Скрытые свойства — никогда',
            },
            {
              key: 'write',
              label: 'Запись',
              children: (
                <>
                  Для интеграций (учёт, склад, CRM): <Typography.Text code>PUT …/items/external/{'{externalId}'}</Typography.Text>{' '}
                  заводит или правит запись по её номеру в системе-источнике,{' '}
                  <Typography.Text code>POST …/items/batch</Typography.Text> — то же пакетом до 500 записей. Сразу
                  публикуется, журнал подписан названием ключа
                </>
              ),
            },
            {
              key: 'properties',
              label: 'Свойства в ответе',
              children: (
                <>
                  Объектом по коду свойства: <Typography.Text code>properties.price</Typography.Text>
                </>
              ),
            },
            {
              key: 'domains',
              label: 'Домены',
              children: (
                <>
                  Мультидоменные значения — по <Typography.Text code>?domain=</Typography.Text>, без него — общее
                </>
              ),
            },
            {
              key: 'types',
              label: 'Типы для сайта',
              children: <Typography.Text code copyable>{address.typesCommand}</Typography.Text>,
            },
            {
              key: 'errors',
              label: 'Ошибки',
              children:
                '400 — непонятный параметр или значение · 401 — нет ключа или он отозван · 403 — ключу нельзя писать сюда · 404 — нет записи · 409 — код или внешний ID заняты',
            },
          ]}
        />
      </Card>

      {keys.error && <Alert type="error" showIcon title={keys.error} />}

      <Card
        title="Ключи доступа"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsCreating(true)}>
            Создать ключ
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<ApiKey>
          rowKey="id"
          loading={keys.isLoading}
          dataSource={keys.keys}
          pagination={false}
          scroll={{ x: 960 }}
          locale={{ emptyText: 'Ключей пока нет — сайт не может забирать данные' }}
          columns={[
            { key: 'name', title: 'Название', dataIndex: 'name' },
            {
              key: 'key',
              title: 'Ключ',
              render: (_, key) => <Typography.Text type="secondary" code>{maskedKey(key.keyTail)}</Typography.Text>,
            },
            { key: 'rights', title: 'Права', render: (_, key) => keyRightsText(key, keys.lists) },
            { key: 'createdAt', title: 'Создан', render: (_, key) => formatDateTime(key.createdAt) },
            { key: 'lastUsedAt', title: 'Последний запрос', render: (_, key) => lastUsedText(key.lastUsedAt) },
            {
              key: 'actions',
              title: 'Действия',
              align: 'right',
              render: (_, key) => (
                <Popconfirm
                  title={`Отозвать ключ «${key.name}»?`}
                  description="Сайт с этим ключом сразу перестанет получать данные."
                  okText="Отозвать"
                  okButtonProps={{ danger: true }}
                  cancelText="Отмена"
                  onConfirm={() => revoke(key)}
                >
                  <Button type="link" danger>
                    Отозвать
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ margin: 0, padding: '12px 16px' }}>
          Ключ показывается целиком один раз — при создании. В базе лежит только его хэш, как у паролей.
        </Typography.Paragraph>
      </Card>

      <ApiKeyDialog
        isOpen={isCreating}
        lists={keys.lists}
        onCreate={keys.create}
        onClose={() => setIsCreating(false)}
      />
    </div>
  );
}
