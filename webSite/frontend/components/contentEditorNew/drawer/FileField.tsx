import { useState } from 'react';
import { App, Button, Space, Typography, Upload } from 'antd';
import { DeleteOutlined, FolderOpenOutlined, UploadOutlined } from '@ant-design/icons';
import {
  acceptOf,
  formatFileSize,
  rulesHint,
  uploadError,
  useFileActions,
  useFiles,
  type FileDto,
} from '../../../logic/files';
import { ActionIcon, FileThumb } from '../ui';
import FilePickerDrawer from './FilePickerDrawer';
import { FieldType, type EditorField } from './record';

/**
 * Поле «Файл» и «Изображение»: выбранные файлы, загрузка с диска и выбор
 * из уже загруженных — в своей шторке поверх карточки. Значение — номер
 * файла, у множественного — номера; карточку файла (имя, адрес, превью)
 * поле берёт из общего списка файлов.
 *
 * Одиночное поле с файлом новых не принимает — кнопок нет: сменить файл
 * значит убрать прежний и выбрать другой. Иначе «Загрузить» молча
 * вытесняла бы выбранный.
 *
 * Загрузка уходит сразу, не дожидаясь «Сохранить»: файл ложится в раздел
 * свойства в «Файлах», а к записи привяжется, когда её сохранят. Закрыли
 * карточку без сохранения — файл остался в разделе ни к чему не привязанным,
 * там его видно и можно удалить.
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
  const { upload } = useFileActions();
  const [isUploading, setIsUploading] = useState(false);
  const [isPicking, setIsPicking] = useState(false);

  const rules = field.upload;
  const isMultiple = field.isMultiple === true;
  const ids = idsOf(value);
  const isFull = !isMultiple && ids.length > 0;

  /** Добавить выбранное; одиночному полю — последний из выбранных. */
  const choose = (added: number[]) =>
    onChange(
      isMultiple
        ? [...ids, ...added.filter((id) => !ids.includes(id))]
        : (added[added.length - 1] ?? null),
    );

  const drop = (id: number) => onChange(isMultiple ? ids.filter((item) => item !== id) : null);

  /**
   * Файлы с диска — по одному, но значение меняем один раз в конце: каждое
   * `onChange` по ходу затирало бы предыдущее, ведь `ids` у них общие.
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
    if (added.length > 0) choose(added);
  };

  const hint = rules ? rulesHint(rules) : '';

  return (
    <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
      {ids.map((id) => (
        <FileRow
          key={id}
          id={id}
          file={fileById.get(id)}
          isImage={field.type === FieldType.Image}
          isLocked={isLocked}
          onRemove={() => drop(id)}
        />
      ))}

      {!isFull && (
        <Space wrap>
          <Upload
            multiple={isMultiple}
            showUploadList={false}
            accept={rules ? acceptOf(rules) : undefined}
            disabled={isLocked || isUploading}
            // antd зовёт это на каждый файл, но отдаёт и весь выбор: берём его
            // целиком на первом. Штатную загрузку antd отключаем — ведёт её стор
            beforeUpload={(file, list) => {
              if (file === list[0]) uploadAll(list);
              return false;
            }}
          >
            <Button icon={<UploadOutlined />} loading={isUploading} disabled={isLocked}>
              Загрузить
            </Button>
          </Upload>

          <Button
            icon={<FolderOpenOutlined />}
            disabled={isLocked || isUploading}
            onClick={() => setIsPicking(true)}
          >
            Выбрать из загруженных
          </Button>
        </Space>
      )}

      <FilePickerDrawer
        open={isPicking}
        options={{
          propertyId: rules?.propertyId ?? null,
          rules: rules ?? null,
          isMultiple,
          chosen: ids,
        }}
        onPick={choose}
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

/** Выбранный файл: превью или значок, имя ссылкой, размер и крестик. */
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

/** Значение поля — номера файлов, сколько бы их ни было: одиночное тоже списком. */
const idsOf = (value: unknown): number[] =>
  (Array.isArray(value) ? value : value === null || value === undefined ? [] : [value])
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
