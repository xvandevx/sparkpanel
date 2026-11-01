import { Space } from 'antd';
import { ContentEditor } from '../contentEditor';
import { useLoadHtmlBlocks } from '../../logic/content';
import {
  useElementsController,
  useLoadInfoblockElements,
  useOpenBlock,
} from '../../logic/infoblocks';
import { LevelCrumbs, LevelGate } from '../shared';

/**
 * Третий экран раздела (`/admin/infoblocks/2/3`): записи выбранного инфоблока.
 */
export default function ElementsScreen() {
  // Записи грузим один раз на экран, а не в каждом компоненте
  useLoadInfoblockElements();
  // Блоки нужны полям анонса и текста — для выбора, что подключить
  useLoadHtmlBlocks();

  const {
    section,
    block,
    isLoading,
    loadFailed,
    error,
    isMissing,
    backToSections,
    backToSection,
  } = useOpenBlock();

  const { list, form, actions, history, settings } = useElementsController();

  return (
    <LevelGate
      isLoading={isLoading}
      loadFailed={loadFailed}
      error={error}
      isMissing={isMissing}
      failedText="Не удалось загрузить инфоблоки"
      missingText="Этого инфоблока больше нет — он удалён"
      onBack={backToSection}
      backLabel="К инфоблокам"
    >
      <Space direction="vertical" size={16} style={{ display: 'flex' }}>
        <LevelCrumbs
          items={[
            { title: 'Инфоблоки', onClick: backToSections },
            { title: section?.name ?? '—', onClick: backToSection },
            { title: block?.name ?? '—' },
          ]}
        />

        <ContentEditor
          list={list}
          form={form}
          actions={actions}
          history={history}
          settings={settings}
        />
      </Space>
    </LevelGate>
  );
}
