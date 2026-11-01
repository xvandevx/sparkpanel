import { useState } from 'react';
import { Alert, App, Button, Drawer, Space, Tabs, Typography } from 'antd';
import {
  HISTORY_TAB_KEY,
  type EditorHistorySource,
  type EditorTabDef,
} from '../../../logic/contentEditor';
import { FieldGroup } from '../../editorForm';
import { HistoryTab } from '../history';
import styles from '../contentEditor.module.scss';

/**
 * Шторка редактирования: вкладки с полями, история и кнопки сохранения.
 * Открывается на 70% ширины экрана — слева остаётся видна таблица раздела.
 *
 * Поля внутри вкладок рисует общий слой формы: он берёт значения из своего
 * контекста (`EditorFormProvider`), поэтому сюда они пропсами не идут.
 */
export default function ContentEditorDrawer({
  open,
  title,
  isCreating,
  isChanged,
  isSaving,
  isReadOnly,
  tabs,
  warnings,
  history,
  onClose,
  onReset,
  onSubmit,
}: {
  open: boolean;
  title: string;
  /** Новая запись: сохранять можно и без правок */
  isCreating: boolean;
  isChanged: boolean;
  isSaving: boolean;
  /** Только на просмотр — кнопок сохранения нет */
  isReadOnly?: boolean;
  tabs: EditorTabDef[];
  /** Предупреждения, которые сохранять не мешают (незнакомые переменные) */
  warnings: string[];
  /** Чью историю показывает вкладка «История» */
  history: EditorHistorySource;
  onClose: () => void;
  onReset: () => void;
  /** Сохранение; возвращает текст ошибки или null */
  onSubmit: () => Promise<string | null>;
}) {
  const { message } = App.useApp();
  const [tabKey, setTabKey] = useState<string>('');

  // Набор вкладок зависит от данных (история появляется у сохранённой записи),
  // поэтому активную сверяем со списком, а не держим вслепую.
  const activeKey = tabs.some((tab) => tab.key === tabKey) ? tabKey : tabs[0]?.key ?? '';

  const handleSave = async () => {
    const error = await onSubmit();
    if (error) message.error(error);
    else message.success(isCreating ? 'Запись создана' : 'Изменения сохранены');
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      // 70% ширины экрана: слева остаётся видна таблица раздела
      size="70%"
      maskClosable={!isChanged}
      title={
        <div className={styles.drawerHead}>
          <Typography.Text strong>{title}</Typography.Text>
          {/* Только на просмотр — сохранять нечем: кнопки не показываем вовсе */}
          {!isReadOnly && (
            <Space>
              <Button onClick={onReset} disabled={!isChanged && !isCreating}>
                Отменить
              </Button>
              <Button
                type="primary"
                loading={isSaving}
                disabled={!isChanged && !isCreating}
                onClick={handleSave}
              >
                Сохранить
              </Button>
            </Space>
          )}
        </div>
      }
    >
      <div className={styles.form}>
        {isChanged && (
          <Alert type="warning" showIcon message="Данные изменены — не забудьте сохранить" />
        )}
        {warnings.map((warning) => (
          <Alert key={warning} type="info" showIcon message={warning} />
        ))}
        <Tabs
          activeKey={activeKey}
          onChange={setTabKey}
          items={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            children:
              tab.key === HISTORY_TAB_KEY ? (
                <HistoryTab history={history} />
              ) : (
                <>
                  {tab.groups.map((group) => (
                    <FieldGroup key={group.key} groupKey={group.key} />
                  ))}
                </>
              ),
          }))}
        />
      </div>
    </Drawer>
  );
}
