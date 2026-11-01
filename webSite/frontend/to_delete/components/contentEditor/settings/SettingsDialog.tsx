import { Alert, App, Button, Modal, Typography } from 'antd';
import { useListSettingsFormState } from '../../../logic/listSettings';
import { EditorForm } from '../../editorForm';
import styles from '../contentEditor.module.scss';
import PropertyTabs from './PropertyTabs';

/**
 * Само окно: имя и код общей формой, ниже таблица свойств. Закрытие с
 * несохранёнными правками сначала спрашивает — их тут бывает немало.
 */
export default function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isChanged, isSaving, warning, submit } = useListSettingsFormState();
  const { message, modal } = App.useApp();

  const close = () => {
    if (!isChanged) {
      onClose();
      return;
    }
    modal.confirm({
      title: 'Закрыть без сохранения?',
      content: 'Изменения в настройках списка пропадут.',
      okText: 'Закрыть',
      cancelText: 'Продолжить правку',
      onOk: onClose,
    });
  };

  const handleSave = async () => {
    const error = await submit();
    if (error) {
      message.error(error);
      return;
    }
    message.success('Настройки списка сохранены');
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={close}
      title="Настройки списка"
      width={1240}
      mask={{ closable: !isChanged }}
      destroyOnHidden
      footer={[
        <Button key="cancel" onClick={close}>
          Отмена
        </Button>,
        <Button key="save" type="primary" loading={isSaving} onClick={handleSave}>
          Сохранить
        </Button>,
      ]}
    >
      <div className={styles.settings}>
        <EditorForm />

        <Typography.Title level={5} className={styles.sectionTitle}>
          Свойства записей
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Вкладки здесь — это вкладки карточки записи: «+» заводит новую, переключение
          показывает её свойства. Порядок свойств здесь — порядок полей в карточке.
          Параметры типа (варианты списка, форматы файла, столбцы таблицы, список для
          привязки) и перенос свойства на другую вкладку — в меню его строки.
        </Typography.Text>

        <PropertyTabs />

        {warning && <Alert type="warning" showIcon title={warning} />}
      </div>
    </Modal>
  );
}
