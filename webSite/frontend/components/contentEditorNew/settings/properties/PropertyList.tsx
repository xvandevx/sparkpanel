import { useState } from 'react';
import { Button, Dropdown, Flex, Space, Table, Tag, Typography } from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  LockOutlined,
  PlusOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import { PropertyType, PROPERTY_TYPE_LABELS } from '../../../../logic/listSettings';
import { ActionIcon } from '../../ui';
import { TabList, DEFAULT_TAB } from '../tabs';
import { newProperty, nextPosition, type PropertyDraft } from './property';
import { useProperties } from './useProperties';
import PropertyDrawer from './PropertyDrawer';

/**
 * Свойства записей — раздел окна настроек целиком: пояснение и «Добавить
 * свойство» сверху, вкладки карточки, таблица свойств открытой вкладки.
 *
 * В таблице свойства такие,
 * какие лежат в базе: черновика у списка нет. Правят свойство в его шторке,
 * и сохраняет его тоже она — таблица решает лишь, что открыто. За собой она
 * оставила удаление: корзина есть у каждой строки, и шторку ради неё
 * не открывают.
 */

export default function PropertyList({ listKey }: { listKey: string }) {
  const { properties: rows, tabs, isSaving, move, remove } = useProperties(listKey);

  /** Открытая вкладка карточки; пусто — общая вкладка «Свойства» */
  const [tab, setTab] = useState<string>(DEFAULT_TAB);

  /** Свойство, которое правят; null — шторка закрыта */
  const [edited, setEdited] = useState<PropertyDraft | null>(null);

  /** Код свойства, у которого открыто меню переноса; null — закрыто */
  const [moving, setMoving] = useState<string | null>(null);

  /** Куда можно перенести: все вкладки карточки, кроме открытой. */
  const moveTargets = [
    { code: DEFAULT_TAB, name: 'Свойства' },
    ...tabs.map((item, index) => ({
      code: item.code,
      name: item.name.trim() || `Вкладка №${index + 1}`,
    })),
  ].filter((target) => target.code !== tab);

  const onTab = rows.filter((property) => String(property.tab ?? '') === tab);

  /** Удалили — закрываем шторку: правили, скорее всего, его же. */
  const confirmRemove = async (property: PropertyDraft) => {
    if (await remove(property)) setEdited(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="space-between" align="center" gap={16}>
        {/* Кнопка «Сохранить» наверху окна к свойствам отношения не имеет —
            иначе кажется, что их правки пропадут без неё */}
        <Typography.Text type="secondary">
          Вкладки ниже — вкладки карточки записи. Вкладки и свойства сохраняются сразу, без кнопки
          «Сохранить».
        </Typography.Text>
        {/* Свойство заводится на открытой вкладке — там, где его и ждут увидеть */}
        <Button
          icon={<PlusOutlined />}
          onClick={() => setEdited(newProperty(tab, nextPosition(rows, tab)))}
        >
          Добавить свойство
        </Button>
      </Flex>

      <TabList listKey={listKey} activeTab={tab} onActiveTab={setTab} />

      <Table
        size="middle"
        rowKey="code"
        dataSource={onTab}
        pagination={false}
        loading={isSaving}
        locale={{ emptyText: 'Свойств пока нет' }}
        onRow={(property) => ({ onClick: () => setEdited(property) })}
        columns={[
          {
            key: 'name',
            title: 'Название',
            render: (_: unknown, property: PropertyDraft) => String(property.name),
          },
          {
            key: 'code',
            title: 'Код',
            width: 220,
            render: (_: unknown, property: PropertyDraft) => (
              <Typography.Text code>{String(property.code)}</Typography.Text>
            ),
          },
          {
            key: 'type',
            title: 'Тип',
            width: 200,
            render: (_: unknown, property: PropertyDraft) =>
              PROPERTY_TYPE_LABELS[property.type as PropertyType] ?? property.type,
          },
          {
            key: 'rules',
            title: 'Правила',
            width: 200,
            render: (_: unknown, property: PropertyDraft) => {
              const rules = [
                property.isBlocked === true ? 'системное' : null,
                property.required === true ? 'обязательное' : null,
                property.multiple === true ? 'множественное' : null,
                property.isMultiDomain === true ? 'мультидоменное' : null,
                property.isHidden === true ? 'не через API' : null,
                property.isExternal === true ? 'внешний источник' : null,
              ].filter(Boolean);
              return rules.length ? (
                <Flex gap={4} wrap>
                  {rules.map((rule) => (
                    // Обязательность — единственное правило, которое ждёт
                    // действия от того, кто заполняет запись: её и выделяем
                    <Tag key={rule} color={rule === 'обязательное' ? 'blue' : undefined}>
                      {rule}
                    </Tag>
                  ))}
                </Flex>
              ) : (
                <Typography.Text type="secondary">—</Typography.Text>
              );
            },
          },
          {
            key: 'position',
            title: 'Сортировка',
            width: 120,
            render: (_: unknown, property: PropertyDraft) => property.position,
          },
          {
            key: 'actions',
            title: '',
            width: 110,
            align: 'right' as const,
            render: (_: unknown, property: PropertyDraft) => (
              <Space size={4}>
                {/* Системное свойство сервер не даст поменять — и перенести тоже.
                    Меню открываем сами: значок гасит клик, чтобы не открылась строка */}
                {property.isBlocked !== true && moveTargets.length > 0 && (
                  <Dropdown
                    trigger={['click']}
                    open={moving === property.code}
                    onOpenChange={(isOpen) => !isOpen && setMoving(null)}
                    menu={{
                      items: moveTargets.map((target) => ({
                        key: target.code,
                        label: target.name,
                      })),
                      onClick: ({ key, domEvent }) => {
                        // Меню в портале, но клик всплывает по дереву React — до строки
                        domEvent.stopPropagation();
                        setMoving(null);
                        const target = moveTargets.find((item) => item.code === key);
                        if (target) move(property, target.code, target.name);
                      },
                    }}
                  >
                    <span>
                      <ActionIcon
                        title="Перенести на другую вкладку"
                        icon={<SwapOutlined />}
                        onClick={() => setMoving(property.code)}
                      />
                    </span>
                  </Dropdown>
                )}
                <ActionIcon
                  title="Изменить свойство"
                  icon={<EditOutlined />}
                  onClick={() => setEdited(property)}
                />
                {/* Системное свойство сервер не даст ни поменять, ни удалить */}
                {property.isBlocked === true ? (
                  <ActionIcon
                    title="Системное свойство: не меняется и не удаляется"
                    icon={<LockOutlined />}
                    isDisabled
                  />
                ) : (
                  <ActionIcon
                    title="Удалить свойство"
                    icon={<DeleteOutlined />}
                    isDanger
                    onClick={() => confirmRemove(property)}
                  />
                )}
              </Space>
            ),
          },
        ]}
      />

      <PropertyDrawer listKey={listKey} property={edited} onClose={() => setEdited(null)} />
    </div>
  );
}
