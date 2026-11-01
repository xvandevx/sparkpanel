import { useState } from 'react';
import { Alert, App, Button, Form, Input, Modal, Typography } from 'antd';
import {
  BACKUP_KINDS,
  CONFIRM_WORD,
  isConfirmWord,
  siteBackupSummary,
  type SiteBackup,
} from '../../../logic/siteBackups';
import { formatDateTime } from '../../../logic/dateFormat';

/**
 * Окно «Восстановить сайт из копии». Возврат стирает всю базу, поэтому его
 * подтверждают словом, а не одной кнопкой. Пока сервер работает, окно
 * не закрыть; после успеха страница загружается заново (`restore` сам).
 */
export default function SiteRestoreDialog({
  backup,
  onRestore,
  onClose,
}: {
  backup: SiteBackup | null;
  onRestore: (backup: SiteBackup) => Promise<void>;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [typed, setTyped] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const close = () => {
    if (isRestoring) return;
    setTyped('');
    onClose();
  };

  const restore = async () => {
    // Enter в поле слова отправляет форму и тогда, когда слово ещё не набрано
    if (!backup || !isConfirmWord(typed)) return;
    setIsRestoring(true);
    try {
      await onRestore(backup);
      message.success('Сайт восстановлен из копии');
    } catch (error) {
      setIsRestoring(false);
      message.error(error instanceof Error ? error.message : 'Не удалось восстановить сайт');
    }
  };

  return (
    <Modal
      open={backup !== null}
      title="Восстановить сайт из копии"
      width={600}
      onCancel={close}
      closable={!isRestoring}
      mask={{ closable: !isRestoring }}
      keyboard={!isRestoring}
      destroyOnHidden
      afterClose={() => setTyped('')}
      footer={
        <>
          <Button disabled={isRestoring} onClick={close}>
            Отмена
          </Button>
          <Button
            type="primary"
            danger
            loading={isRestoring}
            disabled={!isConfirmWord(typed)}
            onClick={restore}
          >
            Восстановить сайт
          </Button>
        </>
      }
    >
      {backup && (
        <div className="flex flex-col gap-4">
          <Typography.Text type="secondary">
            {siteBackupSummary(backup, BACKUP_KINDS[backup.kind].label)}
          </Typography.Text>

          <Alert
            type="error"
            showIcon
            title="База данных заменится копией целиком"
            description={`Пропадёт всё, что сделано после ${formatDateTime(backup.createdAt)}, во всех разделах. Файлы медиатеки останутся как есть.`}
          />
          <Alert
            type="success"
            showIcon
            title="Сначала сохранится копия текущего состояния — к нему можно будет вернуться."
          />

          <Form layout="vertical" onFinish={restore} disabled={isRestoring}>
            <Form.Item label={`Чтобы подтвердить, введите ${CONFIRM_WORD}`} style={{ marginBottom: 0 }}>
              <Input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
              />
            </Form.Item>
          </Form>

          {isRestoring && (
            <Alert
              type="info"
              showIcon
              title="Восстанавливаю… Когда закончится, панель загрузится заново."
            />
          )}
        </div>
      )}
    </Modal>
  );
}
