import { useEffect, useState } from 'react';
import { Alert, App, Button, Checkbox, Col, Form, Modal, Radio, Row, Space, Spin, Statistic, Typography } from 'antd';
import type {
  EditorBackup,
  EditorBackupCheck,
} from '../../../redux/action-creaters/contentEditorNew';
import { FORM_LAYOUT } from '../ui';
import type { EditorListApi } from '../useLoadEditor';
import { backupDescription, backupTitle, restoreWarnings } from './backupFormat';
import { useRestoreActions } from './useBackups';

type Mode = 'replace' | 'missing';

/**
 * Окно «Восстановить из копии»: сначала сервер говорит, что изменится,
 * потом выбирают, что вернуть и как. Настройки списка возвращаются только
 * заменой: «вернуть недостающее» про записи, а не про свойства.
 */
export default function RestoreDialog({
  listKey,
  api,
  backup,
  onClose,
}: {
  listKey: string;
  api: EditorListApi;
  /** Какую копию вернуть; null — окно закрыто */
  backup: EditorBackup | null;
  /** `isRestored` — список вернули: копий стало на одну больше */
  onClose: (isRestored: boolean) => void;
}) {
  const { message } = App.useApp();
  const { check: loadCheck, restore } = useRestoreActions(listKey, api);
  const [check, setCheck] = useState<EditorBackupCheck | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('replace');
  const [isRecords, setIsRecords] = useState(true);
  const [isSettings, setIsSettings] = useState(true);
  const [isRunning, setIsRunning] = useState(false);

  // Каждое открытие — с начала: прошлый выбор был о другой копии
  useEffect(() => {
    if (!backup) return;
    setCheck(null);
    setCheckError(null);
    setMode('replace');
    setIsRecords(true);
    setIsSettings(true);
    loadCheck(backup.id)
      .then(setCheck)
      .catch((error: unknown) =>
        setCheckError(error instanceof Error ? error.message : 'Не удалось проверить копию'),
      );
  }, [backup, loadCheck]);

  const isReplace = mode === 'replace';
  const isSettingsTaken = isSettings && isReplace;
  const isChosen = isRecords || isSettingsTaken;
  const warnings = check ? restoreWarnings(check, { isReplace, isRecords, isSettings: isSettingsTaken }) : [];

  const submit = async () => {
    if (!backup) return;
    setIsRunning(true);
    try {
      await restore(backup.id, { mode, isRecords, isSettings: isSettingsTaken });
      message.success('Список восстановлен из копии');
      onClose(true);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Не удалось восстановить список');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Modal
      open={backup !== null}
      title="Восстановить из копии"
      width={600}
      onCancel={() => onClose(false)}
      destroyOnHidden
      footer={
        <Space>
          <Button onClick={() => onClose(false)}>Отмена</Button>
          <Button
            type="primary"
            danger
            loading={isRunning}
            disabled={!check || !isChosen}
            onClick={submit}
          >
            Восстановить
          </Button>
        </Space>
      }
    >
      {backup && (
        <div className="flex flex-col gap-6">
          <Typography.Text type="secondary">
            {backupTitle(backup)} · {backupDescription(backup)}
          </Typography.Text>

          {checkError && <Alert type="error" showIcon title={checkError} />}
          {!check && !checkError && (
            <div className="flex justify-center py-6">
              <Spin />
            </div>
          )}

          {check && (
            <>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="Записи"
                    value={`${check.records.current} → ${check.records.copy}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="Свойства"
                    value={`${check.properties.current} → ${check.properties.copy}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={isReplace ? 'Изменятся записи' : 'Вернутся записи'}
                    value={isReplace ? check.changedRecords : check.returnedRecords}
                  />
                </Col>
              </Row>

              <Form {...FORM_LAYOUT} component="div">
                <Form.Item label="Как">
                  <Radio.Group
                    value={mode}
                    onChange={(event) => setMode(event.target.value as Mode)}
                    className="flex flex-col gap-2"
                    options={[
                      { value: 'replace', label: 'Заменить список целиком' },
                      { value: 'missing', label: 'Только вернуть удалённые записи' },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="Что вернуть" className="mb-0">
                  <div className="flex flex-col gap-2">
                    <Checkbox checked={isRecords} onChange={(event) => setIsRecords(event.target.checked)}>
                      Записи и значения свойств
                    </Checkbox>
                    <Checkbox
                      checked={isSettingsTaken}
                      disabled={!isReplace}
                      onChange={(event) => setIsSettings(event.target.checked)}
                    >
                      Настройки списка — свойства, вкладки, поля фильтра
                    </Checkbox>
                  </div>
                </Form.Item>
              </Form>

              {warnings.length > 0 && (
                <Alert
                  type="warning"
                  showIcon
                  title="Проверка копии нашла"
                  description={
                    <div className="flex flex-col gap-1">
                      {warnings.map((text) => (
                        <span key={text}>{text}</span>
                      ))}
                    </div>
                  }
                />
              )}

              <Alert
                type="success"
                showIcon
                title="Текущее состояние сохранится копией — восстановление можно отменить."
              />
            </>
          )}
        </div>
      )}
    </Modal>
  );
}
