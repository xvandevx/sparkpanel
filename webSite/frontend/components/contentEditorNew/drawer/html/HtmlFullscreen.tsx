import type { ReactNode } from 'react';
import { Modal, Typography } from 'antd';

/**
 * Окно «на весь экран» для поля «HTML»: почти весь экран (отступ 24 px),
 * в шапке — название поля и то, что поле кладёт рядом (режимы, кнопки),
 * под ней — редактор на всю высоту. Своего сохранения у окна нет: правки
 * сразу попадают в поле карточки, сохраняет карточка. Esc — свернуть.
 */
export default function HtmlFullscreen({
  title,
  header,
  onClose,
  children,
}: {
  title: string;
  header: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      open
      onCancel={onClose}
      closable={false}
      width="calc(100vw - 48px)"
      style={{ top: 24, paddingBottom: 0, maxWidth: 'none' }}
      styles={{
        container: { height: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column' },
        body: { flex: 1, minHeight: 0 },
        footer: { textAlign: 'left' },
      }}
      title={
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px 24px' }}>
          <span>{title}</span>
          {header}
        </div>
      }
      footer={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Правки сразу попадают в карточку записи, сохраняет их карточка. Esc — свернуть.
        </Typography.Text>
      }
    >
      {children}
    </Modal>
  );
}
