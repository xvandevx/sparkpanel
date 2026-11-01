import { Button, Modal, Typography } from 'antd';
import { PROPERTY_TYPE_LABELS, useListSettingsFormState } from '../../../logic/listSettings';
import PropertyConfig from './PropertyConfig';

/**
 * Параметры одного свойства отдельным окном: варианты списка, форматы и вес
 * файла, размер таблицы. В таблице свойств их нет намеренно — строка иначе
 * разъезжается, а настраивают их редко и по одному свойству за раз.
 *
 * Своего «Сохранить» у окна нет: правки сразу ложатся в черновик свойства и
 * уходят в базу общей кнопкой окна настроек.
 */
export default function PropertyConfigDialog({
  uid,
  onClose,
}: {
  /** Какое свойство настраивается; null — окно закрыто */
  uid: string | null;
  onClose: () => void;
}) {
  const { properties } = useListSettingsFormState();
  const property = uid ? properties.find((item) => item.uid === uid) ?? null : null;

  return (
    <Modal
      open={property !== null}
      onCancel={onClose}
      title={property ? `Параметры свойства «${property.name.trim() || 'без названия'}»` : ''}
      width={560}
      destroyOnHidden
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Готово
        </Button>,
      ]}
    >
      {property && (
        <>
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            Тип свойства — «{PROPERTY_TYPE_LABELS[property.type]}». Параметры применяются к полю
            в карточке записи.
          </Typography.Paragraph>
          <PropertyConfig uid={property.uid} />
        </>
      )}
    </Modal>
  );
}
