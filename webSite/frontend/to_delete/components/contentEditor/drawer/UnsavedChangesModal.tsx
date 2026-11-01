import { Modal } from 'antd';

/**
 * Подтверждение при уходе с несохранёнными правками. Показывается на любое
 * переключение — закрытие шторки, выбор другой записи, добавление новой.
 */
export default function UnsavedChangesModal({
  open,
  onDiscard,
  onKeep,
}: {
  open: boolean;
  /** Закрыть без сохранения — отложенное переключение выполнится */
  onDiscard: () => void;
  /** Вернуться к правке — переключение отменяется */
  onKeep: () => void;
}) {
  return (
    <Modal
      open={open}
      title="Изменения не сохранены"
      okText="Закрыть без сохранения"
      cancelText="Вернуться к правке"
      okButtonProps={{ danger: true }}
      onOk={onDiscard}
      onCancel={onKeep}
    >
      Правки в форме не сохранены. Если закрыть, они пропадут.
    </Modal>
  );
}
