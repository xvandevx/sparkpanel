import { useState } from 'react';
import { Spin, Tag, Typography } from 'antd';
import { CloudDownloadOutlined, DeleteOutlined, EditOutlined, LinkOutlined } from '@ant-design/icons';
import { externalFileName, externalHost, isImageUrl, type FileRules } from '../../../../logic/files';
import { ActionIcon, FileThumb } from '../../ui';
import FileUrlInput from './FileUrlInput';

/**
 * Внешний файл в поле: превью по адресу, имя из адреса, метка «Внешняя
 * ссылка» с сайтом. Действия: заменить ссылку другой, забрать файл к себе
 * в хранилище (на месте ссылки встанет номер файла) и убрать.
 */
export default function ExternalFileRow({
  url,
  isImage,
  rules,
  isLocked,
  isImporting,
  onReplace,
  onImport,
  onRemove,
}: {
  url: string;
  /** Поле «Изображение»: превью крупнее и всегда картинкой */
  isImage: boolean;
  rules: FileRules | null;
  isLocked: boolean;
  /** Файл сейчас забирают в хранилище */
  isImporting: boolean;
  onReplace: (url: string) => void;
  onImport: () => void;
  onRemove: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <FileUrlInput
        initial={url}
        rules={rules}
        submitLabel="Заменить"
        onSubmit={(next) => {
          if (next !== url) onReplace(next);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <FileThumb url={url} isImage={isImage || isImageUrl(url)} size={isImage ? 64 : 40} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Typography.Link href={url} target="_blank" rel="noreferrer" ellipsis title={url}>
          {externalFileName(url)}
        </Typography.Link>
        <div>
          <Tag icon={<LinkOutlined />} style={{ marginInlineEnd: 0 }}>
            Внешняя ссылка · {externalHost(url)}
          </Tag>
        </div>
      </div>

      {isImporting ? (
        <Spin size="small" />
      ) : (
        !isLocked && (
          <>
            <ActionIcon title="Заменить ссылку" icon={<EditOutlined />} onClick={() => setIsEditing(true)} />
            {rules && (
              <ActionIcon title="Забрать в хранилище" icon={<CloudDownloadOutlined />} onClick={onImport} />
            )}
            <ActionIcon title="Убрать ссылку" icon={<DeleteOutlined />} onClick={onRemove} />
          </>
        )
      )}
    </div>
  );
}
