import { useCallback, useEffect, useRef } from 'react';
import type Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { htmlBlockToken, useEditorForm } from '../../../logic/editorForm';
// Файлом, а не через index: EditorField из fields сам подключает это поле
import HtmlBlocks from '../fields/HtmlBlocks';
import styles from '../editorForm.module.scss';

/** Панель инструментов: оформление текста, без вставки картинок и видео по ссылке. */
const TOOLBAR = [
  [{ header: [2, 3, 4, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['link', 'blockquote', 'code-block'],
  [{ align: [] }],
  ['clean'],
];

/** Пустой редактор Quill отдаёт `<p><br></p>` — для формы это пустое значение. */
const editorHtml = (quill: Quill): string =>
  quill.getText().trim() === '' ? '' : quill.root.innerHTML;

/**
 * Визуальный редактор разметки (Quill). Значение поля — HTML. С `htmlBlocks`
 * под редактором есть вставка HTML-блока: маркер `#BLOCK:код#` встаёт в позицию
 * курсора, а сайт подставит на его место разметку блока.
 *
 * Quill работает только в браузере, поэтому подгружается после монтирования,
 * а его разметку (панель + редактор) компонент создаёт сам внутри обёртки:
 * React этой частью DOM не владеет и при повторном монтировании не спотыкается.
 */
export default function RichTextField({
  fieldKey,
  value: valueProp,
  onChange,
}: {
  fieldKey: string;
  /** Значение со стороны: одна строка множественного поля, а не всё его значение */
  value?: string;
  onChange?: (html: string) => void;
}) {
  const { fields, values, setFieldValue } = useEditorForm();
  const field = fields.find((item) => item.key === fieldKey);

  const hostRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  /** Что редактор отдал последним — чтобы не перечитывать в него его же правку */
  const lastHtml = useRef<string>('');
  /** Обработчик правки меняется с формой, а подписка у Quill одна — держим его в ref */
  const onChangeRef = useRef<(html: string) => void>(() => undefined);

  const value = valueProp ?? String(values[fieldKey] ?? '');
  const disabled = field?.disabled?.(values) ?? false;

  onChangeRef.current = (html: string) =>
    onChange ? onChange(html) : setFieldValue(fieldKey, html);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;

    import('quill').then(({ default: QuillEditor }) => {
      if (cancelled) return;
      const container = document.createElement('div');
      host.appendChild(container);

      const quill = new QuillEditor(container, {
        theme: 'snow',
        placeholder: field?.placeholder,
        modules: { toolbar: TOOLBAR },
      });
      quill.setContents(quill.clipboard.convert({ html: value }), 'silent');
      lastHtml.current = value;

      quill.on('text-change', (_delta, _old, source) => {
        if (source === 'silent') return;
        const html = editorHtml(quill);
        lastHtml.current = html;
        onChangeRef.current(html);
      });

      quillRef.current = quill;
    });

    return () => {
      cancelled = true;
      quillRef.current = null;
      host.innerHTML = '';
    };
    // Редактор создаётся один раз; значение дальше синхронизирует эффект ниже
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Значение сменили снаружи (другая запись, «Отменить») — переписываем редактор
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill || value === lastHtml.current) return;
    quill.setContents(quill.clipboard.convert({ html: value }), 'silent');
    lastHtml.current = value;
  }, [value]);

  useEffect(() => {
    quillRef.current?.enable(!disabled);
  }, [disabled]);

  /** Вставить маркер блока туда, где стоял курсор (или в конец, если его не было). */
  const insertBlock = useCallback((code: string) => {
    const quill = quillRef.current;
    if (!quill) return;
    const range = quill.getSelection(true);
    const index = range ? range.index : Math.max(quill.getLength() - 1, 0);
    const token = htmlBlockToken(code);
    quill.insertText(index, token, 'user');
    quill.setSelection(index + token.length, 0, 'silent');
  }, []);

  if (!field) return null;

  return (
    <div className={styles.richText}>
      <div ref={hostRef} className={disabled ? styles.richTextDisabled : undefined} />
      {field.htmlBlocks && (
        <HtmlBlocks html={value} blocks={field.htmlBlocks} disabled={disabled} onInsert={insertBlock} />
      )}
    </div>
  );
}
