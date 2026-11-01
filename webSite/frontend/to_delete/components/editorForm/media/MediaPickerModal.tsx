import { useEffect, useState } from 'react';
import { App, Button, Modal, Tabs } from 'antd';
import { CloudUploadOutlined, PictureOutlined } from '@ant-design/icons';
import type { EditorMediaRules } from '../../../logic/editorForm';
import {
  useMediaLibrary,
  useMediaLibraryActions,
  type MediaItem,
} from '../../../logic/mediaLibrary';
import MediaLibraryList from './MediaLibraryList';
import MediaUpload from './MediaUpload';

/**
 * Окно выбора файла: вкладка медиатеки и вкладка загрузки с диска.
 * Загруженный файл ложится в медиатеку и сразу выбирается.
 *
 * Пропсы — только состояние окна (открыто, множественный выбор, ограничения поля)
 * и куда отдать выбор: данные медиатеки части окна берут из logic-хука сами.
 */
export default function MediaPickerModal({
  open,
  multiple,
  rules,
  onPick,
  onClose,
}: {
  open: boolean;
  multiple: boolean;
  rules?: EditorMediaRules;
  onPick: (ids: number[]) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('library');
  /** Отмеченные файлы — для множественного выбора; одиночный выбирается кликом */
  const [checked, setChecked] = useState<number[]>([]);
  /** Идёт проверка разрешения картинки — второй клик ждёт */
  const [checking, setChecking] = useState(false);
  const { refresh } = useMediaLibraryActions();
  const { checkPick } = useMediaLibrary();
  const { message } = App.useApp();

  // Каждое открытие — с чистого листа: вчерашние отметки не нужны, а медиатеку
  // перечитываем — файлы могли загрузить в разделе «Файлы» уже после первой загрузки
  useEffect(() => {
    if (!open) return;
    setChecked([]);
    refresh();
  }, [open, refresh]);

  const toggle = async (item: MediaItem) => {
    if (multiple && checked.includes(item.id)) {
      setChecked((list) => list.filter((id) => id !== item.id));
      return;
    }

    // Разрешение видно, только загрузив картинку, — проверяем перед выбором
    setChecking(true);
    const invalid = await checkPick(item, rules);
    setChecking(false);
    if (invalid) {
      message.error(invalid);
      return;
    }

    if (multiple) setChecked((list) => [...list, item.id]);
    else onPick([item.id]);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Выбор файла"
      width={760}
      destroyOnHidden
      footer={
        tab === 'library' && multiple
          ? [
              <Button key="cancel" onClick={onClose}>
                Отмена
              </Button>,
              <Button
                key="pick"
                type="primary"
                disabled={checked.length === 0}
                onClick={() => onPick(checked)}
              >
                {checked.length ? `Выбрать (${checked.length})` : 'Выбрать'}
              </Button>,
            ]
          : null
      }
    >
      <Tabs
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'library',
            label: 'Медиатека',
            icon: <PictureOutlined />,
            children: (
              <MediaLibraryList
                multiple={multiple}
                rules={rules}
                checked={checked}
                busy={checking}
                onToggle={toggle}
              />
            ),
          },
          {
            key: 'upload',
            label: 'Загрузить с диска',
            icon: <CloudUploadOutlined />,
            children: <MediaUpload rules={rules} onUploaded={(id) => onPick([id])} />,
          },
        ]}
      />
    </Modal>
  );
}
