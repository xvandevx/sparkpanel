import { useState } from 'react';
import dynamic from 'next/dynamic';
import { App, Button, Space, Spin, Typography, theme } from 'antd';
import { AlignLeftOutlined, FullscreenExitOutlined, FullscreenOutlined } from '@ant-design/icons';
import FieldFullscreen from '../FieldFullscreen';
import type { EditorField } from '../record';
import type { CodeLanguage } from './CodeEditor';
import { formatJson, jsonError } from './jsonText';

// CodeMirror работает только в браузере: на сервере Next его не выполнить
const CodeEditor = dynamic(() => import('./CodeEditor'), { ssr: false, loading: () => <Spin size="small" /> });

/**
 * Поля «JavaScript» и «JSON» — тот же редактор CodeMirror, что у режима «HTML».
 * JavaScript хранится как набрали, с подсветкой JavaScript.
 * «JSON» проверяется на ходу — ошибка с номером строки под полем, — и его
 * можно разложить по строкам («Отформатировать», Shift+Alt+F); при сохранении
 * сервер раскладывает его сам. Оба можно открыть на весь экран.
 */
export default function CodeField({
  field,
  language,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  language: CodeLanguage;
  value: unknown;
  isLocked: boolean;
  onChange: (value: unknown) => void;
}) {
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const text = String(value ?? '');
  const [isFullscreen, setFullscreen] = useState(false);
  const isJson = language === 'json';
  const error = isJson ? jsonError(text) : null;

  const format = () => {
    if (text.trim() === '') return;
    const result = formatJson(text);
    if (result === null) {
      message.warning('Это не JSON — разложить по строкам не получится');
      return;
    }
    if (result !== text) onChange(result);
  };

  const formatButton = isJson && !isLocked && (
    <Button size="small" icon={<AlignLeftOutlined />} title="Shift + Alt + F" onClick={format}>
      Отформатировать
    </Button>
  );

  const editor = (isFullHeight: boolean) => (
    <CodeEditor
      value={text}
      language={language}
      isLocked={isLocked}
      isFullHeight={isFullHeight}
      onChange={onChange}
      onFormat={isJson ? format : undefined}
    />
  );

  const frame = { border: `1px solid ${error ? token.colorError : token.colorBorder}`, borderRadius: token.borderRadius, overflow: 'hidden' };
  const errorText = error && <Typography.Text type="danger">{error}</Typography.Text>;

  if (isFullscreen) {
    return (
      <>
        {/* Редактор один: пока открыто окно, в карточке его нет */}
        <Typography.Text type="secondary">Открыто на весь экран</Typography.Text>
        <FieldFullscreen
          title={field.name}
          onClose={() => setFullscreen(false)}
          header={
            <Space size={12} style={{ marginLeft: 'auto' }}>
              {errorText}
              {formatButton}
              <Button icon={<FullscreenExitOutlined />} onClick={() => setFullscreen(false)}>
                Свернуть
              </Button>
            </Space>
          }
        >
          <div style={{ ...frame, height: '100%' }}>{editor(true)}</div>
        </FieldFullscreen>
      </>
    );
  }

  return (
    <Space orientation="vertical" size={4} style={{ display: 'flex' }}>
      <div style={frame}>
        {/* Панель как у «HTML»: кнопки поля — справа */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 6px',
            borderBottom: `1px solid ${token.colorBorder}`,
            background: token.colorFillQuaternary,
          }}
        >
          <Typography.Text type="secondary" style={{ fontSize: token.fontSizeSM, paddingInlineStart: 4 }}>
            {isJson ? 'JSON' : 'JavaScript'}
          </Typography.Text>
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            {formatButton}
            <Button
              size="small"
              type="text"
              icon={<FullscreenOutlined />}
              title="На весь экран"
              aria-label="На весь экран"
              onClick={() => setFullscreen(true)}
            />
          </span>
        </div>
        {editor(false)}
      </div>
      {errorText}
    </Space>
  );
}
