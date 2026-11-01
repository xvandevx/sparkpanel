import { useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { App, Segmented, Space, Spin, theme } from 'antd';
import { CodeOutlined, EyeOutlined } from '@ant-design/icons';
import type { EditorField } from '../record';
import { unsupportedMarkup } from './htmlMarkup';
import styles from './HtmlVisual.module.css';

// Оба редактора работают только в браузере: на сервере Next их не выполнить
const loading = () => <Spin size="small" />;
const HtmlVisual = dynamic(() => import('./HtmlVisual'), { ssr: false, loading });
const HtmlCode = dynamic(() => import('./HtmlCode'), { ssr: false, loading });

type Mode = 'visual' | 'code';

/**
 * Поле «HTML»: два режима над одним значением. «Визуально» — правят как текст
 * (TipTap), с кнопками и вставкой изображений; «HTML» — разметку как есть
 * (CodeMirror). Значение в обоих — строка HTML, хранение на сервере не меняется.
 *
 * Визуальный режим держит разметку по своей схеме и чужое при правке выбросит.
 * Поэтому значение с такой разметкой открывается в режиме «HTML», а перейти
 * из него в визуальный можно только после предупреждения — с перечнем того,
 * что пропадёт.
 */
export default function HtmlField({
  field,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  isLocked: boolean;
  onChange: (value: unknown) => void;
}) {
  const { modal } = App.useApp();
  const { token } = theme.useToken();
  const html = String(value ?? '');
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined' && unsupportedMarkup(html).length > 0 ? 'code' : 'visual',
  );

  const switchTo = (next: Mode) => {
    if (next === 'code') {
      setMode(next);
      return;
    }
    const lost = unsupportedMarkup(html);
    if (lost.length === 0) {
      setMode(next);
      return;
    }
    modal.confirm({
      title: 'Часть разметки визуальный режим не сохранит',
      content: `При первой правке пропадёт: ${lost.join(', ')}. Если они нужны, правьте в режиме «HTML».`,
      okText: 'Всё равно перейти',
      cancelText: 'Остаться в HTML',
      onOk: () => setMode(next),
    });
  };

  return (
    <Space orientation="vertical" size={6} style={{ display: 'flex' }}>
      <Segmented
        size="small"
        value={mode}
        options={[
          { value: 'visual', label: 'Визуально', icon: <EyeOutlined /> },
          { value: 'code', label: 'HTML', icon: <CodeOutlined /> },
        ]}
        onChange={(next) => switchTo(next as Mode)}
      />
      {/* Рамка одна на оба режима; цвета — токены темы antd, как у остальных полей */}
      <div
        className={styles.frame}
        style={
          {
            '--html-border': token.colorBorder,
            '--html-radius': `${token.borderRadius}px`,
            '--html-muted': token.colorFillQuaternary,
            '--html-active': token.colorPrimary,
          } as CSSProperties
        }
      >
        {mode === 'visual' ? (
          <HtmlVisual field={field} value={html} isLocked={isLocked} onChange={onChange} />
        ) : (
          <HtmlCode value={html} isLocked={isLocked} onChange={onChange} />
        )}
      </div>
    </Space>
  );
}
