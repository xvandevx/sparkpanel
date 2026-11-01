import  { Card, Empty, Typography } from 'antd';
import { useNavigation } from '../../logic/navigation';

/**
 * Заглушка раздела: название берём из конфигурации меню, чтобы подписи
 * в шапке, меню и на странице не разъезжались.
 */
export default function SectionPlaceholder() {
  const { currentSection } = useNavigation();

  return (
    <Card>
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <div>
            <Typography.Title level={5} style={{ marginBottom: 4 }}>
              {currentSection?.label ?? 'Раздел'}
            </Typography.Title>
            <Typography.Text type="secondary">Раздел в разработке</Typography.Text>
          </div>
        }
      />
    </Card>
  );
}
