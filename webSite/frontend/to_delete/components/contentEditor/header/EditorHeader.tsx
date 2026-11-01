import { useState } from 'react';
import { Button, Segmented, Space, Typography } from 'antd';
import {
  HistoryOutlined,
  PlusOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import type { EditorListSettings, EditorViewMode } from '../../../logic/contentEditor';
import { ListSettingsModal } from '../settings';
import styles from '../contentEditor.module.scss';

/**
 * Шапка раздела: название, переключатель «Записи / Журнал», настройки списка
 * и кнопка добавления.
 */
export default function EditorHeader({
  title,
  addLabel,
  hasJournal,
  canCreate,
  listSettings,
  viewMode,
  onViewMode,
  onCreate,
}: {
  title: string;
  addLabel: string;
  /** Раздел умеет отдавать общий журнал — показываем переключатель */
  hasJournal: boolean;
  /** Раздел не только на просмотр — показываем «Добавить» */
  canCreate: boolean;
  /** Настройки списка; null — раздел их не поддерживает */
  listSettings: EditorListSettings | null;
  viewMode: EditorViewMode;
  onViewMode: (mode: EditorViewMode) => void;
  onCreate: (parentId: string | null) => void;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <div className={styles.head}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        {title}
      </Typography.Title>
      <Space>
        {hasJournal && (
          <Segmented
            value={viewMode}
            onChange={(value) => onViewMode(value as EditorViewMode)}
            options={[
              { label: 'Записи', value: 'list', icon: <UnorderedListOutlined /> },
              { label: 'Журнал изменений', value: 'journal', icon: <HistoryOutlined /> },
            ]}
          />
        )}
        {/* Раздел только на просмотр — настраивать его тоже нечем */}
        {listSettings?.editable && (
          <Button icon={<SettingOutlined />} onClick={() => setIsSettingsOpen(true)}>
            Настройки
          </Button>
        )}
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            // В журнале добавлять нечего: там показаны уже случившиеся изменения
            disabled={viewMode !== 'list'}
            onClick={() => onCreate(null)}
          >
            {addLabel}
          </Button>
        )}
      </Space>

      {listSettings && (
        <ListSettingsModal
          settings={listSettings}
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
