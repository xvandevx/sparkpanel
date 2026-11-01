import { useState } from 'react';
import { Button, Dropdown, Input, Popover, Space } from 'antd';
import {
  BoldOutlined,
  ClearOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  TableOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useEditorState, type Editor } from '@tiptap/react';
import type { EditorField } from '../record';
import HtmlImageButton from './HtmlImageButton';
import Tool from './Tool';
import styles from './HtmlVisual.module.css';

/**
 * Кнопки визуального режима: начертание, заголовки, списки, цитата, ссылка,
 * изображение, таблица, отмена. Нажатая кнопка подсвечена — видно, что уже
 * стоит под курсором.
 */
export default function HtmlToolbar({ editor, field }: { editor: Editor; field: EditorField }) {
  // Что стоит под курсором — перечитывается на каждую правку и сдвиг курсора
  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      isBold: current.isActive('bold'),
      isItalic: current.isActive('italic'),
      isUnderline: current.isActive('underline'),
      isStrike: current.isActive('strike'),
      isH2: current.isActive('heading', { level: 2 }),
      isH3: current.isActive('heading', { level: 3 }),
      isBullet: current.isActive('bulletList'),
      isOrdered: current.isActive('orderedList'),
      isQuote: current.isActive('blockquote'),
      isLink: current.isActive('link'),
      isTable: current.isActive('table'),
      canUndo: current.can().undo(),
      canRedo: current.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  return (
    <div className={styles.toolbar}>
      <Tool title="Жирный" icon={<BoldOutlined />} isActive={state.isBold} onClick={() => chain().toggleBold().run()} />
      <Tool title="Курсив" icon={<ItalicOutlined />} isActive={state.isItalic} onClick={() => chain().toggleItalic().run()} />
      <Tool
        title="Подчёркнутый"
        icon={<UnderlineOutlined />}
        isActive={state.isUnderline}
        onClick={() => chain().toggleUnderline().run()}
      />
      <Tool
        title="Зачёркнутый"
        icon={<StrikethroughOutlined />}
        isActive={state.isStrike}
        onClick={() => chain().toggleStrike().run()}
      />
      <span className={styles.divider} />
      <Tool title="Заголовок 2" label="H2" isActive={state.isH2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <Tool title="Заголовок 3" label="H3" isActive={state.isH3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <Tool
        title="Маркированный список"
        icon={<UnorderedListOutlined />}
        isActive={state.isBullet}
        onClick={() => chain().toggleBulletList().run()}
      />
      <Tool
        title="Нумерованный список"
        icon={<OrderedListOutlined />}
        isActive={state.isOrdered}
        onClick={() => chain().toggleOrderedList().run()}
      />
      <Tool title="Цитата" label="❝" isActive={state.isQuote} onClick={() => chain().toggleBlockquote().run()} />
      <span className={styles.divider} />
      <LinkButton editor={editor} isActive={state.isLink} />
      <HtmlImageButton editor={editor} field={field} />
      <TableButton editor={editor} isActive={state.isTable} />
      <span className={styles.divider} />
      <Tool
        title="Убрать оформление"
        icon={<ClearOutlined />}
        onClick={() => chain().unsetAllMarks().clearNodes().run()}
      />
      <Tool title="Отменить" icon={<UndoOutlined />} isDisabled={!state.canUndo} onClick={() => chain().undo().run()} />
      <Tool title="Повторить" icon={<RedoOutlined />} isDisabled={!state.canRedo} onClick={() => chain().redo().run()} />
    </div>
  );
}

/**
 * Ссылка: адрес набирают во всплывающем окне. Курсор на ссылке — окно
 * открывается с её адресом и умеет её убрать; без выделения ссылка ставится
 * на всё слово под курсором.
 */
function LinkButton({ editor, isActive }: { editor: Editor; isActive: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [href, setHref] = useState('');

  const open = (next: boolean) => {
    if (next) setHref(String(editor.getAttributes('link').href ?? ''));
    setIsOpen(next);
  };
  const apply = () => {
    const url = href.trim();
    const chain = editor.chain().focus().extendMarkRange('link');
    (url === '' ? chain.unsetLink() : chain.setLink({ href: url })).run();
    setIsOpen(false);
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={open}
      trigger="click"
      content={
        <Space.Compact style={{ width: 320 }}>
          <Input
            autoFocus
            value={href}
            placeholder="https://… или /catalog"
            onChange={(event) => setHref(event.target.value)}
            onPressEnter={apply}
          />
          <Button type="primary" onClick={apply}>
            {href.trim() === '' && isActive ? 'Убрать' : 'Готово'}
          </Button>
        </Space.Compact>
      }
    >
      <Tool title="Ссылка" icon={<LinkOutlined />} isActive={isActive} />
    </Popover>
  );
}

/** Таблица: вставить новую, а курсор в таблице — строки, столбцы, удаление. */
function TableButton({ editor, isActive }: { editor: Editor; isActive: boolean }) {
  const chain = () => editor.chain().focus();
  const items = isActive
    ? [
        { key: 'rowAfter', label: 'Добавить строку ниже', onClick: () => chain().addRowAfter().run() },
        { key: 'colAfter', label: 'Добавить столбец справа', onClick: () => chain().addColumnAfter().run() },
        { key: 'header', label: 'Шапка таблицы — вкл/выкл', onClick: () => chain().toggleHeaderRow().run() },
        { type: 'divider' as const },
        { key: 'rowDelete', label: 'Удалить строку', onClick: () => chain().deleteRow().run() },
        { key: 'colDelete', label: 'Удалить столбец', onClick: () => chain().deleteColumn().run() },
        { key: 'tableDelete', label: 'Удалить таблицу', danger: true, onClick: () => chain().deleteTable().run() },
      ]
    : [
        {
          key: 'insert',
          label: 'Вставить таблицу 3 × 3',
          onClick: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
        },
      ];

  return (
    <Dropdown menu={{ items }} trigger={['click']}>
      <Tool title="Таблица" icon={<TableOutlined />} isActive={isActive} />
    </Dropdown>
  );
}
