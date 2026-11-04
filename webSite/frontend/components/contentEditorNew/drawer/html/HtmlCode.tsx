import { useMemo, useRef } from 'react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';

/**
 * Режим «HTML»: разметка как есть, с подсветкой, автозакрытием тегов
 * и сворачиванием. Сам ничего не переписывает — что набрали, то и сохранится;
 * разложить разметку по строкам — `onFormat` (кнопка над полем или Shift+Alt+F).
 * Длинные строки переносятся: листать HTML вбок неудобно.
 *
 * `isFullHeight` — редактор на всю высоту родителя (окно «на весь экран»),
 * иначе — от 240 до 560 px, как в карточке.
 */
export default function HtmlCode({
  value,
  isLocked,
  isFullHeight = false,
  onChange,
  onFormat,
}: {
  value: string;
  isLocked: boolean;
  isFullHeight?: boolean;
  onChange: (value: string) => void;
  onFormat: () => void;
}) {
  // Сочетание клавиш вешается один раз, а форматирует всегда текущее значение
  const format = useRef(onFormat);
  format.current = onFormat;
  const extensions = useMemo(
    () => [
      html(),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Shift-Alt-f',
          run: () => {
            format.current();
            return true;
          },
        },
      ]),
    ],
    [],
  );
  const size = isFullHeight ? { height: '100%', style: { height: '100%' } } : { minHeight: '240px', maxHeight: '560px' };
  return (
    <CodeMirror
      value={value}
      extensions={extensions}
      editable={!isLocked}
      {...size}
      basicSetup={{ foldGutter: true, highlightActiveLine: !isLocked }}
      onChange={onChange}
    />
  );
}
