import { Space } from 'antd';
import { ContentEditor } from '../contentEditor';
import { useFilesController, useLoadSectionFiles, useOpenFileSection } from '../../logic/files';
import { LevelCrumbs, LevelGate } from '../shared';

/**
 * Второй экран раздела (`/admin/files/2`): файлы выбранного раздела медиатеки.
 * Запись здесь заводится самим файлом — «загрузить» открывает шторку с полем
 * выбора файлов.
 */
export default function FilesScreen() {
  const { section, isLoading, loadFailed, error, isMissing, backToSections } = useOpenFileSection();

  // Файлы перечитываются при каждой смене раздела в адресе
  useLoadSectionFiles();

  const { list, form, actions, settings } = useFilesController();

  return (
    <LevelGate
      isLoading={isLoading}
      loadFailed={loadFailed}
      error={error}
      isMissing={isMissing}
      missingText="Этого раздела больше нет — он удалён"
      failedText="Не удалось загрузить медиатеку"
      onBack={backToSections}
      backLabel="К разделам"
    >
      <Space orientation="vertical" size={16} style={{ display: 'flex' }}>
        <LevelCrumbs
          items={[
            { title: 'Файлы', onClick: backToSections },
            { title: section?.name ?? '—' },
          ]}
        />

        <ContentEditor
          list={list}
          form={form}
          actions={actions}
          settings={settings}
        />
      </Space>
    </LevelGate>
  );
}
