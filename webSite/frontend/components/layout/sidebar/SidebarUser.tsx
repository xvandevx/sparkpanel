import { LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Avatar, Dropdown, Tag, Tooltip, Typography } from 'antd';
import { useAuthActions, useLogin } from '../../../logic/auth';

/**
 * Учётная запись в нижней части левого меню: кто вошёл и выход из системы.
 * Меню тёмное, поэтому цвета текста задаём явно — типографика antd рассчитана
 * на светлый фон.
 */
export default function SidebarUser({ collapsed }: { collapsed: boolean }) {
  const { user } = useLogin();
  const { logout } = useAuthActions();

  if (!user) return null;

  const title = user.name || user.email;
  const roleLabel = user.isRoot ? 'Администратор' : 'Пользователь';

  return (
    <Dropdown
      trigger={['click']}
      // Блок прижат к низу экрана — список раскрываем вверх
      placement={collapsed ? 'topLeft' : 'top'}
      menu={{
        items: [
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Завершить сеанс',
            onClick: logout,
          },
        ],
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : undefined,
          gap: 10,
          padding: collapsed ? '12px' : '12px 20px',
          cursor: 'pointer',
          borderBlockStart: '1px solid rgba(255, 255, 255, 0.12)',
        }}
      >
        <Tooltip title={collapsed ? `${title} · ${roleLabel}` : ''} placement="right">
          <Avatar icon={<UserOutlined />} />
        </Tooltip>

        {!collapsed && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <Typography.Text
              strong
              ellipsis={{ tooltip: title }}
              style={{ color: 'rgba(255, 255, 255, 0.85)' }}
            >
              {title}
            </Typography.Text>
            <Tag
              color={user.isRoot ? 'blue' : 'default'}
              style={{ marginInlineEnd: 0, fontSize: 11, lineHeight: '16px', width: 'fit-content' }}
            >
              {roleLabel}
            </Tag>
          </div>
        )}
      </div>
    </Dropdown>
  );
}
