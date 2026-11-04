import { useRouter } from 'next/router';
import { App, Button, Form, Input, Layout, Select, Space, Upload } from 'antd';
import { CloudServerOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import {
  LOGO_ACCEPT,
  logoFileProblem,
  readLogo,
  useStorageOptions,
  type SettingsDraft,
} from '../../logic/settings';
import { FORM_LAYOUT } from '../contentEditorNew/ui';
import { BrandMark } from '../ui';

/**
 * Вкладка «Общие»: название сайта и куда загружаются новые файлы — во встроенное
 * хранилище или в одно из внешних. Сами внешние хранилища заводят и правят
 * на своей странице «Настройки» → «Хранилища»: это список со своими карточками,
 * а не поле формы, — кнопка рядом с выбором ведёт туда. Логотип панели
 * ложится в черновик картинкой и уходит общим «Сохранить», как остальное.
 */
export default function SiteFields({
  draft,
  onChange,
}: {
  draft: SettingsDraft;
  onChange: (patch: Partial<SettingsDraft>) => void;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const { options, isLoading } = useStorageOptions();

  // Файл не уходит сам: картинка ложится в черновик и сохраняется со всей формой
  const pickLogo = (file: File) => {
    const problem = logoFileProblem(file);
    if (problem) message.error(problem);
    else readLogo(file).then((logo) => onChange({ logo }), (error: Error) => message.error(error.message));
    return false;
  };

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
      <Form.Item
        label="Логотип"
        extra="Показывается вместо логотипа SparkPanel в левом меню и на экране входа — на тёмном фоне, высотой 36 px. Не загружен — остаётся SparkPanel. PNG, JPEG, WebP, GIF или SVG до 512 КБ"
      >
        <Space align="start" wrap>
          {/* Превью — на том же фоне и той же ширины, что левое меню */}
          {/* Своего логотипа нет — превью нет: SparkPanel здесь читался бы как
              загруженный логотип, а не как «ничего не выбрано» */}
          {draft.logo && (
            <Layout.Sider width={232} style={{ padding: '18px 20px', borderRadius: 8 }}>
              <BrandMark logoUrl={draft.logo} logoAlt={draft.siteName} />
            </Layout.Sider>
          )}
          <Space orientation="vertical">
            <Upload accept={LOGO_ACCEPT} showUploadList={false} beforeUpload={pickLogo}>
              <Button icon={<UploadOutlined />}>Загрузить</Button>
            </Upload>
            {draft.logo && (
              <Button icon={<DeleteOutlined />} onClick={() => onChange({ logo: '' })}>
                Убрать
              </Button>
            )}
          </Space>
        </Space>
      </Form.Item>
    </Form>
  );
}
