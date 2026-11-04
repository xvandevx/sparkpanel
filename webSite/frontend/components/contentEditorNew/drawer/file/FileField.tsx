import { useState } from 'react';
import { App, Button, Space, Typography, Upload } from 'antd';
import { DeleteOutlined, FolderOpenOutlined, LinkOutlined, UploadOutlined } from '@ant-design/icons';
import {
  acceptOf,
  addFileItems,
  fileIdsOf,
  fileItemsOf,
  formatFileSize,
  isExternalUrl,
  removeFileItem,
  replaceFileItem,
  rulesHint,
  uploadError,
  useFileActions,
  useFiles,
  type FileDto,
  type FileItem,
} from '../../../../logic/files';
import { ActionIcon, FileThumb } from '../../ui';
import { FieldType, type EditorField } from '../record';
import ExternalFileRow from './ExternalFileRow';
import FilePickerDrawer from './FilePickerDrawer';
import FileUrlInput from './FileUrlInput';

/**
 * Поле «Файл» и «Изображение». Каждый пункт значения — свой файл (номер,
 * карточку файла поле берёт из общего списка файлов) или внешний — адрес
 * `https://…`, файл на чужом сервере. Добавить можно тремя путями: загрузить
 * с диска, выбрать из загруженных (своя шторка поверх карточки) или вставить
 * ссылку. Внешнюю ссылку можно заменить другой или забрать файл к себе
 * в хранилище — тогда на её месте встанет номер нового файла.
 *
 * Одиночное поле с файлом новых не принимает — кнопок нет: сменить файл
 * значит убрать прежний и выбрать другой. Иначе «Загрузить» молча
 * вытесняла бы выбранный.
 *
 * Загрузка и «Забрать в хранилище» уходят сразу, не дожидаясь «Сохранить»:
 * файл ложится в раздел свойства в «Файлах», а к записи привяжется, когда
 * её сохранят. Закрыли карточку без сохранения — файл остался в разделе
 * ни к чему не привязанным, там его видно и можно удалить.
 */
export default function FileField({
  field,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  /** Запись пишется — правки не принимаем */
  isLocked: boolean;
  onChange: (value: unknown) => void;
}) {
  const { message } = App.useApp();
  const { fileById } = useFiles();
  const { upload, importUrl } = useFileActions();
  const [isUploading, setIsUploading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  /** Внешний файл, который сейчас забирают в хранилище */
  const [importing, setImporting] = useState<string | null>(null);

  const rules = field.upload;
  const isMultiple = field.isMultiple === true;
  const isImage = field.type === FieldType.Image;
  const items = fileItemsOf(value);
  const isFull = !isMultiple && items.length > 0;
  const isBusy = isLocked || isUploading || importing !== null;

  const add = (added: FileItem[]) => onChange(addFileItems(items, added, isMultiple));
  const drop = (item: FileItem) => onChange(removeFileItem(items, item, isMultiple));
  const replace = (from: FileItem, to: FileItem) => onChange(replaceFileItem(items, from, to, isMultiple));

  /**
   * Файлы с диска — по одному, но значение меняем один раз в конце: каждое
   * `onChange` по ходу затирало бы предыдущее, ведь `items` у них общие.
   */
  const uploadAll = async (list: File[]) => {
    if (!rules) return;
    setIsUploading(true);
    const added: number[] = [];
    for (const file of list) {
      const invalid = await uploadError(file, rules);
      if (invalid) {
        message.error(invalid);
        continue;
      }
      const { file: uploaded, error } = await upload(file, { propertyId: rules.propertyId });
      if (uploaded) added.push(uploaded.id);
      else message.error(error);
    }
    setIsUploading(false);
    if (added.length > 0) add(added);
  };

  const takeToStorage = async (url: string) => {
    if (!rules) return;
    setImporting(url);
    const { file, error } = await importUrl(url, { propertyId: rules.propertyId });
    setImporting(null);
    if (!file) {
      message.error(error);
      return;
    }
    replace(url, file.id);
    message.success(`«${file.name}» теперь в хранилище — сохраните запись`);
  };

  const hint = rules ? rulesHint(rules) : '';

  return (
    <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
      {items.map((item) =>
        isExternalUrl(item) ? (
          <ExternalFileRow
            key={item}
            url={item}
            isImage={isImage}
            rules={rules ?? null}
            isLocked={isBusy}
            isImporting={importing === item}
            onReplace={(url) => replace(item, url)}
            onImport={() => takeToStorage(item)}
            onRemove={() => drop(item)}
          />
        ) : (
          <FileRow
            key={item}
            id={item as number}
            file={fileById.get(item as number)}
            isImage={isImage}
            isLocked={isBusy}
            onRemove={() => drop(item)}
          />
        ),
      )}

      {!isFull && isAddingUrl && (
        <FileUrlInput
          rules={rules ?? null}
          onSubmit={(url) => {
            add([url]);
            setIsAddingUrl(false);
          }}
          onCancel={() => setIsAddingUrl(false)}
        />
      )}

      {!isFull && !isAddingUrl && (
        <Space wrap>
          <Upload
            multiple={isMultiple}
            showUploadList={false}
            accept={rules ? acceptOf(rules) : undefined}
            disabled={isBusy}
            // antd зовёт это на каждый файл, но отдаёт и весь выбор: берём его
            // целиком на первом. Штатную загрузку antd отключаем — ведёт её стор
            beforeUpload={(file, list) => {
              if (file === list[0]) uploadAll(list);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} loading={isUploading} disabled={isBusy}>
              Загрузить
            </Button>
          </Upload>

          <Button icon={<FolderOpenOutlined />} disabled={isBusy} onClick={() => setIsPicking(true)}>
            Выбрать из загруженных
          </Button>

          <Button icon={<LinkOutlined />} disabled={isBusy} onClick={() => setIsAddingUrl(true)}>
            Вставить ссылку
          </Button>
        </Space>
      )}

      <FilePickerDrawer
        open={isPicking}
        options={{
          propertyId: rules?.propertyId ?? null,
          rules: rules ?? null,
          isMultiple,
          chosen: fileIdsOf(items),
        }}
        onPick={add}
        onClose={() => setIsPicking(false)}
      />

      {hint && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {hint}
        </Typography.Text>
      )}
    </Space>
  );
}

/** Выбранный свой файл: превью или значок, имя ссылкой, размер и крестик. */
function FileRow({
  id,
  file,
  isImage,
  isLocked,
  onRemove,
}: {
  id: number;
  /** Нет — файла уже нет в «Файлах» или список ещё не пришёл */
  file: FileDto | undefined;
  isImage: boolean;
  isLocked: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* У поля изображения превью крупнее: по нему картинку и узнают */}
      <FileThumb url={file?.url ?? ''} isImage={file?.isImage === true} size={isImage ? 64 : 40} />

      <div className="flex min-w-0 flex-1 flex-col">
        {file ? (
          <>
            <Typography.Link href={file.url} target="_blank" rel="noreferrer" ellipsis>
              {file.name}
            </Typography.Link>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatFileSize(file.size)}
            </Typography.Text>
          </>
        ) : (
          <Typography.Text type="secondary">Файл №{id}</Typography.Text>
        )}
      </div>

      {/* Крестик без красноты: убрать файл из записи — не то же, что удалить его */}
      {!isLocked && <ActionIcon title="Убрать файл" icon={<DeleteOutlined />} onClick={onRemove} />}
    </div>
  );
}
