import { useState } from 'react';
import { Button, Checkbox, Input, InputNumber, Select, Table, Tooltip } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import {
  PROPERTY_TYPE_OPTIONS,
  useListSettingsFormState,
  type ListPropertyType,
} from '../../../logic/listSettings';
import PropertyActions from './PropertyActions';
import PropertyConfigDialog from './PropertyConfigDialog';
import TabBindingDialog from './TabBindingDialog';

/**
 * Свойства списка таблицей: каждая строка правится на месте. Код сохранённого
 * свойства закрыт — по нему хранятся значения записей.
 *
 * Параметры типа и вкладка карточки в строке не показываются: и то, и другое
 * открывается отдельным окном из меню строки — колонки под них занимали место
 * у каждого свойства, а трогают их редко.
 *
 * Порядок полей в карточке задаёт колонка «Сортировка»: число вместо стрелок
 * «выше / ниже» — свойство сразу встаёт куда нужно, а не за несколько нажатий.
 */
export default function PropertiesTable() {
  const { properties, addProperty, updateProperty } = useListSettingsFormState();
  /** Какое свойство настраивается в окне параметров; null — окно закрыто */
  const [configUid, setConfigUid] = useState<string | null>(null);
  /** Какому свойству меняют вкладку; null — окно закрыто */
  const [rebindUid, setRebindUid] = useState<string | null>(null);

  return (
    <>
      <Table
        rowKey="uid"
        size="small"
        pagination={false}
        // На узком экране таблица прокручивается вбок, а не сминает поля
        scroll={{ x: 960 }}
        dataSource={properties}
        locale={{ emptyText: 'Свойств пока нет — у записей только поля раздела' }}
        columns={[
          {
            key: 'name',
            title: 'Название',
            width: 200,
            render: (_, property) => (
              <Input
                value={property.name}
                placeholder="Цена"
                onChange={(event) => updateProperty(property.uid, { name: event.target.value })}
              />
            ),
          },
          {
            key: 'code',
            title: 'Код',
            width: 150,
            render: (_, property) => (
              <Tooltip
                title={
                  property.saved
                    ? 'Код сохранённого свойства не меняется: по нему хранятся значения'
                    : undefined
                }
              >
                <Input
                  value={property.code}
                  placeholder="price"
                  disabled={property.saved}
                  onChange={(event) => updateProperty(property.uid, { code: event.target.value })}
                />
              </Tooltip>
            ),
          },
          {
            key: 'type',
            title: 'Тип',
            width: 190,
            render: (_, property) => (
              <Select
                value={property.type}
                style={{ width: '100%' }}
                optionLabelProp="label"
                popupMatchSelectWidth={false}
                onChange={(type: ListPropertyType) => updateProperty(property.uid, { type })}
                options={PROPERTY_TYPE_OPTIONS.map((option) => ({
                  value: option.value,
                  label: option.label,
                  title: option.description,
                }))}
              />
            ),
          },
          {
            key: 'required',
            title: 'Обязательное',
            width: 100,
            align: 'center',
            render: (_, property) => (
              <Checkbox
                checked={property.required}
                onChange={(event) => updateProperty(property.uid, { required: event.target.checked })}
              />
            ),
          },
          {
            key: 'multiple',
            title: 'Множественное',
            width: 130,
            align: 'center',
            render: (_, property) => (
              <Tooltip
                title={
                  property.canBeMultiple
                    ? undefined
                    : 'У таблицы строки и так добавляются сколько угодно'
                }
              >
                <Checkbox
                  checked={property.multiple}
                  disabled={!property.canBeMultiple}
                  onChange={(event) =>
                    updateProperty(property.uid, { multiple: event.target.checked })
                  }
                />
              </Tooltip>
            ),
          },
          {
            key: 'sort',
            title: 'Сортировка',
            width: 110,
            align: 'center',
            render: (_, property) => (
              <InputNumber
                value={property.sort}
                min={0}
                step={10}
                style={{ width: '100%' }}
                aria-label={`Сортировка свойства «${property.name}»`}
                onChange={(sort) =>
                  updateProperty(property.uid, { sort: typeof sort === 'number' ? sort : 0 })
                }
              />
            ),
          },
          {
            key: 'actions',
            width: 80,
            align: 'right',
            render: (_, property) => (
              <PropertyActions
                uid={property.uid}
                onConfigure={() => setConfigUid(property.uid)}
                onRebind={() => setRebindUid(property.uid)}
              />
            ),
          },
        ]}
      />
      <Button
        icon={<PlusOutlined />}
        onClick={addProperty}
        style={{ alignSelf: 'flex-start', marginTop: 12 }}
      >
        Добавить свойство
      </Button>

      <PropertyConfigDialog uid={configUid} onClose={() => setConfigUid(null)} />
      <TabBindingDialog uid={rebindUid} onClose={() => setRebindUid(null)} />
    </>
  );
}
