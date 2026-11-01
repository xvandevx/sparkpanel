import { useEffect, useState } from 'react';
import { App, Form, Input, Modal } from 'antd';
import { newTabNameError, useListSettingsFormState } from '../../../logic/listSettings';

/**
 * Попап новой вкладки: только название. Кода пользователь не вводит — вкладка
 * существует лишь в карточке записи, сайт о ней ничего не знает и читает
 * значения по кодам свойств. Внутренний ключ генерируется из названия сам.
 */
export default function NewTabDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addTab } = useListSettingsFormState();
  const { message } = App.useApp();

  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const confirm = () => {
    const invalid = newTabNameError(name);
    if (invalid) {
      message.warning(invalid);
      return;
    }
    addTab(name);
    onClose();
  };

  return (
    <Modal
      open={open}
      title="Новая вкладка"
      okText="Добавить"
      cancelText="Отмена"
      onOk={confirm}
      onCancel={onClose}
      destroyOnHidden
    >
      {/* Enter обрабатывает только поле: если повесить его ещё и на форму
          (`onFinish`), один Enter добавит сразу две вкладки */}
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
