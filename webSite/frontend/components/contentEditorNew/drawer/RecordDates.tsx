import { Form, Typography } from 'antd';
import { formatDateTime } from '../../../logic/dateFormat';
import { useAuthorName } from '../../../logic/users';
import type { EditorRow } from '../table';
import { useExternalId } from './useRecord';

/**
 * Когда запись завели, когда правили и кто автор — внизу вкладки «Запись»,
 * только на просмотр. Даты сервер отдаёт у записи любого списка; «Изменено» —
 * с правкой свойств. Автор — у списков, где записи заводят пользователи
 * (`authorId`). Внешний ID — номер записи в системе-источнике: задаёт его
 * только интеграция, поэтому здесь он виден, если заполнен, и не правится.
 * Нет дат (новая запись) — ничего не показываем.
 */
export default function RecordDates({ listKey, record }: { listKey: string; record: EditorRow }) {
  const author = useAuthorName(record.authorId);
  const created = formatDateTime(record.createdAt);
  const updated = formatDateTime(record.updatedAt);
  const externalId = useExternalId(listKey, record.id);
  if (created === '' && updated === '') return null;

  return (
    <>
      {externalId !== '' && (
        <Form.Item label="Внешний ID" style={{ marginBottom: 4 }}>
          <Typography.Text type="secondary" copyable>
            {externalId}
          </Typography.Text>
        </Form.Item>
      )}
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
