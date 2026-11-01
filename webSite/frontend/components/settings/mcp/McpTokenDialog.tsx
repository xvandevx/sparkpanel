import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Segmented, Typography } from 'antd';
import { asRule } from '../../../logic/formRules';
import {
  claudeCodeCommand,
  DEFAULT_TERM,
  termDays,
  termHint,
  termText,
  TOKEN_TERMS,
  useMcpAddress,
  validateTokenName,
} from '../../../logic/mcp';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

interface Created {
  secret: string;
  name: string;
  term: number;
}

/**
 * «Создать токен»: название и срок, потом сам токен — один раз, с копированием
 * и готовой командой для Claude Code. Закрыли окно — токен больше не увидеть.
 */
export default function McpTokenDialog({
  isOpen,
  onCreate,
  onClose,
}: {
  isOpen: boolean;
  onCreate: (name: string, days: number | null) => Promise<string>;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const url = useMcpAddress();
  const [form] = Form.useForm<{ name: string }>();
  const [term, setTerm] = useState<number>(DEFAULT_TERM);
  const [created, setCreated] = useState<Created | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const create = async ({ name }: { name: string }) => {
    setIsSaving(true);
    try {
      setCreated({ secret: await onCreate(name, termDays(term)), name, term });
    } catch (error) {
      message.error(errorText(error, 'Не удалось создать токен'));
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    setCreated(null);
    setTerm(DEFAULT_TERM);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      title={created ? `Токен «${created.name}» создан` : 'Новый токен MCP'}
      onCancel={close}
      destroyOnHidden
      width={560}
      footer={
        created ? (
          <Button type="primary" onClick={close}>
            Готово
          </Button>
        ) : (
          <>
            <Button onClick={close}>Отмена</Button>
            <Button type="primary" loading={isSaving} onClick={() => form.submit()}>
              Создать
            </Button>
          </>
        )
      }
    >
      {created ? (
        <div className="flex flex-col gap-4">
          <Alert
            type="warning"
            showIcon
            title="Скопируйте токен сейчас — больше его не покажут. Потеряли — отзовите и создайте новый."
          />
          <div className="flex flex-col gap-1">
            <Typography.Text strong>Токен</Typography.Text>
            <Typography.Text code copyable style={{ wordBreak: 'break-all' }}>
              {created.secret}
            </Typography.Text>
            <Typography.Text type="secondary">Все ваши права · {termText(created.term, new Date())}</Typography.Text>
          </div>
          <div className="flex flex-col gap-1">
            <Typography.Text strong>Команда для Claude Code — токен уже подставлен</Typography.Text>
            <Typography.Paragraph copyable={{ text: claudeCodeCommand(url, created.secret) }} style={{ margin: 0 }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {claudeCodeCommand(url, created.secret)}
              </pre>
            </Typography.Paragraph>
            <Typography.Text type="secondary">Для Claude Desktop, Cursor и других — на вкладке «Подключение»</Typography.Text>
          </div>
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item
            name="name"
            label="Название"
            extra="Чтобы потом понять, какой токен где стоит, и отозвать нужный."
            rules={[{ validator: asRule(validateTokenName) }]}
          >
            <Input autoFocus maxLength={100} placeholder="Например: Claude Code — ноутбук" />
          </Form.Item>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            title="Токен получает все ваши права: ассистент сможет читать, создавать, править и удалять записи, сохранять и публиковать черновики. Правки видны в журнале записи."
          />
          <Form.Item label="Срок действия" extra={termHint(term, new Date())} style={{ marginBottom: 0 }}>
            <Segmented<number>
              value={term}
              onChange={setTerm}
              options={TOKEN_TERMS}
            />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
