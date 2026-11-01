import { Spin, Typography } from 'antd';
import type { EditorLink } from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';

/**
 * Поле-список ссылок: значения у него нет, ссылки приходят из описания поля.
 * Открываются в новой вкладке — несохранённые правки в форме не теряются.
 */
export default function FieldLinks({
  links,
  emptyText,
}: {
  /** undefined — список ещё загружается */
  links: EditorLink[] | undefined;
  emptyText?: string;
}) {
  if (!links) return <Spin size="small" />;

  if (!links.length) {
    return <Typography.Text type="secondary">{emptyText ?? '—'}</Typography.Text>;
  }

  return (
    <ul className={styles.links}>
      {links.map((link) => (
        <li key={link.key}>
          <a href={link.href} target="_blank" rel="noreferrer">
            {link.label}
          </a>
          {link.note && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {link.note}
            </Typography.Text>
          )}
        </li>
      ))}
    </ul>
  );
}
