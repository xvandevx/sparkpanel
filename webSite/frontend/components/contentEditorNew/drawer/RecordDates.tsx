import { Form, Typography } from 'antd';
import { formatDateTime } from '../../../logic/dateFormat';
import { useAuthorName } from '../../../logic/users';
import type { EditorRow } from '../table';

/**
 * Когда запись завели, когда правили и кто автор — внизу вкладки «Запись»,
 * только на просмотр. Даты сервер отдаёт у записи любого списка; «Изменено» —
 * с правкой свойств. Автор — у списков, где записи заводят пользователи
 * (`authorId`). Нет дат (новая запись) — ничего не показываем.
 */
export default function RecordDates({ record }: { record: EditorRow }) {
  const author = useAuthorName(record.authorId);
  const created = formatDateTime(record.createdAt);
  const updated = formatDateTime(record.updatedAt);
  if (created === '' && updated === '') return null;

  return (
    <>
      {created !== '' && (
        <Form.Item label="Создано" style={{ marginBottom: 4 }}>
          <Typography.Text type="secondary">{created}</Typography.Text>
        </Form.Item>
      )}
      {updated !== '' && (
        <Form.Item label="Изменено" style={{ marginBottom: author === null ? undefined : 4 }}>
          <Typography.Text type="secondary">{updated}</Typography.Text>
        </Form.Item>
      )}
      {author !== null && (
        <Form.Item label="Автор">
          <Typography.Text type="secondary">{author}</Typography.Text>
        </Form.Item>
      )}
    </>
  );
}
