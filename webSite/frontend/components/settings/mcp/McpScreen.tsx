import { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { PageTitle } from '../../ui';
import McpCalls from './McpCalls';
import McpConnect from './McpConnect';
import McpTokens from './McpTokens';

type McpTab = 'connect' | 'tokens' | 'calls';

/**
 * «MCP» — подпункт «Настроек»: ИИ-ассистенты работают с панелью без браузера.
 * «Подключение» — адрес, правила и готовый текст для клиента; «Токены» —
 * личные токены (у root — все); «Журнал» — что ассистенты вызывали.
 * Токен заводит себе любой пользователь: он действует с правами владельца.
 */
export default function McpScreen() {
  const [tab, setTab] = useState<McpTab>('connect');
  const [isCreating, setIsCreating] = useState(false);

  const startCreating = () => {
    setTab('tokens');
    setIsCreating(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <PageTitle>MCP</PageTitle>
        <Typography.Text type="secondary">
          ИИ-ассистенты — Claude, Cursor и другие — читают и правят записи панели напрямую, без браузера. Каждый
          токен действует с правами своего владельца, правки попадают в журнал записи.
        </Typography.Text>
      </div>
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as McpTab)}
        // Журнал читается при каждом показе вкладки — не раньше
        destroyOnHidden
        items={[
          { key: 'connect', label: 'Подключение', children: <McpConnect onCreateToken={startCreating} /> },
          {
            key: 'tokens',
            label: 'Токены',
            children: <McpTokens isCreating={isCreating} onCreatingChange={setIsCreating} />,
          },
          { key: 'calls', label: 'Журнал', children: <McpCalls /> },
        ]}
      />
    </div>
  );
}
