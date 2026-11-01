import { useMemo } from 'react';
import CodeMirror, { EditorView } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';

/**
 * Режим «HTML»: разметка как есть, с подсветкой, автозакрытием тегов
 * и сворачиванием. Ничего не переписывает — что набрали, то и сохранится.
 * Длинные строки переносятся: листать HTML вбок неудобно.
 */
export default function HtmlCode({
  value,
  isLocked,
  onChange,
}: {
  value: string;
  isLocked: boolean;
  onChange: (value: string) => void;
}) {
  const extensions = useMemo(() => [html(), EditorView.lineWrapping], []);
  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      editable={!isLocked}
      minHeight="240px"
      maxHeight="560px"
      basicSetup={{ foldGutter: true, highlightActiveLine: !isLocked }}
      onChange={onChange}
    />
  );
}
