import { useState } from 'react';
import { Button, Typography } from 'antd';
import { CloseOutlined, PaperClipOutlined } from '@ant-design/icons';
import { useEditorForm } from '../../../logic/editorForm';
import {
  addMedia,
  mediaIds,
  removeMedia,
  useLoadMediaLibrary,
  useMediaLibrary,
} from '../../../logic/mediaLibrary';
import styles from '../editorForm.module.scss';
import MediaPickerModal from './MediaPickerModal';
import MediaThumb from './MediaThumb';

/**
 * Поле «файл медиатеки»: выбранные файлы карточками и кнопка выбора. Сам выбор —
 * в окне: из уже загруженных файлов или загрузкой с диска. Значение поля —
 * номер файла (у множественного — массив номеров).
 */
export default function MediaField({ fieldKey }: { fieldKey: string }) {
  const { fields, values, setFieldValue } = useEditorForm();
  // Медиатека грузится, только когда такое поле впервые появилось на экране
  useLoadMediaLibrary();
  const { byId, isLoading } = useMediaLibrary();
  const [isPicking, setIsPicking] = useState(false);

  const field = fields.find((item) => item.key === fieldKey);
  if (!field) return null;

  const value = values[fieldKey];
  const multiple = Boolean(field.multiple);
  const disabled = field.disabled?.(values) ?? false;
  const ids = mediaIds(value);

  return (
    <div className={styles.media}>
      {ids.map((id) => {
        const item = byId.get(id) ?? null;
        return (
          <div key={id} className={styles.mediaItem}>
            <MediaThumb item={item} />
            <div className={styles.mediaInfo}>
              {item ? (
                <>
                  <Typography.Link href={item.url} target="_blank" rel="noopener" ellipsis>
                    {item.name}
                  </Typography.Link>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {item.details}
                  </Typography.Text>
                </>
              ) : (
                <Typography.Text type="secondary">
                  {/* Пока медиатека грузится, файл ещё не найден — это не значит, что его нет */}
                  {isLoading ? `Файл №${id}` : `Файл №${id} удалён из медиатеки`}
                </Typography.Text>
              )}
            </div>
            {!disabled && (
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                title="Убрать из записи (файл останется в медиатеке)"
                onClick={() => setFieldValue(fieldKey, removeMedia(value, id, multiple))}
              />
            )}
          </div>
        );
      })}

      {!disabled && (multiple || ids.length === 0) && (
        <Button icon={<PaperClipOutlined />} onClick={() => setIsPicking(true)}>
          {multiple && ids.length > 0 ? 'Добавить файлы' : 'Выбрать файл'}
        </Button>
      )}
      {!disabled && !multiple && ids.length > 0 && (
        <Button type="link" style={{ paddingInline: 0 }} onClick={() => setIsPicking(true)}>
          Заменить
        </Button>
      )}
      {disabled && ids.length === 0 && <Typography.Text type="secondary">—</Typography.Text>}

      <MediaPickerModal
        open={isPicking}
        multiple={multiple}
        rules={field.media}
        onClose={() => setIsPicking(false)}
        onPick={(picked) => {
          setFieldValue(fieldKey, addMedia(value, picked, multiple));
          setIsPicking(false);
        }}
      />
    </div>
  );
}
