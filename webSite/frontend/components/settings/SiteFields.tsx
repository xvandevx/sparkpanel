import { useRouter } from 'next/router';
import { Button, Form, Input, Select, Space } from 'antd';
import { CloudServerOutlined } from '@ant-design/icons';
import { useStorageOptions, type SettingsDraft } from '../../logic/settings';
import { FORM_LAYOUT } from '../contentEditorNew/ui';

/**
 * Вкладка «Общие»: название сайта и куда загружаются новые файлы — во встроенное
 * хранилище или в одно из внешних. Сами внешние хранилища заводят и правят
 * на своей странице «Настройки» → «Хранилища»: это список со своими карточками,
 * а не поле формы, — кнопка рядом с выбором ведёт туда.
 */
export default function SiteFields({
  draft,
  onChange,
}: {
  draft: SettingsDraft;
  onChange: (patch: Partial<SettingsDraft>) => void;
}) {
  const router = useRouter();
  const { options, isLoading } = useStorageOptions();

  return (
    <Form {...FORM_LAYOUT} style={{ maxWidth: 880 }}>
      <Form.Item label="Название сайта" extra="Видно в панели и доступно шаблонам сайта">
        <Input
          value={draft.siteName}
          placeholder="Например, Фаркоп.ру"
          onChange={(event) => onChange({ siteName: event.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="Хранилище"
        extra="Куда загружаются новые файлы. Уже загруженные остаются там, куда их положили"
      >
        <Space.Compact style={{ width: '100%' }}>
          <Select
            value={draft.storageId}
            options={options}
            loading={isLoading}
            style={{ width: '100%' }}
            onChange={(storageId: string) => onChange({ storageId })}
          />
          <Button
            icon={<CloudServerOutlined />}
            onClick={() => router.push('/admin/settings/storages')}
          >
            Хранилища
          </Button>
        </Space.Compact>
      </Form.Item>
    </Form>
  );
}
