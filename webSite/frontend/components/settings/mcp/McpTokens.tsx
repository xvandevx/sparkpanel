import { Alert, App, Button, Card, Popconfirm, Table, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useIsRoot } from '../../../logic/auth';
import { lastUsedText, maskedToken, untilText, useMcpTokens, type McpToken } from '../../../logic/mcp';
import McpTokenDialog from './McpTokenDialog';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * Вкладка «Токены»: один список с создателем в колонке. Главный
 * администратор видит токены всех, остальные — свои.
 */
export default function McpTokens({
  isCreating,
  onCreatingChange,
}: {
  isCreating: boolean;
  onCreatingChange: (isOpen: boolean) => void;
}) {
  const { message } = App.useApp();
  const isRoot = useIsRoot();
  const tokens = useMcpTokens();
  const now = new Date();

  const revoke = async (token: McpToken, isExpired: boolean) => {
    try {
      await tokens.revoke(token);
      message.success(isExpired ? 'Токен удалён' : 'Токен отозван');
    } catch (error) {
      message.error(errorText(error, 'Не удалось отозвать токен'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {tokens.error && <Alert type="error" showIcon title={tokens.error} />}

      <Card
        title="Токены"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => onCreatingChange(true)}>
            Создать токен
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<McpToken>
          rowKey="id"
          loading={tokens.isLoading}
          dataSource={tokens.tokens}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: 'Токенов пока нет — ассистенты к панели не подключены' }}
          columns={[
            { key: 'name', title: 'Название', dataIndex: 'name' },
            {
              key: 'token',
              title: 'Токен',
              render: (_, token) => (
                <Typography.Text type="secondary" code>
                  {maskedToken(token.tokenTail)}
                </Typography.Text>
              ),
            },
            {
              key: 'user',
              title: 'Создал',
              render: (_, token) => token.userEmail ?? <Typography.Text type="secondary">Удалён</Typography.Text>,
            },
            {
              key: 'until',
              title: 'Действует до',
              render: (_, token) => {
                const until = untilText(token.expiresAt, now);
                return <Typography.Text type={until.isExpired ? 'danger' : undefined}>{until.text}</Typography.Text>;
              },
            },
            { key: 'lastUsedAt', title: 'Последний вызов', render: (_, token) => lastUsedText(token.lastUsedAt) },
            {
              key: 'actions',
              title: 'Действия',
              align: 'right',
              render: (_, token) => {
                const { isExpired } = untilText(token.expiresAt, now);
                return (
                  <Popconfirm
                    title={isExpired ? `Удалить токен «${token.name}»?` : `Отозвать токен «${token.name}»?`}
                    description={isExpired ? 'Он уже не работает.' : 'Ассистент с этим токеном сразу потеряет доступ.'}
                    okText={isExpired ? 'Удалить' : 'Отозвать'}
                    okButtonProps={{ danger: true }}
                    cancelText="Отмена"
                    onConfirm={() => revoke(token, isExpired)}
                  >
                    <Button type="link" danger>
                      {isExpired ? 'Удалить' : 'Отозвать'}
                    </Button>
                  </Popconfirm>
                );
              },
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ margin: 0, padding: '12px 16px' }}>
          Токен действует от имени того, кто его создал, со всеми его правами. Целиком он показывается один раз —
          при создании, в базе лежит только хэш. Выключенный пользователь теряет и свои токены.
          {isRoot ? ' Вы видите токены всех пользователей.' : ' Здесь — ваши токены.'}
        </Typography.Paragraph>
      </Card>

      <McpTokenDialog isOpen={isCreating} onCreate={tokens.create} onClose={() => onCreatingChange(false)} />
    </div>
  );
}
