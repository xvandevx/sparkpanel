import { useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import { App, Button, Segmented, Space, Spin, Splitter, Typography, theme } from 'antd';
import {
  AlignLeftOutlined,
  CodeOutlined,
  EyeOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  SplitCellsOutlined,
} from '@ant-design/icons';
import { formatHtml } from '../../../../logic/htmlFormat';
import type { EditorField } from '../record';
import { unsupportedMarkup } from './htmlMarkup';
import HtmlFullscreen from './HtmlFullscreen';
import HtmlPreview from './HtmlPreview';
import styles from './HtmlVisual.module.css';

// Оба редактора работают только в браузере: на сервере Next их не выполнить
const loading = () => <Spin size="small" />;
const HtmlVisual = dynamic(() => import('./HtmlVisual'), { ssr: false, loading });
const HtmlCode = dynamic(() => import('./HtmlCode'), { ssr: false, loading });

/** «Рядом» — код и результат бок о бок, есть только на весь экран; в карточке это «HTML». */
type Mode = 'visual' | 'code' | 'split';

const MODES = [
  { value: 'visual', label: 'Визуально', icon: <EyeOutlined /> },
  { value: 'code', label: 'HTML', icon: <CodeOutlined /> },
];
const FULLSCREEN_MODES = [...MODES, { value: 'split', label: 'Рядом', icon: <SplitCellsOutlined /> }];

/**
 * Поле «HTML»: режимы над одним значением. «Визуально» — правят как текст
 * (TipTap), с кнопками и вставкой изображений; «HTML» — разметку как есть
 * (CodeMirror), с кнопкой «Отформатировать». Значение во всех — строка HTML,
 * хранение на сервере не меняется.
 *
 * Кнопка справа открывает то же поле на весь экран; там есть ещё режим «Рядом»:
 * код и результат бок о бок. Режим общий — свернули окно в «Рядом», в карточке «HTML».
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
  const { modal, message } = App.useApp();
  const { token } = theme.useToken();
  const html = String(value ?? '');
  const [mode, setMode] = useState<Mode>(() =>
    typeof window !== 'undefined' && unsupportedMarkup(html).length > 0 ? 'code' : 'visual',
  );
  const [isFullscreen, setFullscreen] = useState(false);

  const switchTo = (next: Mode) => {
    if (next !== 'visual') {
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

  const format = () => {
    if (html.trim() === '') return;
    const result = formatHtml(html);
    if (!result.isOk) {
      message.warning(`${result.error} — разметка оставлена как есть`);
      return;
    }
    if (result.html !== html) onChange(result.html);
    message.success('HTML отформатирован');
  };

  // Рамка одна на все режимы; цвета — токены темы antd, как у остальных полей
  const frameStyle = {
    '--html-border': token.colorBorder,
    '--html-radius': `${token.borderRadius}px`,
    '--html-muted': token.colorFillQuaternary,
    '--html-active': token.colorPrimary,
  } as CSSProperties;

  const modeSwitch = (
    <Segmented
      size={isFullscreen ? 'middle' : 'small'}
      value={isFullscreen || mode !== 'split' ? mode : 'code'}
      options={isFullscreen ? FULLSCREEN_MODES : MODES}
      onChange={(next) => switchTo(next as Mode)}
    />
  );

  // Подсказки — обычным `title`, не `Tooltip`: всплывашка antd, раз показавшись,
  // остаётся верхней в очереди Esc, и окно «на весь экран» по Esc больше не закрывается
  const formatButton = mode !== 'visual' && !isLocked && (
    <Button
      size={isFullscreen ? 'middle' : 'small'}
      icon={<AlignLeftOutlined />}
      title="Shift + Alt + F"
      onClick={format}
    >
      {isFullscreen ? 'Отформатировать HTML' : 'Отформатировать'}
    </Button>
  );

  const editor = () => {
    if (mode === 'visual') {
      return <HtmlVisual field={field} value={html} isLocked={isLocked} onChange={onChange} />;
    }
    const code = (
      <HtmlCode value={html} isLocked={isLocked} isFullHeight={isFullscreen} onChange={onChange} onFormat={format} />
    );
    if (!isFullscreen || mode === 'code') return code;
    return (
      <Splitter>
        <Splitter.Panel min="25%">{code}</Splitter.Panel>
        <Splitter.Panel min="25%">
          <HtmlPreview html={html} />
        </Splitter.Panel>
      </Splitter>
    );
  };

  return (
    <Space orientation="vertical" size={6} style={{ display: 'flex' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {!isFullscreen && modeSwitch}
        <Space size={6} style={{ marginLeft: 'auto' }}>
          {!isFullscreen && formatButton}
          <Button
            size="small"
            icon={<FullscreenOutlined />}
            title="На весь экран"
            aria-label="На весь экран"
            onClick={() => setFullscreen(true)}
          />
        </Space>
      </div>
      {isFullscreen ? (
        // Редактор один: пока открыто окно, в карточке его нет
        <Typography.Text type="secondary">Открыто на весь экран</Typography.Text>
      ) : (
        <div className={styles.frame} style={frameStyle}>
          {editor()}
        </div>
      )}
      {isFullscreen && (
        <HtmlFullscreen
          title={field.name}
          onClose={() => setFullscreen(false)}
          header={
            <>
              {modeSwitch}
              <Space size={12} style={{ marginLeft: 'auto' }}>
                {formatButton}
                <Button icon={<FullscreenExitOutlined />} onClick={() => setFullscreen(false)}>
                  Свернуть
                </Button>
              </Space>
            </>
          }
        >
          <div className={`${styles.frame} ${styles.full}`} style={frameStyle}>
            {editor()}
          </div>
        </HtmlFullscreen>
      )}
    </Space>
  );
}
