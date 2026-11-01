import { createElement } from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { useLogin } from '../../logic/auth';
import { sectionPath, useNavigation } from '../../logic/navigation';

/** Главная: приветствие и быстрый переход в разделы. */
export default function DashboardScreen() {
  const { user } = useLogin();
  const { sections, navigate } = useNavigation();

  // На главной саму «Главную» не показываем — это текущий раздел.
  const shortcuts = sections.filter((section) => section.key !== '/admin');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <Typography.Title level={4} style={{ marginBottom: 4 }}>
          {user?.name ? `Здравствуйте, ${user.name}` : 'Здравствуйте'}
        </Typography.Title>
        <Typography.Text type="secondary">
          Выберите раздел в меню слева или перейдите по карточке ниже.
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        {shortcuts.map((section) => (
          <Col key={section.key} xs={24} sm={12} lg={8}>
            <Card hoverable onClick={() => navigate(sectionPath(section))} style={{ height: '100%' }}>
              <Typography.Text style={{ fontSize: 22, opacity: 0.8 }}>
                {createElement(section.icon)}
              </Typography.Text>
              <Typography.Title level={5} style={{ marginTop: 12, marginBottom: 0 }}>
                {section.label}
              </Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
