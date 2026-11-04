import { Button, Input, InputNumber, Select, Space, Switch, TreeSelect } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { FileField } from './file';
import { HtmlField } from './html';
import LinkField from './LinkField';
import TableField from './TableField';
import { FieldType, isFileField, type EditorField, type ParentOption } from './record';

/**
 * Ввод значения одного поля: одно поле ввода по типу, а у множественного —
 * по полю на значение. Им рисуются и поля карточки, и каждая строка
 * мультидоменного поля — у строки домена значение то же, что у обычного поля.
 *
 * У множественного свойства значений столько, сколько завели: каждое — своим
 * полем с крестиком, внизу «Добавить значение». Списком выбора это не сделать
 * (там выбирают из готовых вариантов), а одним текстом через перевод строки —
 * значит заставлять человека помнить про невидимое правило.
 */
export default function FieldInput({
  field,
  value,
  isLocked,
  parents,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  isLocked: boolean;
  /** Куда можно перенести запись; нужны только полю «Родитель» */
  parents?: ParentOption[];
  onChange: (value: unknown) => void;
}) {
  return isRepeated(field) ? (
    <ValueList field={field} values={asList(value)} isLocked={isLocked} onChange={onChange} />
  ) : (
    <Control field={field} value={value} isLocked={isLocked} parents={parents} onChange={onChange} />
  );
}

/**
 * Несколько значений одного свойства: по полю на значение. Порядок строк — он
 * же порядок значений, поэтому новое добавляется в конец, а не в начало.
 */
function ValueList({
  field,
  values,
  isLocked,
  onChange,
}: {
  field: EditorField;
  values: unknown[];
  isLocked: boolean;
  onChange: (values: unknown[]) => void;
}) {
  // Пустое поле показываем всегда: значение набирают в нём, а не после того,
  // как догадаются нажать «Добавить»
  const rows = values.length > 0 ? values : [emptyValue(field)];

  const replace = (index: number, value: unknown) =>
    onChange(rows.map((item, at) => (at === index ? value : item)));

  return (
    <Space orientation="vertical" size={8} style={{ display: 'flex' }}>
      {rows.map((value, index) => (
        <Space.Compact key={index} style={{ width: '100%' }}>
          <Control
            field={field}
            value={value}
            isLocked={isLocked}
            onChange={(next) => replace(index, next)}
          />
          {/* Крестик без красноты: убрать одно значение — не то же самое,
              что удалить запись, и кричать об этом не надо */}
          <Button
            icon={<DeleteOutlined />}
            disabled={isLocked}
            title="Убрать значение"
            onClick={() => onChange(rows.filter((_, at) => at !== index))}
          />
        </Space.Compact>
      ))}

      <Button
        icon={<PlusOutlined />}
        disabled={isLocked}
        onClick={() => onChange([...rows, emptyValue(field)])}
      >
        Добавить значение
      </Button>
    </Space>
  );
}

/** Одно поле ввода по типу свойства. */
function Control({
  field,
  value,
  isLocked,
  parents,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  isLocked: boolean;
  parents?: ParentOption[];
  onChange: (value: unknown) => void;
}) {
  if (isFileField(field)) {
    // Несколько файлов поле файла держит само: превью, загрузка, выбор из загруженных
    return <FileField field={field} value={value} isLocked={isLocked} onChange={onChange} />;
  }

  if (field.type === FieldType.Link) {
    // Записи для выбора поле привязки грузит само — при каждом показе карточки
    return <LinkField field={field} value={value} isLocked={isLocked} onChange={onChange} />;
  }

  if (field.type === FieldType.Html) {
    return <HtmlField field={field} value={value} isLocked={isLocked} onChange={onChange} />;
  }

  if (field.type === FieldType.Table) {
    return <TableField field={field} value={value} isLocked={isLocked} onChange={onChange} />;
  }

  if (field.type === FieldType.Switch) {
    return (
      <Switch checked={value === true} disabled={isLocked} onChange={(checked) => onChange(checked)} />
    );
  }

  if (field.type === FieldType.Parent) {
    // Деревом, как записи лежат в таблице: «Новости» под «Главной» иначе
    // не отличить от «Новостей» в корне
    return (
      <TreeSelect
        value={String(value ?? '')}
        treeData={parents ?? []}
        treeDefaultExpandAll
        disabled={isLocked}
        showSearch
        treeNodeFilterProp="title"
        onChange={(next) => onChange(next)}
      />
    );
  }

  if (field.type === FieldType.Number) {
    return (
      <InputNumber
        value={value as number | null}
        disabled={isLocked}
        style={{ width: '100%' }}
        onChange={(next) => onChange(next ?? null)}
      />
    );
  }

  if (field.type === FieldType.List) {
    // Выбор из вариантов множественность умеет сам: добавлять поля не нужно
    return (
      <Select
        value={value as number | number[] | null}
        mode={field.isMultiple === true ? 'multiple' : undefined}
        allowClear
        disabled={isLocked}
        options={(field.options ?? []).map((option) => ({
          value: option.id,
          label: option.name,
        }))}
        onChange={(next) => onChange(next ?? null)}
      />
    );
  }

  if (field.type === FieldType.Password) {
    // Браузер не должен подставлять сюда пароль от панели
    return (
      <Input.Password
        value={String(value ?? '')}
        disabled={isLocked}
        autoComplete="new-password"
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (field.type === FieldType.Text) {
    return (
      <Input.TextArea
        value={String(value ?? '')}
        rows={8}
        disabled={isLocked}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      value={String(value ?? '')}
      disabled={isLocked}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

/** Пустое значение нужного вида: у числа это «ничего», у остального — пустая строка. */
const emptyValue = (field: EditorField): unknown => (field.type === FieldType.Number ? null : '');

/**
 * Поле, у которого значений несколько и каждое набирают отдельно. Список,
 * файл и привязка множественность умеют сами: выбирают из готового, а не набирают.
 */
const isRepeated = (field: EditorField): boolean =>
  field.isMultiple === true &&
  field.type !== FieldType.List &&
  field.type !== FieldType.Link &&
  !isFileField(field);

/** Значение множественного поля всегда список — даже если пришло одно. */
const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : value === null || value === undefined || value === '' ? [] : [value];
