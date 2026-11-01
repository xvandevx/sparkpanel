import { Card, Typography } from 'antd';
import { useLogin } from '../../logic/auth';
import { BrandMark, VantaHalo } from '../ui';
import LoginForm from './LoginForm';
import RootSetup from './RootSetup';

const headings = {
  setup: { title: 'Настройка системы', subtitle: 'Первичная инициализация панели' },
  login: { title: 'Вход в систему', subtitle: 'Укажите учётные данные' },
};

/** Экран доступа: первичная настройка либо вход. Что показывать — решает useLogin. */
export default function AdminAuthScreen() {
  const { needsRoot } = useLogin();
  const { title, subtitle } = needsRoot ? headings.setup : headings.login;

  return (
    <>
      <VantaHalo />

      {/* relative z-10 — чтобы карточка оказалась над fixed-подложкой фона */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="flex w-full max-w-md flex-col items-center gap-8">
          <BrandMark />

          <Card
            style={{ width: '100%' }}
            styles={{ body: { padding: 28 } }}
          >
            <Typography.Title level={3} style={{ marginBottom: 4 }}>
              {title}
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
              {subtitle}
            </Typography.Paragraph>

            {needsRoot ? <RootSetup /> : <LoginForm />}
          </Card>

          {/* Подпись лежит на тёмном фоне-подложке, поэтому цвет светлый */}
          <Typography.Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>
            SparkPanel · система администрирования
          </Typography.Text>
        </div>
      </div>
    </>
  );
}
