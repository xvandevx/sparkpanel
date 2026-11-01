import { useState } from 'react';
import { Button, Card, Descriptions, Segmented, Steps, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { connectionOf, MCP_CLIENTS, TOKEN_PLACEHOLDER, useMcpAddress, type McpClient } from '../../../logic/mcp';

/** Что ассистент умеет — карточками: инструменты сервера по смыслу. */
const ABILITIES: { title: string; tools: string[]; text: string }[] = [
  {
    title: 'Узнаёт структуру',
    tools: ['list_lists', 'describe_list'],
    text: 'какие есть списки, их поля и свойства по кодам, варианты, куда ведут привязки',
  },
  {
    title: 'Находит записи',
    tools: ['find_records', 'get_record'],
    text: 'поиск и фильтр по полям и свойствам — тот же, что в таблице раздела',
  },
  {
    title: 'Правит одним вызовом',
    tools: ['save_record', 'delete_record', 'upload_file'],
    text: 'поля и свойства по кодам сразу — с теми же проверками, что в панели: обязательный код, защищённые записи, адрес страницы',
  },
  {
    title: 'Работает с черновиками',
    tools: ['publish_draft', 'discard_draft'],
    text: 'видит опубликованное и черновик, сохраняет в любую версию, публикует и удаляет черновик',
  },
];

const Code = ({ children }: { children: string }) => <Typography.Text code>{children}</Typography.Text>;

/** Вкладка «Подключение»: адрес и правила сервера, текст подключения для клиента, что умеет ассистент. */
export default function McpConnect({ onCreateToken }: { onCreateToken: () => void }) {
  const url = useMcpAddress();
  const [client, setClient] = useState<McpClient>('code');
  const connection = connectionOf(client, url, TOKEN_PLACEHOLDER);

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
              label: 'Адрес MCP-сервера',
              children: <Typography.Text code copyable>{url}</Typography.Text>,
            },
            {
              key: 'transport',
              label: 'Транспорт',
              children: 'Streamable HTTP — сервер встроен в панель, ставить ничего не нужно',
            },
            {
              key: 'auth',
              label: 'Авторизация',
              children: (
                <>
                  Заголовок <Code>Authorization: Bearer spm_…</Code> — личный токен с вкладки «Токены»
                </>
              ),
            },
            {
              key: 'rights',
              label: 'Права',
              children:
                'Все права владельца токена сразу: читать, создавать, править, удалять, публиковать черновики. ' +
                'Чего владелец не может в панели, того не сможет и ассистент',
            },
            {
              key: 'drafts',
              label: 'Черновики',
              children:
                'В списках с включёнными черновиками ассистент видит обе версии записи и сам выбирает, куда ' +
                'сохранить: в черновик или сразу в опубликованное. Без указания — в черновик',
            },
            {
              key: 'journal',
              label: 'Журнал',
              children: 'Правка ассистента видна в истории записи с пометкой «MCP «название токена»»',
            },
            {
              key: 'limits',
              label: 'Чего ассистент не меняет',
              children: 'Свойства и настройки списков, пользователей и роли, хранилища, ключи API и токены, резервные копии',
            },
          ]}
        />
      </Card>

      <Card
        title="Подключить ассистента"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={onCreateToken}>
            Создать токен
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <Segmented<McpClient> options={MCP_CLIENTS} value={client} onChange={setClient} />
          <Steps
            orientation="vertical"
            size="small"
            current={-1}
            items={[
              {
                title: 'Создайте токен',
                content: 'На вкладке «Токены». Целиком он показывается один раз — сразу скопируйте',
              },
              {
                title: connection.where,
                content: (
                  <div className="flex flex-col gap-2 pt-1">
                    <Typography.Paragraph
                      copyable={{ text: connection.snippet }}
                      style={{ margin: 0 }}
                    >
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{connection.snippet}</pre>
                    </Typography.Paragraph>
                    <Typography.Text type="secondary">
                      Вместо <Code>{TOKEN_PLACEHOLDER}</Code> — токен из первого шага.
                    </Typography.Text>
                  </div>
                ),
              },
              {
                title: 'Проверьте',
                content: (
                  <>
                    Спросите ассистента: «Какие списки есть в SparkPanel?» — он вызовет <Code>list_lists</Code>, а
                    вызов появится на вкладке «Журнал»
                  </>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <Card title="Как ассистент работает с данными">
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {ABILITIES.map((ability) => (
            <Card key={ability.title} size="small" title={ability.title}>
              <Typography.Text>
                {ability.tools.map((tool, index) => (
                  <span key={tool}>
                    {index > 0 && ', '}
                    <Code>{tool}</Code>
                  </span>
                ))}
                : {ability.text}
              </Typography.Text>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
