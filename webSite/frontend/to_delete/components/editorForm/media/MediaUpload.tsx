import { useEffect, useState } from 'react';
import { Alert, App, Select, Space, Typography, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { EditorMediaRules } from '../../../logic/editorForm';
import { mediaRulesHint, useMediaLibrary } from '../../../logic/mediaLibrary';

/**
 * Загрузка файла с диска прямо из записи: файл ложится в выбранный раздел
 * медиатеки и сразу становится значением свойства. Что поле не примет (формат,
 * вес, разрешение), в медиатеку не загружается вовсе.
 *
 * Пропсы — только ограничения поля и куда отдать загруженный файл.
 */
export default function MediaUpload({
  rules,
  onUploaded,
}: {
  rules?: EditorMediaRules;
  onUploaded: (id: number) => void;
}) {
  const { sectionOptions, uploading, upload, checkUpload } = useMediaLibrary();
  const [sectionId, setSectionId] = useState<number | null>(null);
  const { message } = App.useApp();

  // Раздел по умолчанию — первый: чаще всего он и единственный
  useEffect(() => {
    if (sectionId === null && sectionOptions.length > 0) setSectionId(sectionOptions[0].value);
  }, [sectionId, sectionOptions]);

  if (sectionOptions.length === 0) {
    return (
      <Alert
        type="info"
        showIcon
        title="В медиатеке нет разделов"
        description="Файл кладётся в раздел медиатеки. Создайте раздел в «Файлах» и возвращайтесь."
      />
    );
  }

  const handleFile = async (file: File) => {
    if (sectionId === null) return;
    const invalid = await checkUpload(file, rules);
    if (invalid) {
      message.error(invalid);
      return;
    }
    const uploaded = await upload(sectionId, file);
    if (uploaded) onUploaded(uploaded.id);
  };

  const hint = mediaRulesHint(rules);

  return (
    <Space orientation="vertical" style={{ width: '100%' }} size={12}>
      <Space wrap>
        <Typography.Text>Раздел медиатеки:</Typography.Text>
        <Select
          style={{ minWidth: 240 }}
          value={sectionId ?? undefined}
          onChange={setSectionId}
          options={sectionOptions}
        />
      </Space>
      <Upload.Dragger
        multiple={false}
        showUploadList={false}
        // Подсказка системному окну выбора; настоящая проверка — перед загрузкой
        accept={
          rules?.formats.length
            ? rules.formats.map((format) => `.${format}`).join(',')
            : rules?.imagesOnly
              ? 'image/*'
              : undefined
        }
        disabled={uploading || sectionId === null}
        // Файл отдаём сами, через logic-хук: штатная загрузка antd отключена
        beforeUpload={(file) => {
          handleFile(file);
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">
          {uploading ? 'Загружаем…' : 'Перетащите файл сюда или нажмите, чтобы выбрать'}
        </p>
        <p className="ant-upload-hint">{hint ? `${hint} · до 20 МБ` : 'До 20 МБ'}</p>
      </Upload.Dragger>
    </Space>
  );
}
