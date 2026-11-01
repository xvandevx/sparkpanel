import { useEffect, useState } from 'react';
import { Modal, Select, Typography } from 'antd';
import { useListSettingsFormState } from '../../../logic/listSettings';

/**
 * Привязка свойства к вкладке карточки записи. Отдельным окном, а не колонкой
 * в таблице: меняют её редко, а колонка занимала место у каждой строки.
 */
export default function TabBindingDialog({
  uid,
  onClose,
}: {
  /** Какое свойство перепривязывают; null — окно закрыто */
  uid: string | null;
  onClose: () => void;
}) {
  const { properties, tabChoices, updateProperty } = useListSettingsFormState();
  const property = uid ? properties.find((item) => item.uid === uid) ?? null : null;

  const [tab, setTab] = useState('');

  useEffect(() => {
    if (property) setTab(property.tab);
  }, [property]);

  const confirm = () => {
    if (property) updateProperty(property.uid, { tab });
    onClose();
  };

  return (
    <Modal
      open={property !== null}
      title={property ? `Привязка свойства «${property.name.trim() || 'без названия'}»` : ''}
      okText="Перенести"
      cancelText="Отмена"
      onOk={confirm}
      onCancel={onClose}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        На какой вкладке карточки записи показывать это свойство.
      </Typography.Paragraph>
      <Select
        value={tab}
        style={{ width: '100%' }}
        options={tabChoices}
        onChange={(next: string) => setTab(next)}
      />
    </Modal>
  );
}
