import { useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Space, Table, TreeSelect, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  IMAGE_FORMAT_OPTIONS,
  PropertyType,
  TABLE_MAX_COLUMNS,
} from '../../../../logic/listSettings';
import { linkSourceTree, withId } from '../../../../logic/contentLinks';
import { slugify } from '../../../../logic/slug';
import type {
  EditorLinkSource,
  EditorOptionSource,
} from '../../../../redux/action-creaters/contentEditorNew';
import type { PropertyDraft } from './property';
import { CodeInput, FORM_LAYOUT } from '../../ui';

/**
 * Параметры, которые есть только у своего типа: варианты «Списка», форматы
 * и вес файла, разрешение изображения, размер таблицы, список-источник
 * привязки, свойство-«Список» у привязки к его значениям. У строки, числа,
 * текста и HTML настраивать нечего.
 */

/**
 * Вариант списка: номер хранится в значении записи, код уходит на сайт,
 * название видит редактор. У нового варианта номера ещё нет — его даст сервер.
 */
interface PropertyOption {
  id?: number;
  code: string;
  name: string;
}

/** Код варианта — как у остальных кодов панели: латиница, цифры и дефис. */
const optionCode = (name: string): string => slugify(name);

const optionsOf = (property: PropertyDraft): PropertyOption[] =>
  Array.isArray(property.options) ? (property.options as PropertyOption[]) : [];

const headersOf = (property: PropertyDraft): string[] =>
  Array.isArray(property.headers) ? (property.headers as string[]) : [];

const formatsOf = (property: PropertyDraft): string[] =>
  Array.isArray(property.formats) ? (property.formats as string[]) : [];

/** У каких типов есть свои параметры: у остальных блок в шторке не показываем. */
const TYPES_WITH_PARAMS: PropertyType[] = [
  PropertyType.List,
  PropertyType.Table,
  PropertyType.ContentLink,
  PropertyType.ListOptionLink,
  PropertyType.File,
  PropertyType.Image,
];

export const hasTypeParams = (type: PropertyType): boolean => TYPES_WITH_PARAMS.includes(type);

export default function PropertyTypeFields({
  property,
  linkSources,
  optionSources,
  onChange,
}: {
  property: PropertyDraft;
  linkSources: EditorLinkSource[];
  /** Свойства-«Списки» — для привязки к значениям списка */
  optionSources: EditorOptionSource[];
  onChange: (patch: Partial<PropertyDraft>) => void;
}) {
  const type = property.type as PropertyType;

  if (type === PropertyType.List) {
    return (
      <OptionList
        options={optionsOf(property)}
        onChange={(options) => onChange({ options })}
      />
    );
  }

  if (type === PropertyType.Table) {
    const headers = headersOf(property);
    const columns = typeof property.columns === 'number' ? property.columns : 0;

    return (
      <Form {...FORM_LAYOUT}>
        <Form.Item
          label="Столбцов в таблице"
          extra="Строки редактор добавляет в карточке записи сколько нужно — задаются только столбцы"
        >
          <InputNumber
            min={1}
            max={TABLE_MAX_COLUMNS}
            value={property.columns as number | null}
            style={{ width: 160 }}
            onChange={(next) => onChange({ columns: typeof next === 'number' ? next : null })}
          />
        </Form.Item>

        <Form.Item
          label="Заголовки столбцов"
          extra="Необязательны: без них таблица в записи будет без шапки"
        >
        <Space orientation="vertical" size={4} style={{ display: 'flex' }}>
          {Array.from({ length: columns }, (_header, index) => (
            <Space.Compact key={index} style={{ width: '100%' }}>
              <Button disabled style={{ width: 110 }}>{`Столбец ${index + 1}`}</Button>
              <Input
                value={headers[index] ?? ''}
                placeholder="Без заголовка"
                onChange={(event) =>
                  onChange({
                    headers: Array.from(
                      { length: columns },
                      (_item, i) => (i === index ? event.target.value : headers[i] ?? ''),
                    ),
                  })
                }
              />
            </Space.Compact>
          ))}
        </Space>
        </Form.Item>
      </Form>
    );
  }

  if (type === PropertyType.ContentLink) {
    return (
      <Form {...FORM_LAYOUT}>
        <Form.Item
          label="Откуда выбирать запись"
          extra="Обязательно: в карточке записи выбирают только из этого списка и грузят только его записи"
        >
          {/* Деревом: типы контента вложены друг в друга, и вложенный тип
              без родителя не узнать. В закрытом поле — полное имя с путём */}
          <TreeSelect
            value={String(property.linkList ?? '') || undefined}
            placeholder="Выберите список"
            treeData={linkSourceTree(linkSources)}
            treeDefaultExpandAll
            treeNodeLabelProp="label"
            showSearch
            treeNodeFilterProp="title"
            style={{ width: '100%' }}
            onChange={(linkList: string) => onChange({ linkList })}
          />
        </Form.Item>
      </Form>
    );
  }

  if (type === PropertyType.ListOptionLink) {
    // Само себе источником свойство быть не может; группы — списки, где свойства заведены
    const groups = Array.from(new Set(optionSources.map((source) => source.listName)));
    return (
      <Form {...FORM_LAYOUT}>
        <Form.Item
          label="Варианты какого списка"
          extra="В карточке записи выбирают из вариантов этого свойства-«Списка». Поменяют в нём варианты — поменяется и выбор здесь"
        >
          <Select
            value={(property.optionsPropertyId as number | null | undefined) ?? undefined}
            placeholder="Выберите свойство-список"
            showSearch
            optionFilterProp="label"
            options={groups.map((listName) => ({
              label: listName,
              options: optionSources
                .filter((source) => source.listName === listName && source.propertyId !== property.id)
                .map((source) => ({ value: source.propertyId, label: withId(source.name, source.propertyId) })),
            }))}
            onChange={(optionsPropertyId: number) => onChange({ optionsPropertyId })}
          />
        </Form.Item>
      </Form>
    );
  }

  if (type === PropertyType.File || type === PropertyType.Image) {
    const isImage = type === PropertyType.Image;

    return (
      <Form {...FORM_LAYOUT}>
        <Form.Item
          label="Допустимые форматы"
          extra={
            isImage
              ? 'Расширения, которые примет поле; пусто — любое изображение'
              : 'Расширения, которые примет поле: введите своё и нажмите Enter. Пусто — любой файл'
          }
        >
        <Select
          mode={isImage ? 'multiple' : 'tags'}
          value={formatsOf(property)}
          // У изображения форматы из списка, у файла — любые расширения
          options={isImage ? IMAGE_FORMAT_OPTIONS : undefined}
          open={isImage ? undefined : false}
          suffixIcon={isImage ? undefined : null}
          tokenSeparators={isImage ? undefined : [',', ' ', '\n']}
          placeholder={isImage ? 'Любой формат изображения' : 'Любой формат: pdf, docx…'}
          style={{ width: '100%' }}
          onChange={(formats: string[]) => onChange({ formats })}
        />
        </Form.Item>

        <Form.Item
          label="Наибольший вес"
          extra="Файл тяжелее редактор не примет; пусто — без ограничения"
        >
          <InputNumber
            min={0.01}
            step={0.5}
            value={property.maxSizeMb as number | null}
            placeholder="Без ограничения"
            suffix="МБ"
            style={{ width: 200 }}
            onChange={(maxSizeMb) =>
              onChange({ maxSizeMb: typeof maxSizeMb === 'number' ? maxSizeMb : null })
            }
          />
        </Form.Item>

        {isImage && (
          <Form.Item
            label="Наибольшее разрешение"
            extra="Картинку больше редактор не примет; пусто — без ограничения"
          >
            <Space size={8} wrap>
              <InputNumber
                min={1}
                value={property.maxWidth as number | null}
                placeholder="Ширина"
                suffix="px"
                style={{ width: 140 }}
                onChange={(maxWidth) =>
                  onChange({ maxWidth: typeof maxWidth === 'number' ? maxWidth : null })
                }
              />
              <Typography.Text type="secondary">×</Typography.Text>
              <InputNumber
                min={1}
                value={property.maxHeight as number | null}
                placeholder="Высота"
                suffix="px"
                style={{ width: 140 }}
                onChange={(maxHeight) =>
                  onChange({ maxHeight: typeof maxHeight === 'number' ? maxHeight : null })
                }
              />
            </Space>
          </Form.Item>
        )}
      </Form>
    );
  }

  return null;
}

/**
 * Варианты «Списка»: номер, название и код, у кода — кнопка «из названия».
 * У нового варианта она нажата сразу, у сохранённого — только если включат:
 * его код уже знает сайт, и переименование не должно молча его менять.
 * Записи хранят номер варианта, поэтому смена кода выбранное у них не стирает.
 */
function OptionList({
  options,
  onChange,
}: {
  options: PropertyOption[];
  onChange: (options: PropertyOption[]) => void;
}) {
  // Нажата ли кнопка — своё у каждой строки, по её месту в списке, как и ключ
  // строки. Это состояние полей, а не вариантов: на сервер оно не уходит
  const [isAutoRows, setIsAutoRows] = useState<boolean[]>(() =>
    options.map((option) => option.code.trim() === ''),
  );

  const changeOption = (index: number, patch: Partial<PropertyOption>) =>
    onChange(options.map((option, i) => (i === index ? { ...option, ...patch } : option)));

  const changeCodeAuto = (index: number, isAuto: boolean) => {
    setIsAutoRows((prev) => options.map((_option, i) => (i === index ? isAuto : prev[i] === true)));
    // Включили — код сразу догоняет название, выключили — остаётся каким был
    if (isAuto) changeOption(index, { code: optionCode(options[index].name) });
  };

  const add = () => {
    setIsAutoRows((prev) => [...prev, true]);
    onChange([...options, { code: '', name: '' }]);
  };

  const remove = (index: number) => {
    setIsAutoRows((prev) => prev.filter((_item, i) => i !== index));
    onChange(options.filter((_item, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-4">
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        Из этих вариантов выбирают в карточке записи. Название видит редактор, код
        уходит на сайт, а запись хранит ID варианта — поэтому код можно менять,
        выбранное у записей останется. Код собирается из названия латиницей, пока
        нажата кнопка рядом с ним, — отожмите её, чтобы задать свой.
      </Typography.Text>

      <Table
        size="small"
        pagination={false}
        // Колонки без ширины делят остаток поровну: название и код одной ширины
        tableLayout="fixed"
        // Ключ строки — её место в списке: номера у нового варианта ещё нет
        dataSource={options.map((option, index) => ({ ...option, key: index }))}
        locale={{ emptyText: 'Вариантов пока нет' }}
        columns={[
          {
            key: 'id',
            title: 'ID',
            width: 64,
            // Номер даёт сервер при сохранении свойства: у нового варианта пусто
            render: (_value: unknown, option: PropertyOption) => (
              <Typography.Text type="secondary">{option.id ?? '—'}</Typography.Text>
            ),
          },
          {
            key: 'name',
            title: 'Название',
            render: (_value: unknown, option: PropertyOption, index: number) => (
              <Input
                value={option.name}
                placeholder="Новинка"
                onChange={(event) => {
                  const name = event.target.value;
                  changeOption(
                    index,
                    isAutoRows[index] === true ? { name, code: optionCode(name) } : { name },
                  );
                }}
              />
            ),
          },
          {
            key: 'code',
            title: 'Код',
            render: (_value: unknown, option: PropertyOption, index: number) => (
              <CodeInput
                value={option.code}
                isAuto={isAutoRows[index] === true}
                placeholder="new"
                onChange={(code) => changeOption(index, { code })}
                onAuto={(isAuto) => changeCodeAuto(index, isAuto)}
              />
            ),
          },
          {
            key: 'actions',
            width: 48,
            render: (_value: unknown, _option: PropertyOption, index: number) => (
              <Button
                type="text"
                size="small"
                danger
                title="Убрать вариант"
                icon={<DeleteOutlined />}
                onClick={() => remove(index)}
              />
            ),
          },
        ]}
      />

      <div>
        <Button size="small" icon={<PlusOutlined />} onClick={add}>
          Добавить вариант
        </Button>
      </div>
    </div>
  );
}
