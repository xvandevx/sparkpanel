import { App, Button, Popconfirm, Space, Tooltip } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  LoginOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  EditorRowActionIcon,
  type EditorRow,
  type EditorRowActionDef,
} from '../../../logic/contentEditor';

/**
 * Что можно сделать со строкой. Собирается один раз в `ContentEditor` из
 * контроллера раздела и передаётся таблице — отдельными пропсами это была бы
 * россыпь из девяти штук на каждую строку.
 */
export interface EditorRowActions {
  /** Раздел со своей вложенностью: в строке есть «добавить внутрь» */
  isNested?: boolean;
  /** При удалении вложенные поднимаются на уровень выше, а не удаляются */
  isRemoveKeepingChildren?: boolean;
  /** Переход внутрь записи (уровни «Инфоблоков», «Файлов») */
  rowAction?: EditorRowActionDef;
  /** Текст ошибки последней операции — его показывает сообщение об удалении */
  error: string | null;
  remove?: (record: EditorRow) => Promise<boolean>;
  canRemove?: (record: EditorRow) => boolean;
  onOpen: (id: string) => void;
  onCreateChild: (parentId: string) => void;
  onRowAction: (record: EditorRow) => void;
}

/** Иконки дополнительных действий: logic отдаёт имя, разметку выбираем здесь. */
const ROW_ACTION_ICONS = {
  [EditorRowActionIcon.Enter]: <LoginOutlined />,
  [EditorRowActionIcon.Open]: <ExportOutlined />,
};

/** Кнопки строки таблицы: перейти внутрь, открыть, добавить внутрь, удалить. */
export default function RowActions({
  record,
  selectedId,
  actions,
}: {
  record: EditorRow;
  /** Открытая запись: её кнопка «Редактировать» подсвечена */
  selectedId: string | null;
  actions: EditorRowActions;
}) {
  const { message } = App.useApp();

  const rowAction: EditorRowActionDef | null =
    actions.rowAction && (actions.rowAction.visible?.(record) ?? true)
      ? actions.rowAction
      : null;

  const remove = async () => {
    if (!actions.remove) return;
    const ok = await actions.remove(record);
    message[ok ? 'success' : 'error'](
      ok ? 'Запись удалена' : actions.error ?? 'Не удалось удалить',
    );
  };

  return (
    // Клик по кнопкам не должен открывать строку — обработчик строки выше
    <Space onClick={(event) => event.stopPropagation()}>
      {rowAction && (
        <Tooltip title={rowAction.title(record)}>
          <Button
            size="middle"
            type="default"
            icon={ROW_ACTION_ICONS[rowAction.icon]}
            onClick={() => actions.onRowAction(record)}
          />
        </Tooltip>
      )}

      <Tooltip title="Редактировать">
        <Button
          size="middle"
          type={selectedId === record.id ? 'primary' : 'default'}
          icon={<EditOutlined />}
          onClick={() => actions.onOpen(record.id)}
        />
      </Tooltip>

      {actions.isNested && (
        <Tooltip title="Добавить внутрь">
          <Button
            size="middle"
            icon={<PlusOutlined />}
            onClick={() => actions.onCreateChild(record.id)}
          />
        </Tooltip>
      )}

      {actions.remove && (actions.canRemove?.(record) ?? true) && (
        <Popconfirm
          title="Удалить запись?"
          // В плоском разделе удалять «всё, что внутри» нечего — не пугаем зря
          description={
            !actions.isNested
              ? 'Отменить нельзя.'
              : actions.isRemoveKeepingChildren
                ? 'Вложенные записи поднимутся на уровень выше. Отменить нельзя.'
                : 'Вместе с ней удалится всё, что внутри. Отменить нельзя.'
          }
          okText="Удалить"
          cancelText="Отмена"
          placement="left"
          okButtonProps={{ danger: true }}
          onConfirm={remove}
        >
          <Tooltip title="Удалить">
            <Button size="middle" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Popconfirm>
      )}
    </Space>
  );
}
