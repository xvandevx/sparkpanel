import { Alert, Card, Segmented, Select, Table, Tag, Typography } from 'antd';
import { formatDateTime } from '../../../logic/dateFormat';
import {
  MCP_CALLS_VIEWS,
  MCP_TOOL_NAMES,
  resultTone,
  useMcpCalls,
  useMcpTokens,
  type McpCall,
  type McpCallsView,
} from '../../../logic/mcp';

/** Вкладка «Журнал»: вызовы инструментов за 30 дней — отбор по токену, инструменту и виду. */
export default function McpCalls() {
  const journal = useMcpCalls();
  const { tokens } = useMcpTokens();

  return (
    <div className="flex flex-col gap-4">
      {journal.error && <Alert type="error" showIcon title={journal.error} />}

      <Card title="Вызовы инструментов" styles={{ body: { padding: 0 } }}>
        <div className="flex flex-wrap items-center gap-3" style={{ padding: '12px 16px' }}>
          <Select<number>
            style={{ minWidth: 220 }}
            allowClear
            placeholder="Все токены"
            value={journal.filter.tokenId ?? undefined}
            onChange={(tokenId) => journal.changeFilter({ tokenId: tokenId ?? null })}
            options={tokens.map((token) => ({ value: token.id, label: token.name }))}
          />
          <Select<string>
            style={{ minWidth: 180 }}
            allowClear
            placeholder="Все инструменты"
            value={journal.filter.tool ?? undefined}
            onChange={(tool) => journal.changeFilter({ tool: tool ?? null })}
            options={MCP_TOOL_NAMES.map((tool) => ({ value: tool, label: tool }))}
          />
          <Segmented<McpCallsView>
            options={MCP_CALLS_VIEWS}
            value={journal.filter.view}
            onChange={(view) => journal.changeFilter({ view })}
          />
        </div>
        <Table<McpCall>
          rowKey="id"
          loading={journal.isLoading}
          dataSource={journal.calls}
          scroll={{ x: 960 }}
          locale={{ emptyText: 'Вызовов пока не было' }}
          pagination={{
            current: journal.page,
            pageSize: journal.pageSize,
            total: journal.total,
            pageSizeOptions: [20, 50, 100],
            showSizeChanger: true,
            onChange: journal.changePage,
          }}
          columns={[
            { key: 'createdAt', title: 'Время', width: 170, render: (_, call) => formatDateTime(call.createdAt) },
            {
              key: 'who',
              title: 'Кто',
              width: 240,
              render: (_, call) => (
                <div className="flex flex-col">
                  <Typography.Text>{call.userEmail}</Typography.Text>
                  <Typography.Text type="secondary">{call.tokenName}</Typography.Text>
                </div>
              ),
            },
            {
              key: 'tool',
              title: 'Инструмент',
              width: 150,
              render: (_, call) => <Typography.Text code>{call.tool}</Typography.Text>,
            },
            {
              key: 'what',
              title: 'Что',
              render: (_, call) => (
                <div className="flex flex-col">
                  <Typography.Text>{call.what || '—'}</Typography.Text>
                  {call.detail && <Typography.Text type="secondary">{call.detail}</Typography.Text>}
                </div>
              ),
            },
            {
              key: 'result',
              title: 'Результат',
              width: 170,
              render: (_, call) => <Tag color={resultTone(call)}>{call.result}</Tag>,
            },
          ]}
        />
        <Typography.Paragraph type="secondary" style={{ margin: 0, padding: '12px 16px' }}>
          Журнал хранит вызовы за 30 дней. Изменения записей видны ещё и в их истории.
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
