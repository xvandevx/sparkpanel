import { useCallback, useRef } from 'react';
import { Input, InputNumber, Select, Switch, Typography, Upload, type InputRef } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { TextAreaRef } from 'antd/es/input/TextArea';
import {
  EditorFieldType,
  fieldOptions,
  groupOptions,
  htmlBlockToken,
  isSearchable,
  insertToken,
  useEditorForm,
  variableToken,
} from '../../../logic/editorForm';
import styles from '../editorForm.module.scss';
import { MediaField } from '../media';
import { MultiValueField } from '../multi';
import { RichTextField } from '../richText';
import { TableField } from '../table';
import FieldLinks from './FieldLinks';
import HtmlBlocks from './HtmlBlocks';
import VariablePreview from './VariablePreview';
import VariableTags from './VariableTags';

/** Типы, которым множественность рисует общий список значений. */
const MULTI_VALUE_TYPES: EditorFieldType[] = [
  EditorFieldType.Text,
  EditorFieldType.Textarea,
  EditorFieldType.Number,
  EditorFieldType.Html,
  EditorFieldType.RichText,
];

/**
 * Одно поле формы. Компонент получает только ключ поля — всё остальное
 * (описание, значение, обработчик) берёт из состояния формы.
 */
export default function EditorField({ fieldKey }: { fieldKey: string }) {
  const { fields, values, setFieldValue } = useEditorForm();
  const field = fields.find((item) => item.key === fieldKey);

  const inputRef = useRef<InputRef>(null);
  const textAreaRef = useRef<TextAreaRef>(null);
  /** Где стоял курсор в момент клика по переменной или выбора блока — туда и вставляем */
  const cursorRef = useRef<number | null>(null);

  const rememberCursor = useCallback(
    (event: { currentTarget: { selectionStart: number | null } }) => {
      cursorRef.current = event.currentTarget.selectionStart;
    },
    [],
  );

  /** Вставка маркера — переменной `#NAME#` или HTML-блока `#BLOCK:код#` — в позицию курсора */
  const insert = useCallback(
    (token: string) => {
      const current = String(values[fieldKey] ?? '');
      const { text, cursor } = insertToken(current, cursorRef.current, token);
      setFieldValue(fieldKey, text);
      cursorRef.current = cursor;

      // Поле перерисуется с новым значением — курсор возвращаем после этого,
      // иначе он уедет в конец строки и вставлять дальше будет неудобно.
      requestAnimationFrame(() => {
        const node =
          inputRef.current?.input ?? textAreaRef.current?.resizableTextArea?.textArea ?? null;
        node?.focus();
        node?.setSelectionRange(cursor, cursor);
      });
    },
    [fieldKey, setFieldValue, values],
  );

  if (!field) return null;

  const value = values[fieldKey];
  const disabled = field.disabled?.(values) ?? false;
  const asText = String(value ?? '');

  const control = () => {
    // Выбор и медиатека умеют несколько значений сами; у остальных типов
    // множественность — это список полей с «добавить» и «убрать»
    if (field.multiple && MULTI_VALUE_TYPES.includes(field.type)) {
      return <MultiValueField fieldKey={fieldKey} />;
    }

    switch (field.type) {
      case EditorFieldType.ReadOnly:
        return (
          <Typography.Text type="secondary" className={styles.mono}>
            {asText || '—'}
          </Typography.Text>
        );

      case EditorFieldType.Switch:
        return (
          <Switch
            checked={value !== false}
            disabled={disabled}
            onChange={(checked) => setFieldValue(fieldKey, checked)}
          />
        );

      case EditorFieldType.Number: {
        // Пустое «не указано» есть только у nullable-поля; у порядка и счётчиков это 0
        const empty = field.nullable ? null : 0;
        return (
          <InputNumber
            value={typeof value === 'number' ? value : empty}
            min={field.min ?? 0}
            disabled={disabled}
            placeholder={field.placeholder}
            onChange={(next) => setFieldValue(fieldKey, typeof next === 'number' ? next : empty)}
          />
        );
      }

      case EditorFieldType.Select: {
        const options = fieldOptions(field, values);
        const toOption = (option: (typeof options)[number]) => ({
          value: option.value,
          label: option.label,
          title: option.description,
        });
        return (
          <Select
            mode={field.multiple ? 'multiple' : undefined}
            value={
              field.multiple
                ? Array.isArray(value)
                  ? (value as string[])
                  : []
                : value === null || value === undefined
                  ? undefined
                  : String(value)
            }
            disabled={disabled}
            // Выбор, который можно оставить пустым, сбрасывается обратно в «не выбрано»
            allowClear={field.nullable && !field.required}
            placeholder={field.placeholder}
            style={{ width: '100%' }}
            optionLabelProp="label"
            showSearch={isSearchable(options) ? { optionFilterProp: 'label' } : undefined}
            onChange={(next) => setFieldValue(fieldKey, next ?? null)}
            options={groupOptions(options).map(({ group, options: items }) =>
              group === null
                ? items.map(toOption)
                : [{ label: group, title: group, options: items.map(toOption) }],
            ).flat()}
          />
        );
      }

      case EditorFieldType.Tags:
        return (
          <Select
            mode="tags"
            value={Array.isArray(value) ? (value as string[]) : []}
            disabled={disabled}
            placeholder={field.placeholder}
            style={{ width: '100%' }}
            // Список вводят по одному значению: Enter, запятая или пробел заканчивают ввод
            tokenSeparators={[',', ' ', '\n']}
            open={false}
            suffixIcon={null}
            onChange={(next: string[]) => setFieldValue(fieldKey, next)}
          />
        );

      case EditorFieldType.File: {
        const chosen = Array.isArray(value) ? (value as File[]) : [];
        return (
          <Upload.Dragger
            multiple={field.multiple}
            disabled={disabled}
            fileList={chosen.map((file, index) => ({
              uid: `${index}-${file.name}`,
              name: file.name,
              status: 'done' as const,
            }))}
            // Отдавать файл на сервер — дело сохранения формы, а не поля:
            // `false` отключает штатную загрузку antd, файл остаётся значением.
            beforeUpload={(_file, fileList) => {
              setFieldValue(
                fieldKey,
                field.multiple ? [...chosen, ...(fileList as File[])] : [fileList[0] as File],
              );
              return false;
            }}
            onRemove={(removed) =>
              setFieldValue(
                fieldKey,
                chosen.filter((file, index) => `${index}-${file.name}` !== removed.uid),
              )
            }
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              {field.placeholder ?? 'Перетащите файлы сюда или нажмите, чтобы выбрать'}
            </p>
          </Upload.Dragger>
        );
      }

      case EditorFieldType.Password:
        return (
          <Input.Password
            value={asText}
            disabled={disabled}
            placeholder={field.placeholder}
            autoComplete="new-password"
            onChange={(event) => setFieldValue(fieldKey, event.target.value)}
          />
        );

      case EditorFieldType.Links:
        return <FieldLinks links={field.links} emptyText={field.placeholder} />;

      case EditorFieldType.Media:
        return <MediaField fieldKey={fieldKey} />;

      case EditorFieldType.RichText:
        return <RichTextField fieldKey={fieldKey} />;

      case EditorFieldType.Table:
        return <TableField fieldKey={fieldKey} />;

      case EditorFieldType.Textarea:
      case EditorFieldType.Html:
        return (
          <Input.TextArea
            ref={textAreaRef}
            value={asText}
            rows={field.rows ?? 3}
            disabled={disabled}
            placeholder={field.placeholder}
            // Разметку читают по тегам — моноширинный шрифт держит их в столбик
            className={field.type === EditorFieldType.Html ? styles.mono : undefined}
            onSelect={rememberCursor}
            onChange={(event) => {
              cursorRef.current = event.target.selectionStart;
              setFieldValue(fieldKey, event.target.value);
            }}
          />
        );

      default:
        return (
          <Input
            ref={inputRef}
            value={asText}
            disabled={disabled}
            placeholder={field.placeholder}
            onSelect={rememberCursor}
            onChange={(event) => {
              cursorRef.current = event.target.selectionStart;
              setFieldValue(fieldKey, event.target.value);
            }}
          />
        );
    }
  };

  return (
    <div className={styles.field}>
      <label className={field.required ? styles.required : undefined}>{field.label}</label>
      <div>
        {control()}
        {field.variables && (
          <>
            <VariableTags
              variables={field.variables}
              onInsert={(name) => insert(variableToken(name))}
            />
            <VariablePreview template={asText} variables={field.variables} />
          </>
        )}
        {/* У визуального редактора вставка блоков своя — в позицию его курсора */}
        {field.htmlBlocks && field.type !== EditorFieldType.RichText && (
          <HtmlBlocks
            html={asText}
            blocks={field.htmlBlocks}
            disabled={disabled}
            onInsert={(code) => insert(htmlBlockToken(code))}
          />
        )}
        {field.note && (
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
            {field.note}
          </Typography.Text>
        )}
      </div>
    </div>
  );
}
