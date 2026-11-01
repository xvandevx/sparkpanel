import { useState } from 'react';
import { Alert, Button, Form, Input, Space, Typography } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import {
  asRule,
  ROOT_PASSWORD_MIN_LENGTH,
  useRootSetup,
  validateEmail,
  validatePassword,
  validatePasswordConfirm,
} from '../../logic/auth';

interface RootValues {
  name?: string;
  email: string;
  password: string;
  passwordConfirm: string;
}

/**
 * Первичная настройка: сообщение об отсутствующей учётной записи администратора
 * и форма её создания.
 */
export default function RootSetup() {
  const { loading, error, submit } = useRootSetup();
  const [formOpen, setFormOpen] = useState(false);

  if (!formOpen) {
    return (
      <Space direction="vertical" size={20} style={{ width: '100%' }}>
        <Alert
          type="warning"
          showIcon
          message="Учётная запись администратора не найдена"
          description="Система не инициализирована. Создайте учётную запись администратора — она получит полный доступ к панели. Создание выполняется однократно."
        />
        <Button type="primary" size="large" block onClick={() => setFormOpen(true)}>
          Начать настройку
        </Button>
      </Space>
    );
  }

  return (
    <Form<RootValues>
      layout="vertical"
      requiredMark={false}
      size="large"
      onFinish={({ name, email, password }) =>
        submit({ email, password, name: name?.trim() || undefined })
      }
    >
      <Form.Item name="name" label="Имя">
        <Input prefix={<UserOutlined />} placeholder="Необязательно" />
      </Form.Item>

      <Form.Item
        name="email"
        label="Email"
        rules={[{ validator: asRule(validateEmail) }]}
        validateTrigger="onSubmit"
      >
        <Input
          prefix={<MailOutlined />}
          placeholder="name@company.com"
          autoComplete="username"
          autoFocus
        />
      </Form.Item>

      <Form.Item
        name="password"
        label="Пароль"
        rules={[{ validator: asRule((value) => validatePassword(value, ROOT_PASSWORD_MIN_LENGTH)) }]}
        validateTrigger="onSubmit"
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={`Не менее ${ROOT_PASSWORD_MIN_LENGTH} символов`}
          autoComplete="new-password"
        />
      </Form.Item>

      <Form.Item
        name="passwordConfirm"
        label="Подтверждение пароля"
        dependencies={['password']}
        validateTrigger="onSubmit"
        rules={[
          ({ getFieldValue }) => ({
            validator: (_rule, value) => {
              const message = validatePasswordConfirm(getFieldValue('password'), value);
              return message ? Promise.reject(new Error(message)) : Promise.resolve();
            },
          }),
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="••••••••"
          autoComplete="new-password"
        />
      </Form.Item>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Button type="primary" htmlType="submit" loading={loading} block>
          Создать учётную запись
        </Button>
        <Button type="text" block onClick={() => setFormOpen(false)}>
          Отмена
        </Button>
      </Space>

      <Typography.Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
        Учётная запись получит роль администратора с полным доступом.
      </Typography.Paragraph>
    </Form>
  );
}
