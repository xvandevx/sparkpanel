import { useState } from 'react';
import { Alert, App, Button, Drawer, Input, Popconfirm, Space, Table, Tag, Typography, Upload } from 'antd';
import { DeleteOutlined, DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { EditorBackup } from '../../../redux/action-creaters/contentEditorNew';
import { ActionIcon } from '../ui';
import type { EditorListApi } from '../useLoadEditor';
import { BACKUP_KINDS, backupDescription, backupTitle } from './backupFormat';
import RestoreDialog from './RestoreDialog';
import { useBackups } from './useBackups';

const errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

/**
 * Шторка «Резервные копии»: снять копию списка, загрузить её из файла,
 * скачать, удалить и вернуть. Возврат — своим окном (`RestoreDialog`):
 * оно сначала показывает, что изменится.
 */
export default function BackupsDrawer({
  listKey,
  api,
  open,
  onClose,
}: {
  listKey: string;
  /** Api раздела: после восстановления редактор перечитывает им весь список */
  api: EditorListApi;
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const backups = useBackups(listKey, open);
  const [note, setNote] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [restoring, setRestoring] = useState<EditorBackup | null>(null);

  const create = async () => {
    setIsCreating(true);
    try {
      await backups.create(note);
      setNote('');
      message.success('Копия создана');
    } catch (error) {
      message.error(errorText(error, 'Не удалось создать копию'));
    } finally {
      setIsCreating(false);
    }
  };

  const upload = async (file: File) => {
    try {
      await backups.upload(file);
      message.success('Копия загружена — её можно восстановить');
    } catch (error) {
      message.error(errorText(error, 'Не удалось загрузить копию'));
    }
  };

  const run = (action: () => Promise<void>, failure: string) => async () => {
    try {
      await action();
    } catch (error) {
      message.error(errorText(error, failure));
    }
  };

  return (
    <Drawer open={open} onClose={onClose} size={560} title="Резервные копии" destroyOnHidden>
      <div className="flex flex-col gap-4">
        <Space.Compact className="w-full">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onPressEnter={create}
            placeholder="Подпись копии, необязательно"
            maxLength={200}
          />
          <Button type="primary" icon={<PlusOutlined />} loading={isCreating} onClick={create}>
            Создать копию
          </Button>
        </Space.Compact>

        <Upload
          accept=".json,application/json"
          showUploadList={false}
          // Файл не уходит сам: его читаем и отправляем своим запросом
          beforeUpload={(file) => {
            void upload(file);
            return false;
          }}
        >
          <Button icon={<UploadOutlined />}>Загрузить из файла</Button>
        </Upload>

        <Alert
          type="info"
          showIcon
          title="В копии — настройки списка, записи и значения их свойств. Перед восстановлением текущее состояние сохраняется копией само."
        />

        {backups.error && <Alert type="error" showIcon title={backups.error} />}

        <Table<EditorBackup>
          rowKey="id"
          size="small"
          loading={backups.isLoading}
          dataSource={backups.backups}
          pagination={false}
          locale={{ emptyText: 'Копий пока нет' }}
          columns={[
            {
              key: 'backup',
              title: 'Копия',
              render: (_, backup) => (
                <div className="flex flex-col gap-1">
                  <Space size={8} wrap>
                    <span>{backupTitle(backup)}</span>
                    <Tag color={BACKUP_KINDS[backup.kind].color}>{BACKUP_KINDS[backup.kind].label}</Tag>
                  </Space>
                  <Typography.Text type="secondary">{backupDescription(backup)}</Typography.Text>
                </div>
              ),
            },
            {
              key: 'actions',
              width: 180,
              align: 'right',
              render: (_, backup) => (
                <Space size={4}>
                  <Button type="link" size="small" onClick={() => setRestoring(backup)}>
                    Восстановить
                  </Button>
                  <ActionIcon
                    title="Скачать файлом"
                    icon={<DownloadOutlined />}
                    onClick={run(() => backups.download(backup), 'Не удалось скачать копию')}
                  />
                  <Popconfirm
                    title="Удалить копию?"
                    okText="Удалить"
                    okButtonProps={{ danger: true }}
                    cancelText="Отмена"
                    onConfirm={run(() => backups.remove(backup), 'Не удалось удалить копию')}
                  >
                    <span>
                      <ActionIcon title="Удалить копию" icon={<DeleteOutlined />} isDanger />
                    </span>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />

        <Typography.Text type="secondary">
          Копии «перед восстановлением» хранятся 30 дней, остальные — пока их не удалят.
        </Typography.Text>
      </div>

      <RestoreDialog
        listKey={listKey}
        api={api}
        backup={restoring}
        onClose={(isRestored) => {
          setRestoring(null);
          // Восстановление сняло копию «перед восстановлением» — она уже в списке
          if (isRestored) void backups.reload();
        }}
      />
    </Drawer>
  );
}
