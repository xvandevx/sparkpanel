import { useEffect } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import type { EditorField } from '../record';
import HtmlToolbar from './HtmlToolbar';
import styles from './HtmlVisual.module.css';

/**
 * Схема визуального редактора: абзацы, заголовки, списки, цитаты, код, ссылки
 * (StarterKit), изображения и таблицы. Что сюда не входит, редактор при правке
 * выбросит — список того же самого для проверки в `htmlMarkup.ts`.
 *
 * Ссылкам не навязываем `target` и `rel`: у TipTap по умолчанию каждая новая
 * ссылка открывается в новой вкладке — сайт решает это сам.
 */
const EXTENSIONS = [
  StarterKit.configure({
    link: { openOnClick: false, autolink: true, HTMLAttributes: { target: null, rel: null } },
  }),
  Image,
  TableKit.configure({ table: { resizable: false } }),
];

/**
 * Визуальный режим поля «HTML»: правят как текст, кнопки — над полем. Пустой
 * документ отдаём пустой строкой, а не `<p></p>`: иначе обязательное поле
 * считалось бы заполненным.
 */
export default function HtmlVisual({
  field,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  value: string;
  isLocked: boolean;
  onChange: (value: string) => void;
}) {
  const editor = useEditor({
    extensions: EXTENSIONS,
    content: value,
    editable: !isLocked,
    // Next рендерит страницу на сервере — редактор встаёт только в браузере
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => onChange(current.isEmpty ? '' : current.getHTML()),
  });

  useEffect(() => {
    editor?.setEditable(!isLocked);
  }, [editor, isLocked]);

  // Значение сменили снаружи (открыли другую запись, сбросили черновик) —
  // показываем его. Своё же, только что набранное, не перезаписываем: курсор бы прыгнул
  useEffect(() => {
    if (!editor) return;
    const current = editor.isEmpty ? '' : editor.getHTML();
    if (current !== value) editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  return (
    <>
      {editor && !isLocked && <HtmlToolbar editor={editor} field={field} />}
      <EditorContent editor={editor} className={styles.content} />
    </>
  );
}
