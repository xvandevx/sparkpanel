import { ReactNode } from 'react';
import { Spin } from 'antd';
import { useLoadSession, useLogin } from '../../logic/auth';
import { AdminAuthScreen } from '../admin';
import AppShell from './AppShell';

/**
 * Точка входа любой страницы админки: пока не знаем, кто пришёл — крутилка,
 * без авторизации — экран входа (или первичной настройки), иначе — приложение.
 * Загрузку сессии дергаем здесь один раз на страницу.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  useLoadSession();
  const { isAuthorized, isReady } = useLogin();

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" description="Проверка доступа" />
      </div>
    );
  }

  if (!isAuthorized) return <AdminAuthScreen />;

  return <AppShell>{children}</AppShell>;
}
