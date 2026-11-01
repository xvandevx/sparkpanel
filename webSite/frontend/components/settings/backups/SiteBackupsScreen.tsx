import { useState } from 'react';
import { Alert, App, Avatar, Button, Card, Popconfirm, Result, Space, Table, Tag, theme, Typography, Upload } from 'antd';
import { DatabaseOutlined, DeleteOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useIsRoot } from '../../../logic/auth';
import { formatDateTime } from '../../../logic/dateFormat';
import {
  BACKUP_KINDS,
  backupsTotalText,
  sizeText,
  useSiteBackups,
  type SiteBackup,
} from '../../../logic/siteBackups';
import { PageTitle } from '../../ui';
import SiteRestoreDialog from './SiteRestoreDialog';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * «Резервные копии» — подпункт «Настроек»: копии всей базы. Снять копию,
 * загрузить её из файла, скачать, удалить и вернуть сайт к ней. Файлы
 * медиатеки в копию не входят. Видит экран только главный администратор:
 * в копии хэши паролей и ключи хранилищ — сервер остальным отказывает тоже.
 */
export default function SiteBackupsScreen() {
  const isRoot = useIsRoot();
  if (!isRoot) {
    return (
      <Result
        status="403"
        title="Только главный администратор"
        subTitle="Резервные копии сайта видит и восстанавливает только главный администратор."
      />
    );
  }
  return <SiteBackups />;
}

function SiteBackups() {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const backups = useSiteBackups();
  const [isCreating, setIsCreating] = useState(false);
  const [restoring, setRestoring] = useState<SiteBackup | null>(null);

  const run = (action: () => Promise<void>, failure: string, success?: string) => async () => {
    try {
      await action();
      if (success) message.success(success);
    } catch (error) {
      message.error(errorText(error, failure));
    }
  };

  const create = async () => {
    setIsCreating(true);
    await run(backups.create, 'Не удалось создать копию', 'Копия создана')();
    setIsCreating(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <PageTitle>Резервные копии</PageTitle>
        <Space wrap className="ml-auto">
          <Upload
            accept=".gz,.json,application/gzip,application/json"
            showUploadList={false}
            // Файл не уходит сам: его отправляет свой запрос, с токеном
            beforeUpload={(file) => {
              void run(
                () => backups.upload(file),
                'Не удалось загрузить копию',
                'Копия загружена — из неё можно восстановить сайт',
              )();
              return false;
            }}
          >
            <Button icon={<UploadOutlined />}>Загрузить копию</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} loading={isCreating} onClick={create}>
            Создать копию сейчас
          </Button>
        </Space>
      </div>

      <Card title="Что входит в копию">
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <Avatar size={40} icon={<DatabaseOutlined />} style={{ background: token.colorPrimaryBg, color: token.colorPrimary }} />
            <div className="flex flex-col gap-1">
              <span>
                База данных
                {backups.databaseSize !== null && ` · ${sizeText(backups.databaseSize)}`}
              </span>
              <Typography.Text type="secondary">
                Все разделы и их настройки, пользователи и роли, домены, журнал изменений. Файлы
                медиатеки в копию не входят.
              </Typography.Text>
            </div>
          </div>
          <Alert
            type="info"
            showIcon
            title="В копии лежат хэши паролей и секретные ключи — копии видит и скачивает только главный администратор."
          />
        </div>
      </Card>

      {backups.error && <Alert type="error" showIcon title={backups.error} />}

      <Card
        title="Копии"
        extra={<Typography.Text type="secondary">{backupsTotalText(backups.backups)}</Typography.Text>}
        styles={{ body: { padding: 0 } }}
      >
        <Table<SiteBackup>
          rowKey="id"
          loading={backups.isLoading}
          dataSource={backups.backups}
          pagination={false}
          scroll={{ x: 820 }}
          locale={{ emptyText: 'Копий пока нет' }}
          columns={[
            {
              key: 'createdAt',
              title: 'Создана',
              render: (_, backup) => formatDateTime(backup.createdAt),
            },
            {
              key: 'kind',
              title: 'Как',
              render: (_, backup) => (
                <Tag color={BACKUP_KINDS[backup.kind].color}>{BACKUP_KINDS[backup.kind].label}</Tag>
              ),
            },
            { key: 'note', title: 'Файл', dataIndex: 'note' },
            { key: 'size', title: 'Размер', render: (_, backup) => sizeText(backup.size) },
            { key: 'author', title: 'Автор', dataIndex: 'authorEmail' },
            {
              key: 'actions',
              title: 'Действия',
              align: 'right',
              render: (_, backup) => (
                <Space size={0}>
                  <Button type="link" onClick={() => setRestoring(backup)}>
                    Восстановить
                  </Button>
                  <Button type="link" onClick={run(() => backups.download(backup), 'Не удалось скачать копию')}>
                    Скачать
                  </Button>
                  <Popconfirm
                    title="Удалить копию?"
                    okText="Удалить"
                    okButtonProps={{ danger: true }}
                    cancelText="Отмена"
                    onConfirm={run(() => backups.remove(backup), 'Не удалось удалить копию')}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} aria-label="Удалить копию" />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <Typography.Text type="secondary">
        Копии «перед восстановлением» хранятся 30 дней, остальные — пока их не удалят.
      </Typography.Text>

      <SiteRestoreDialog backup={restoring} onRestore={backups.restore} onClose={() => setRestoring(null)} />
    </div>
  );
}
