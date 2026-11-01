import { useEffect, useState } from 'react';
import { App, Form, Input, Modal } from 'antd';

/**
 * Название вкладки карточки записи — попапом: и у новой вкладки, и при
 * переименовании. Кода пользователь не вводит и не видит: вкладка существует
 * только в карточке записи, сайт о ней ничего не знает и читает значения по
 * кодам свойств. Код генерируется из названия один раз, при создании.
 */
export default function TabNameDialog({
  open,
  title,
  okText,
  name: initialName,
  onSubmit,
  onClose,
}: {
  open: boolean;
  title: string;
  okText: string;
  /** Название, с которым попап открывается: у новой вкладки пустое */
  name: string;
  onSubmit: (name: string) => void;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(initialName);
  }, [initialName, open]);

  const confirm = () => {
    if (!name.trim()) {
      message.warning('Введите название вкладки');
      return;
    }
    onSubmit(name.trim());
    onClose();
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={okText}
      cancelText="Отмена"
      onOk={confirm}
      onCancel={onClose}
      destroyOnHidden
    >
      {/* Enter обрабатывает только поле: если повесить его ещё и на форму
          (`onFinish`), один Enter сработает дважды */}
      <Form layout="vertical">
        <Form.Item
          label="Название вкладки"
          required
          help="Так она будет называться в карточке записи"
        >
          <Input
            autoFocus
            value={name}
            placeholder="Доставка"
            onChange={(event) => setName(event.target.value)}
            onPressEnter={confirm}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
