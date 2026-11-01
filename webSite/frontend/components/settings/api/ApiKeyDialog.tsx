import { useState } from 'react';
import { Alert, App, Button, Checkbox, Form, Input, Modal, Radio, Typography } from 'antd';
import { asRule } from '../../../logic/formRules';
import {
  newApiKeyOf,
  validateKeyName,
  validateWriteLists,
  writeListGroups,
  type ApiList,
  type KeyForm,
  type NewApiKey,
} from '../../../logic/externalApi';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * «Создать ключ»: название и права, потом сам ключ — один раз, с копированием.
 * Закрыли окно — ключ больше не увидеть: на сервере только его хэш. Права
 * после создания не меняются: нужен другой доступ — новый ключ.
 */
export default function ApiKeyDialog({
  isOpen,
  lists,
  onCreate,
  onClose,
}: {
  isOpen: boolean;
  /** Списки API — из них выбирают, куда ключ может писать */
  lists: ApiList[];
  onCreate: (key: NewApiKey) => Promise<string>;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm<KeyForm>();
  const isWritable = Form.useWatch('isWritable', form) === true;
  const writeScope = Form.useWatch('writeScope', form);
  const [secret, setSecret] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const create = async (values: KeyForm) => {
    setIsSaving(true);
    try {
      setSecret(await onCreate(newApiKeyOf(values)));
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
        <Form form={form} layout="vertical" onFinish={create} initialValues={{ isWritable: false, writeScope: 'all' }}>
          <Form.Item
            name="name"
            label="Название"
            extra="Для кого ключ — чтобы потом знать, какой отзывать: «Сайт farkop.ru», «Обмен с 1С»."
            rules={[{ validator: asRule(validateKeyName) }]}
          >
            <Input autoFocus maxLength={100} />
          </Form.Item>
          <Form.Item
            label="Права"
            extra="После создания права не меняются: нужен другой доступ — создайте новый ключ, а старый отзовите."
            style={{ marginBottom: isWritable ? 8 : undefined }}
          >
            <div className="flex flex-col gap-1">
              <Checkbox checked disabled>
                Чтение
              </Checkbox>
              <Form.Item name="isWritable" valuePropName="checked" noStyle>
                <Checkbox>Запись — создавать, менять и удалять записи</Checkbox>
              </Form.Item>
            </div>
          </Form.Item>
          {isWritable && (
            <>
              <Form.Item name="writeScope" style={{ marginBottom: writeScope === 'selected' ? 8 : undefined }}>
                <Radio.Group
                  options={[
                    { value: 'all', label: 'Все списки' },
                    { value: 'selected', label: 'Отмеченные' },
                  ]}
                />
              </Form.Item>
              {writeScope === 'selected' && (
                <Form.Item name="writeLists" rules={[{ validator: asRule(validateWriteLists) }]}>
                  <Checkbox.Group className="flex flex-col gap-3">
                    {writeListGroups(lists).map(({ group, options }) => (
                      <div key={group} className="flex flex-col gap-1">
                        <Typography.Text type="secondary">{group}</Typography.Text>
                        {options.map((option) => (
                          <Checkbox key={option.value} value={option.value}>
                            {option.label}
                          </Checkbox>
                        ))}
                      </div>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              )}
            </>
          )}
        </Form>
      )}
    </Modal>
  );
}
