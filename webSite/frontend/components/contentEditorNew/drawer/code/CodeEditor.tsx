import { useMemo, useRef } from 'react';
import CodeMirror, { EditorView, keymap } from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';

/** Подсветка: HTML, JavaScript или JSON. */
export type CodeLanguage = 'html' | 'javascript' | 'json';

const LANGUAGES = { html, javascript, json };

/**
 * Редактор кода — CodeMirror с подсветкой, автозакрытием скобок и тегов
 * и сворачиванием. Им правят режим «HTML» у поля «HTML» и поля «JavaScript» и «JSON».
 * Сам ничего не переписывает — что набрали, то и сохранится; разложить
 * по строкам — `onFormat` (кнопка над полем или Shift+Alt+F).
 * Длинные строки переносятся: листать код вбок неудобно.
 *
 * `isFullHeight` — редактор на всю высоту родителя (окно «на весь экран»),
 * иначе — от 240 до 560 px, как в карточке.
 */
export default function CodeEditor({
  value,
  language,
  isLocked,
  isFullHeight = false,
  onChange,
  onFormat,
}: {
  value: string;
  language: CodeLanguage;
  isLocked: boolean;
  isFullHeight?: boolean;
  onChange: (value: string) => void;
  /** Разложить по строкам; нет — у Shift+Alt+F нет действия */
  onFormat?: () => void;
}) {
  // Сочетание клавиш вешается один раз, а форматирует всегда текущее значение
  const format = useRef(onFormat);
  format.current = onFormat;
  const extensions = useMemo(
    () => [
      LANGUAGES[language](),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: 'Shift-Alt-f',
          run: () => {
            if (!format.current) return false;
            format.current();
            return true;
          },
        },
      ]),
    ],
    [language],
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
