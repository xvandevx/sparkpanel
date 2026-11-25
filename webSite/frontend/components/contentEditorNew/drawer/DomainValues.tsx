import { useState, type CSSProperties } from 'react';
import { Button, Select, Tag, theme, Typography } from 'antd';
import { DeleteOutlined, DownOutlined, GlobalOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons';
import {
  domainLabels,
  freeDomainOptions,
  uncoveredDomainIds,
  useDomainOptions,
  type DomainValue,
} from '../../../logic/domains';
import FieldInput from './FieldInput';
import { draftValueOf, singleOf, type EditorField } from './record';
import { valuePreview } from './valuePreview';

/**
 * Мультидоменное поле — список значений со свёрткой. Каждое значение —
 * строка: слева, для каких доменов, справа — само значение одной строкой.
 * Раскрыта одна: в ней выбор доменов и поле ввода во всю ширину, остальные
 * свёрнуты — тяжёлые поля (HTML, таблица) не стоят стопкой друг под другом.
 *
 * Первая строка — общее значение, для всех доменов: она есть всегда, и домены
 * без уникального значения берут её; у неё вместо доменов — «кроме»: домены,
 * на которые общее значение не распространяется. Ниже — уникальные значения,
 * каждое сразу для одного или нескольких доменов и поддоменов. Уникальное
 * значение у домена одно, а в «кроме» может стоять и домен с уникальным:
 * оно сильнее общего, исключение срабатывает там, где уникального нет.
 *
 * В подвале — домены, на которых значения не будет вовсе: их легко
 * не заметить, исключив домен из общего и не задав ему уникальное.
 *
 * Значение в черновике — список строк (`DomainValue[]`), общая первой;
 * у только что добавленной строки доменов ещё нет (`domainIds: []`),
 * и пока их не выберут, на сервер она не уйдёт.
 */
export default function DomainValues({
  field,
  value,
  isLocked,
  onChange,
}: {
  field: EditorField;
  value: unknown;
  isLocked: boolean;
  onChange: (value: DomainValue[]) => void;
}) {
  const { token } = theme.useToken();
  const { options, isLoading } = useDomainOptions();
  const single = singleOf(field);
  const rows = (value as DomainValue[] | undefined) ?? [];
  const except = rows[0]?.exceptDomainIds ?? [];

  // Какая строка раскрыта; сначала — общее значение
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const replace = (index: number, patch: Partial<DomainValue>) =>
    onChange(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  const add = () => {
    onChange([...rows, { domainIds: [], value: draftValueOf(undefined, single) }]);
    setOpenIndex(rows.length);
  };

  const removeRow = (index: number) => {
    onChange(rows.filter((_, at) => at !== index));
    setOpenIndex(null);
  };

  // Уникальное значение у домена одно: занятый другой строкой второй раз не выбрать.
  // Исключение общего домен не занимает — «всем, кроме msk, а msk своё» законно
  const ownIds = rows.slice(1).flatMap((row) => row.domainIds ?? []);
  const isAllTaken = freeDomainOptions(options, ownIds, []).length === 0;

  const uncovered = domainLabels(
    options,
    uncoveredDomainIds(rows, options.map((option) => option.value)),
  );

  const divider = `1px solid ${token.colorBorderSecondary}`;
  const header: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '220px minmax(0, 1fr) 16px',
    alignItems: 'center',
    columnGap: 16,
    width: '100%',
    padding: '10px 12px',
    border: 0,
    background: 'transparent',
    textAlign: 'left',
    font: 'inherit',
    color: token.colorText,
    cursor: 'pointer',
  };
  const muted = { color: token.colorTextSecondary, fontSize: token.fontSizeSM };
  const domainSelect = {
    mode: 'multiple' as const,
    maxTagCount: 'responsive' as const,
    loading: isLoading,
    disabled: isLocked,
    showSearch: true,
    optionFilterProp: 'label',
    notFoundContent: isLoading ? 'Загружаем домены…' : 'Свободных доменов нет',
    style: { width: 360 },
  };

  return (
    <div style={{ border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
      {rows.map((row, index) => {
        const isCommon = index === 0;
        const isOpen = openIndex === index;
        const ids = row.domainIds ?? [];
        const preview = valuePreview(single, row.value);

        return (
          <div
            key={index}
            style={{ borderTop: index > 0 ? divider : undefined, background: isOpen ? token.colorFillAlter : undefined }}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              style={header}
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              {/* Для каких доменов значение: общее — подписью, уникальное — метками */}
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                {isCommon ? (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                      <GlobalOutlined style={{ color: token.colorTextSecondary }} />
                      Все домены
                    </span>
                    <span style={muted}>
                      {except.length === 0 ? 'общее значение' : `кроме ${domainLabels(options, except).join(', ')}`}
                    </span>
                  </>
                ) : ids.length === 0 ? (
                  <Typography.Text type="warning">Домены не выбраны</Typography.Text>
                ) : (
                  <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {domainLabels(options, ids).map((label) => (
                      <Tag key={label} color="blue" style={{ marginInlineEnd: 0 }}>
                        {label}
                      </Tag>
                    ))}
                  </span>
                )}
              </span>

              {/* Свёрнутая — значение одной строкой, раскрытая — где оно действует */}
              <span
                style={{
                  ...(isOpen ? muted : { color: preview ? token.colorTextSecondary : token.colorTextQuaternary }),
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {isOpen ? openHint(isCommon, except.length > 0) : preview || 'Пусто'}
              </span>

              {isOpen ? (
                <DownOutlined style={{ fontSize: 12, color: token.colorTextSecondary }} />
              ) : (
                <RightOutlined style={{ fontSize: 12, color: token.colorTextSecondary }} />
              )}
            </button>

            {isOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 12px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Typography.Text type="secondary">{isCommon ? 'Кроме' : 'Домены'}</Typography.Text>
                  {isCommon ? (
                    <Select
                      {...domainSelect}
                      placeholder="не выбрано"
                      value={except}
                      options={options}
                      onChange={(exceptDomainIds: number[]) => replace(0, { exceptDomainIds })}
                    />
                  ) : (
                    <Select
                      {...domainSelect}
                      placeholder="Выберите домены"
                      value={ids}
                      options={freeDomainOptions(options, ownIds, ids)}
                      onChange={(domainIds: number[]) => replace(index, { domainIds })}
                    />
                  )}
                  {/* Общее значение не убирают: без него доменам не на что опереться */}
                  {!isCommon && (
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      disabled={isLocked}
                      style={{ marginLeft: 'auto' }}
                      onClick={() => removeRow(index)}
                    >
                      Убрать значение
                    </Button>
                  )}
                </div>
                <FieldInput
                  field={single}
                  value={row.value}
                  isLocked={isLocked}
                  onChange={(next) => replace(index, { value: next })}
                />
              </div>
            )}
          </div>
        );
      })}

      <div
        className="flex flex-wrap items-center justify-between gap-x-4"
        style={{ borderTop: divider, padding: '4px 12px 4px 4px' }}
      >
        <Button
          type="link"
          icon={<PlusOutlined />}
          disabled={isLocked || isLoading || isAllTaken}
          title={isAllTaken && !isLoading ? 'Свободных доменов не осталось' : undefined}
          onClick={add}
        >
          Значение для домена
        </Button>
        {uncovered.length > 0 && (
          <Typography.Text type="warning" style={{ fontSize: token.fontSizeSM }}>
            Без значения: {uncovered.join(', ')}
          </Typography.Text>
        )}
      </div>
    </div>
  );
}

/**
 * Где действует значение раскрытой строки — вместо его превью, одной строкой.
 * Что исключённые домены остались без значения, говорит подвал поля.
 */
const openHint = (isCommon: boolean, hasExcept: boolean): string =>
  isCommon
    ? hasExcept
      ? 'Действует на всех доменах, кроме выбранных'
      : 'Действует на всех доменах, где нет своего значения'
    : 'Заменяет общее значение на выбранных доменах';
