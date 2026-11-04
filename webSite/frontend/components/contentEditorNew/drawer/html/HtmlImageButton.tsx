import { useRef, useState } from 'react';
import { App, Dropdown } from 'antd';
import { LoadingOutlined, PictureOutlined } from '@ant-design/icons';
import type { Editor } from '@tiptap/react';
import { uploadError, useFileActions, useFiles, type FileDto } from '../../../../logic/files';
import { FilePickerDrawer } from '../file';
import type { EditorField } from '../record';
import Tool from './Tool';

/**
 * Изображение в текст: загрузить с диска или выбрать из «Файлов». Загруженное
 * ложится в раздел этого свойства в «Файлах» — так же, как у поля «Изображение»,
 * — а в разметку встаёт `<img>` с адресом файла там, где стоит курсор.
 * Принимаются только картинки: проверка та же, что у поля изображения.
 */
export default function HtmlImageButton({ editor, field }: { editor: Editor; field: EditorField }) {
  const { message } = App.useApp();
  const { fileById } = useFiles();
  const { upload } = useFileActions();
  const input = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const rules = field.upload;

  const insert = (files: FileDto[]) => {
    if (files.length === 0) return;
    const chain = editor.chain().focus();
    for (const file of files) chain.setImage({ src: file.url, alt: file.name });
    chain.run();
  };

  const uploadAll = async (list: File[]) => {
    if (!rules) return;
    setIsUploading(true);
    const added: FileDto[] = [];
    for (const file of list) {
      const invalid = await uploadError(file, rules);
      if (invalid) {
        message.error(invalid);
        continue;
      }
      const { file: uploaded, error } = await upload(file, { propertyId: rules.propertyId });
      if (uploaded) added.push(uploaded);
      else message.error(error);
    }
    setIsUploading(false);
    insert(added);
  };

  // У свойства, которое ещё не сохраняли, номера нет — грузить пока некуда
  if (!rules) return null;

  return (
    <>
      <Dropdown
        trigger={['click']}
        disabled={isUploading}
        menu={{
          items: [
            { key: 'upload', label: 'Загрузить с диска', onClick: () => input.current?.click() },
            { key: 'pick', label: 'Выбрать из загруженных', onClick: () => setIsPicking(true) },
          ],
        }}
      >
        <Tool title="Изображение" icon={isUploading ? <LoadingOutlined /> : <PictureOutlined />} />
      </Dropdown>

      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => {
          const list = Array.from(event.target.files ?? []);
          // Тот же файл можно выбрать снова — иначе браузер не пришлёт `change`
          event.target.value = '';
          if (list.length > 0) uploadAll(list);
        }}
      />

      <FilePickerDrawer
        open={isPicking}
        options={{ propertyId: rules.propertyId, rules, isMultiple: true, chosen: [] }}
        onPick={(ids) => insert(ids.flatMap((id) => fileById.get(id) ?? []))}
        onClose={() => setIsPicking(false)}
      />
    </>
  );
}
