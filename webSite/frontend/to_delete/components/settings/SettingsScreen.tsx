import { Space } from 'antd';
import DomainsPanel from './DomainsPanel';
import SiteForm from './SiteForm';

/**
 * Раздел «Настройки»: сверху параметры сайта формой, ниже домены списком.
 * Домены — полноценные записи со своей карточкой и историей, поэтому они
 * редактируются редактором контента, а не полем в форме.
 */
export default function SettingsScreen() {
  return (
    <Space direction="vertical" size={24} style={{ display: 'flex' }}>
      <SiteForm />
      <DomainsPanel />
    </Space>
  );
}
