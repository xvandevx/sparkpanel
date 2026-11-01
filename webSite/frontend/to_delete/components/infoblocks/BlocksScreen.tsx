import { Space } from 'antd';
import { ContentEditor } from '../contentEditor';
import { useBlocksController, useOpenSection } from '../../logic/infoblocks';
import { LevelCrumbs, LevelGate } from '../shared';

/**
 * Второй экран раздела (`/admin/infoblocks/2`): инфоблоки выбранного типа.
 * Записи инфоблока живут на его собственной странице — туда ведёт кнопка
 * перехода в строке.
 */
export default function BlocksScreen() {
  const { section, isLoading, loadFailed, error, isMissing, backToSections } = useOpenSection();

  const { list, form, actions, history, settings } = useBlocksController();

  return (
    <LevelGate
      isLoading={isLoading}
      loadFailed={loadFailed}
      error={error}
      isMissing={isMissing}
      failedText="Не удалось загрузить инфоблоки"
      missingText="Этого типа больше нет — он удалён"
      onBack={backToSections}
      backLabel="К типам"
    >
      <Space direction="vertical" size={16} style={{ display: 'flex' }}>
        <LevelCrumbs
          items={[
            { title: 'Инфоблоки', onClick: backToSections },
            { title: section?.name ?? '—' },
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
