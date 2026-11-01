import { Alert, Button, Form, Input } from 'antd';
import { LockOutlined, MailOutlined } from '@ant-design/icons';
import { asRule, useLogin, validateEmail, validatePassword } from '../../logic/auth';

interface LoginValues {
  email: string;
  password: string;
}

/** Форма входа. Правила валидации — чистые функции из logic/auth. */
export default function LoginForm() {
  const { loading, error, submit, isDevLogin, devLogin } = useLogin();

  return (
    <Form<LoginValues>
      layout="vertical"
      requiredMark={false}
      size="large"
      onFinish={({ email, password }) => submit(email, password)}
    >
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
        rules={[{ validator: asRule((value) => validatePassword(value)) }]}
        validateTrigger="onSubmit"
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="••••••••"
          autoComplete="current-password"
        />
      </Form.Item>

      {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

      <Button type="primary" htmlType="submit" loading={loading} block>
        Войти
      </Button>

      {/* Только локально: сервер включает его флагом DEV_LOGIN и никогда на проде */}
      {isDevLogin && (
        <Button type="dashed" block style={{ marginTop: 8 }} disabled={loading} onClick={devLogin}>
          Войти без пароля (dev)
        </Button>
      )}
    </Form>
  );
}
