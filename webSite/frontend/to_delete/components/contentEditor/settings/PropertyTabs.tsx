import { useState } from 'react';
import { Input, Space, Tabs, Typography } from 'antd';
import { DEFAULT_TAB_KEY, useListSettingsFormState } from '../../../logic/listSettings';
import NewTabDialog from './NewTabDialog';
import PropertiesTable from './PropertiesTable';

/**
 * Вкладки карточки записи — прямо вкладками: переключение показывает свойства
 * только своей вкладки, «+» на панели заводит новую. Карточка записи потом
 * выглядит так же, то есть это заодно и предпросмотр её раскладки.
 *
 * Общая вкладка «Свойства» всегда первая и не удаляется: на неё попадает всё,
 * чему вкладку не назначили, и на неё же возвращаются свойства удалённых вкладок.
 */
export default function PropertyTabs() {
  const { tabs, countByTab, activeTab, setActiveTab, activeTabDraft, removeTab, updateTab } =
    useListSettingsFormState();
  const [isAdding, setIsAdding] = useState(false);

  /** Сколько свойств на вкладке — видно, не переключаясь на неё. */
  const label = (name: string, key: string): string => {
    const count = countByTab[key] ?? 0;
    return count > 0 ? `${name} · ${count}` : name;
  };

  return (
    <>
      <Tabs
        type="editable-card"
        activeKey={activeTab}
        onChange={setActiveTab}
        // Новая вкладка заводится попапом: у неё сразу есть название и код
        onEdit={(key, action) => {
          if (action === 'add') setIsAdding(true);
          else removeTab(String(key));
        }}
        items={[
          {
            key: DEFAULT_TAB_KEY,
            label: label('Свойства', DEFAULT_TAB_KEY),
            closable: false,
            // Таблица одна на все вкладки — она и так показывает свойства
            // открытой; в скрытых панелях её держать незачем
            children: activeTab === DEFAULT_TAB_KEY ? <PropertiesTable /> : null,
          },
          ...tabs.map((tab, index) => ({
            key: tab.uid,
            label: label(tab.name.trim() || `Вкладка №${index + 1}`, tab.uid),
            closable: true,
            children: activeTab === tab.uid ? <PropertiesTable /> : null,
          })),
        ]}
        // Переименование открытой вкладки — здесь же. Кода у неё пользователь
        // не видит: вкладка живёт только в карточке, сайт о ней не знает
        tabBarExtraContent={
          activeTabDraft ? (
            <Space size={8}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Название вкладки:
              </Typography.Text>
              <Input
                size="small"
                style={{ width: 220 }}
                value={activeTabDraft.name}
                placeholder="Доставка"
                onChange={(event) => updateTab(activeTabDraft.uid, { name: event.target.value })}
              />
            </Space>
          ) : null
        }
      />

      <NewTabDialog open={isAdding} onClose={() => setIsAdding(false)} />
    </>
  );
}
