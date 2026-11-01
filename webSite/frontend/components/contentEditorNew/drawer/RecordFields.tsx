import { useState } from 'react';
import { Badge, Form, Input, Tooltip, Typography } from 'antd';
import { CloudDownloadOutlined, GlobalOutlined } from '@ant-design/icons';
import { slugify } from '../../../logic/slug';
import { CodeInput } from '../ui';
import DomainValues from './DomainValues';
import FieldInput from './FieldInput';
import { FieldType, type EditorFields, type ParentOption, type RecordDraft } from './record';

/**
 * Набор полей формой: подпись, значение, пояснение. Рисует и поля раздела,
 * и поля свойств записи — они описаны одинаково, поэтому и рисуются одним
 * местом, на какой бы вкладке карточки ни стояли.
 * Само значение вводит `FieldInput`, у мультидоменного поля — по строке
 * на домен (`DomainValues`).
 */

export default function RecordFields({
  fields,
  draft,
  isLocked,
  isNew,
  parents,
  markedKeys,
  markNote,
  onChange,
}: {
  fields: EditorFields;
  /** Набранное: поле → значение */
  draft: RecordDraft;
  /** Запись пишется — правки не принимаем */
  isLocked: boolean;
  /** Запись новая: её код сразу собирается из названия */
  isNew?: boolean;
  /** Куда можно перенести запись; нужны только полю «Родитель» */
  parents?: ParentOption[];
  /** Поля с отметкой: их черновик отличается от опубликованного */
  markedKeys?: Set<string>;
  /** Подсказка у отметки: что она значит в показанной версии */
  markNote?: string;
  onChange: (patch: RecordDraft) => void;
}) {
  /**
   * Код из названия: у новой записи — сразу, у сохранённой — только если
   * включат. Её код уже знает сайт, и переименование не должно молча менять
   * адрес. Это состояние поля, а не записи: на сервер оно не уходит.
   */
  const [isCodeAuto, setIsCodeAuto] = useState(isNew === true);

  // Пока код собирается из названия, он идёт за каждой правкой названия
  const change = (patch: RecordDraft) =>
    onChange(
      isCodeAuto && 'code' in fields && typeof patch.name === 'string'
        ? { ...patch, code: slugify(patch.name) }
        : patch,
    );

  const changeCodeAuto = (isAuto: boolean) => {
    setIsCodeAuto(isAuto);
    // Включили — код сразу догоняет название, выключили — остаётся каким был
    if (isAuto) onChange({ code: slugify(String(draft.name ?? '')) });
  };

  return (
    <>
      {Object.entries(fields).map(([key, field]) => (
        <Form.Item
          key={key}
          label={
            <>
              {markedKeys?.has(key) && (
                <Tooltip title={markNote}>
                  <Badge status="warning" style={{ marginInlineEnd: 6 }} />
                </Tooltip>
              )}
              {field.isMultiDomain === true ? (
                <span title="Мультидоменное: значение своё на домен">
                  {field.name}{' '}
                  <Typography.Text type="secondary">
                    <GlobalOutlined />
                  </Typography.Text>
                </span>
              ) : (
                field.name
              )}
              {field.isExternal === true && (
                <Tooltip title="Из внешнего источника: значение пишет другая система">
                  <Typography.Text type="secondary" style={{ marginInlineStart: 6 }}>
                    <CloudDownloadOutlined />
                  </Typography.Text>
                </Tooltip>
              )}
            </>
          }
          required={field.isRequired === true}
          extra={field.note}
        >
          {field.isReadOnly === true ? (
            // Значение такого поля карточка не трогает: показать его нечем,
            // а отправить как есть она отправит
            <Input disabled placeholder="поле этого типа пока не правится" />
          ) : field.type === FieldType.Code ? (
            <CodeInput
              value={String(draft[key] ?? '')}
              isAuto={isCodeAuto}
              isLocked={isLocked}
              onChange={(code) => change({ [key]: code })}
              onAuto={changeCodeAuto}
            />
          ) : field.isMultiDomain === true ? (
            <DomainValues
              field={field}
              value={draft[key]}
              isLocked={isLocked || field.isExternal === true}
              onChange={(value) => change({ [key]: value })}
            />
          ) : (
            <FieldInput
              field={field}
              value={draft[key]}
              isLocked={isLocked || field.isExternal === true}
              parents={parents}
              onChange={(value) => change({ [key]: value })}
            />
          )}
        </Form.Item>
      ))}
    </>
  );
}
