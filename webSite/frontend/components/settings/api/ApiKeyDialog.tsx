import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Typography } from 'antd';
import { asRule } from '../../../logic/formRules';
import { validateKeyName } from '../../../logic/externalApi';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * «Создать ключ»: название, потом сам ключ — один раз, с копированием.
 * Закрыли окно — ключ больше не увидеть: на сервере только его хэш.
 */
export default function ApiKeyDialog({
  isOpen,
  onCreate,
  onClose,
}: {
  isOpen: boolean;
  onCreate: (name: string) => Promise<string>;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<{ name: string }>();
  const [secret, setSecret] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const create = async ({ name }: { name: string }) => {
    setIsSaving(true);
    try {
      setSecret(await onCreate(name));
    } catch (error) {
      message.error(errorText(error, 'Не удалось создать ключ'));
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    setSecret(null);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      title={secret ? 'Ключ создан' : 'Новый ключ'}
      onCancel={close}
      destroyOnHidden
      footer={
        secret ? (
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
      {secret ? (
        <div className="flex flex-col gap-4">
          <Alert
            type="warning"
            showIcon
            title="Скопируйте ключ сейчас: после закрытия окна его не покажет никто — на сервере лежит только хэш."
          />
          <Typography.Text code copyable style={{ wordBreak: 'break-all' }}>
            {secret}
          </Typography.Text>
        </div>
      ) : (
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item
            name="name"
            label="Название"
            extra="Для кого ключ — чтобы потом знать, какой отзывать: «Сайт farkop.ru», «Мобильное приложение»."
            rules={[{ validator: asRule(validateKeyName) }]}
          >
            <Input autoFocus maxLength={100} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
