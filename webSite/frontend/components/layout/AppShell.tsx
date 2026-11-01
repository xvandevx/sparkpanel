import { ReactNode, useState } from 'react';
import { Layout } from 'antd';
import { Sidebar } from './sidebar';

const { Content } = Layout;

/**
 * Каркас приложения: левое меню + область раздела.
 *
 * Шапки с названием раздела нет намеренно: название уже есть на самом экране
 * (в редакторе контента оно ещё и настраивается — это «Имя» списка), а где
 * пользователь находится, видно по подсветке в меню. Шапка повторяла то же
 * самое третий раз и занимала высоту на каждом экране.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout>
        <Content style={{ padding: 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
