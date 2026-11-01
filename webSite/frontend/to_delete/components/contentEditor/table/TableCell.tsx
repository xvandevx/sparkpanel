import { Image, Space, Tag, Typography } from 'antd';
import { FileOutlined } from '@ant-design/icons';
import {
  EditorColumnVariant,
  type EditorColumnDef,
  type EditorRow,
} from '../../../logic/contentEditor';
import styles from '../contentEditor.module.scss';

/**
 * Ячейка таблицы по описанию колонки. Разметка живёт здесь: logic-слой
 * описывает колонку данными (`variant`, `value`, `hint`) и JSX не возвращает.
 */
export default function TableCell({
  column,
  record,
}: {
  column: EditorColumnDef;
  record: EditorRow;
}) {
  const value = record[column.dataIndex ?? column.key];
  const text = column.value ? column.value(record) : String(value ?? '');
  const hint = column.hint?.(record);

  if (column.variant === EditorColumnVariant.Flag) {
    const isOn = value !== false;
    return <Tag color={isOn ? 'green' : 'default'}>{isOn ? 'Да' : 'Нет'}</Tag>;
  }

  if (column.variant === EditorColumnVariant.Image) {
    // Значение пустое или это не картинка — показываем значок файла:
    // ломаная картинка в таблице выглядит как ошибка, хотя её и нет.
    if (!text) return <span className={styles.previewEmpty}><FileOutlined /></span>;

    return (
      <Image
        src={text}
        alt={hint ?? ''}
        width={64}
        height={48}
        className={styles.preview}
        // Клик по превью открывает картинку, а не строку записи
        rootClassName={styles.previewRoot}
        preview={{ mask: null }}
      />
    );
  }

  if (column.variant === EditorColumnVariant.Tag) {
    return <Tag color={column.color?.(record)}>{text}</Tag>;
  }

  const body =
    column.variant === EditorColumnVariant.Code ? (
      <span className={styles.mono}>{text}</span>
    ) : (
      <Typography.Text>{text}</Typography.Text>
    );

  if (!hint) return body;

  return (
    <Space orientation="vertical" size={0}>
      {body}
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        {hint}
      </Typography.Text>
    </Space>
  );
}
