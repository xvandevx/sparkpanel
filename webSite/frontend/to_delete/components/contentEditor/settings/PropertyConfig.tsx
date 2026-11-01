import { Button, Input, InputNumber, Select, Space, Table, Tooltip, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  IMAGE_FORMAT_OPTIONS,
  ListPropertyType,
  TABLE_MAX_COLUMNS,
  optionCodeFromName,
  usePropertyLinkSources,
  useListSettingsFormState,
} from '../../../logic/listSettings';
import styles from '../contentEditor.module.scss';

/**
 * Настройки свойства — у каждого типа свои: варианты списка, форматы и вес
 * файла, разрешение изображения, столбцы таблицы, список-источник привязки.
 * У остальных типов настраивать нечего. Пропс — только какое это свойство.
 */
export default function PropertyConfig({ uid }: { uid: string }) {
  const {
    properties,
    updateProperty,
    addOption,
    updateOption,
    removeOption,
    updateHeader,
  } = useListSettingsFormState();
  const property = properties.find((item) => item.uid === uid);
  // Списки для привязки грузим, только когда её и настраивают
  const linkSources = usePropertyLinkSources(property?.hasLinkSource ?? false);
  if (!property) return null;

  const update = (patch: Parameters<typeof updateProperty>[1]) => updateProperty(uid, patch);
  const isImage = property.type === ListPropertyType.Image;

  if (property.needsOptions) {
    const taken = property.options.map((option) => option.code.trim()).filter(Boolean);

    return (
      <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Название видит редактор в карточке записи, код хранится в значении и уходит на сайт.
          Код подставляется из названия, но его можно задать своим.
        </Typography.Text>

        <Table
          size="small"
          pagination={false}
          // Ключ строки — её место в списке: кода у нового варианта ещё нет
          dataSource={property.options.map((option, index) => ({ ...option, key: index }))}
          locale={{ emptyText: 'Вариантов пока нет' }}
          columns={[
            {
              key: 'name',
              title: 'Название',
              render: (_value, option, index) => (
                <Input
                  value={option.name}
                  placeholder="Новинка"
                  onChange={(event) => {
                    const name = event.target.value;
                    // Код ещё не трогали — собираем его из названия
                    updateOption(uid, index, {
                      name,
                      ...(option.code.trim() ? {} : { code: optionCodeFromName(name, taken) }),
                    });
                  }}
                />
              ),
            },
            {
              key: 'code',
              title: 'Код',
              width: 200,
              render: (_value, option, index) => (
                <Input
                  value={option.code}
                  placeholder="new"
                  onChange={(event) => updateOption(uid, index, { code: event.target.value })}
                />
              ),
            },
            {
              key: 'actions',
              width: 48,
              align: 'right',
              render: (_value, _option, index) => (
                <Tooltip title="Убрать вариант">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    aria-label={`Убрать вариант ${index + 1}`}
                    onClick={() => removeOption(uid, index)}
                  />
                </Tooltip>
              ),
            },
          ]}
        />

        <Button
          size="small"
          icon={<PlusOutlined />}
          style={{ alignSelf: 'flex-start' }}
          onClick={() => addOption(uid)}
        >
          Добавить вариант
        </Button>
      </Space>
    );
  }

  if (property.hasTableConfig) {
    const columns = property.columns ?? 0;

    return (
      <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Задаются только столбцы: строки в карточке записи добавляются сколько нужно.
          Заголовки необязательны — без них таблица будет без шапки.
        </Typography.Text>

        <Space size={8}>
          <Typography.Text>Столбцов:</Typography.Text>
          <InputNumber
            min={1}
            max={TABLE_MAX_COLUMNS}
            value={property.columns}
            style={{ width: 90 }}
            onChange={(next) => update({ columns: typeof next === 'number' ? next : null })}
          />
        </Space>

        <Space orientation="vertical" size={4} style={{ display: 'flex' }}>
          {Array.from({ length: columns }, (_header, index) => (
            <Space.Compact key={index} style={{ width: '100%' }}>
              <Button disabled style={{ width: 110 }}>{`Столбец ${index + 1}`}</Button>
              <Input
                value={property.headers[index] ?? ''}
                placeholder="Без заголовка"
                onChange={(event) => updateHeader(uid, index, event.target.value)}
              />
            </Space.Compact>
          ))}
        </Space>
      </Space>
    );
  }

  if (property.hasLinkSource) {
    return (
      <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          В карточке записи выбирают запись из этого списка. Сам список задаётся здесь —
          так в выборе не окажется чужих записей.
        </Typography.Text>
        <Select
          value={property.linkList}
          style={{ width: '100%' }}
          options={linkSources}
          onChange={(linkList: string) => update({ linkList })}
        />
      </Space>
    );
  }

  if (property.hasFileRules) {
    return (
      <div className={styles.propertyConfig}>
        <Select
          mode={isImage ? 'multiple' : 'tags'}
          size="small"
          value={property.formats}
          // У изображения форматы из списка, у файла — любые расширения
          options={isImage ? IMAGE_FORMAT_OPTIONS : undefined}
          open={isImage ? undefined : false}
          suffixIcon={isImage ? undefined : null}
          tokenSeparators={isImage ? undefined : [',', ' ', '\n']}
          placeholder={isImage ? 'Любой формат изображения' : 'Любой формат: pdf, docx…'}
          style={{ width: '100%' }}
          onChange={(formats: string[]) => update({ formats })}
        />
        <Space size={4} wrap>
          <InputNumber
            size="small"
            min={0.01}
            step={0.5}
            value={property.maxSizeMb}
            placeholder="Вес"
            suffix="МБ"
            style={{ width: 92 }}
            onChange={(maxSizeMb) =>
              update({ maxSizeMb: typeof maxSizeMb === 'number' ? maxSizeMb : null })
            }
          />
          {property.hasResolution && (
            <>
              <InputNumber
                size="small"
                min={1}
                value={property.maxWidth}
                placeholder="Ширина"
                suffix="px"
                style={{ width: 92 }}
                onChange={(maxWidth) =>
                  update({ maxWidth: typeof maxWidth === 'number' ? maxWidth : null })
                }
              />
              <Typography.Text type="secondary">×</Typography.Text>
              <InputNumber
                size="small"
                min={1}
                value={property.maxHeight}
                placeholder="Высота"
                suffix="px"
                style={{ width: 92 }}
                onChange={(maxHeight) =>
                  update({ maxHeight: typeof maxHeight === 'number' ? maxHeight : null })
                }
              />
            </>
          )}
        </Space>
      </div>
    );
  }

  return <Typography.Text type="secondary">—</Typography.Text>;
}
