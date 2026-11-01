import { Button, Dropdown, Space } from 'antd';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import { useListSettingsFormState } from '../../../logic/listSettings';

/**
 * Кнопки строки свойства: меню («Параметры», «Сменить привязку») и удаление.
 * Порядок свойств задаётся не кнопками, а колонкой «Сортировка»: кнопками его
 * пришлось бы набирать по шагу, а числом он задаётся сразу.
 */
export default function PropertyActions({
  uid,
  onConfigure,
  onRebind,
}: {
  uid: string;
  /** Открыть окно параметров этого свойства */
  onConfigure: () => void;
  /** Открыть окно привязки к вкладке */
  onRebind: () => void;
}) {
  const { properties, removeProperty } = useListSettingsFormState();
  const property = properties.find((item) => item.uid === uid);

  return (
    <Space size={0}>
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'config',
              label: 'Параметры свойства',
              // У простых типов настраивать нечего — пункт виден, но не нажимается
              disabled: !property?.hasConfig,
            },
            { key: 'tab', label: 'Сменить привязку' },
          ],
          onClick: ({ key }) => (key === 'config' ? onConfigure() : onRebind()),
        }}
      >
        <Button type="text" size="small" icon={<MoreOutlined />} aria-label="Ещё" />
      </Dropdown>
      <Button
        type="text"
        size="small"
        danger
        icon={<DeleteOutlined />}
        title="Удалить свойство"
        onClick={() => removeProperty(uid)}
      />
    </Space>
  );
}
