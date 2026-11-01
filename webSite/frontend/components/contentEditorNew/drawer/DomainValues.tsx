import type { CSSProperties } from 'react';
import { Button, Select, theme, Typography } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  domainLabels,
  freeDomainOptions,
  uncoveredDomainIds,
  useDomainOptions,
  type DomainValue,
} from '../../../logic/domains';
import FieldInput from './FieldInput';
import { draftValueOf, singleOf, type EditorField } from './record';

/**
 * Мультидоменное поле — маленькой таблицей «Домены | Значение». Первая
 * строка — для всех доменов: она есть всегда, и домены без уникального
 * значения берут её; в её выборе доменов — «кроме»: домены, на которые общее
 * значение не распространяется (подпись «Все домены» — текстом, под ней
 * выбор «кроме»). Ниже — уникальные значения, каждое сразу
 * для одного или нескольких доменов и поддоменов. Уникальное значение у домена
 * одно, а в «кроме» может стоять и домен с уникальным: оно сильнее общего,
 * исключение срабатывает там, где уникального нет.
 *
 * Выбор доменов во всех строках один и тот же — множественный `Select`,
 * поэтому строки одной высоты и читаются одинаково. Таблица в своей рамке:
 * без неё строки сливаются с соседними полями карточки. Цвета — токены темы.
 *
 * Под каждой строкой — подсказка, где действует её значение, а в подвале —
 * домены, на которых значения не будет вовсе: их легко не заметить, исключив
 * домен из общего и не задав ему уникальное.
 *
 * Значение в черновике — список строк (`DomainValue[]`), общая первой;
 * у только что добавленной строки доменов ещё нет (`domainIds: []`),
 * и пока их не выберут, на сервер она не уйдёт.
 */

/** Колонки: домены, значение, «убрать» — одни на все строки, чтобы значения стояли ровно. */
const COLUMNS: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '260px minmax(0, 1fr) 32px',
  columnGap: 8,
  alignItems: 'start',
  padding: '8px 8px 8px 12px',
};

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

  const replace = (index: number, patch: Partial<DomainValue>) =>
    onChange(rows.map((row, at) => (at === index ? { ...row, ...patch } : row)));

  // Уникальное значение у домена одно: занятый другой строкой второй раз не выбрать.
  // Исключение общего домен не занимает — «всем, кроме msk, а msk своё» законно
  const ownIds = rows.slice(1).flatMap((row) => row.domainIds ?? []);
  const isAllTaken = freeDomainOptions(options, ownIds, []).length === 0;

  const uncovered = domainLabels(
    options,
    uncoveredDomainIds(rows, options.map((option) => option.value)),
  );

  const divider = `1px solid ${token.colorBorderSecondary}`;
  // Подсказки мельче значений: это пояснение к полю, а не его содержимое
  const hint = { display: 'block', marginTop: 4, fontSize: token.fontSizeSM };
  const domainSelect = {
    mode: 'multiple' as const,
    maxTagCount: 'responsive' as const,
    loading: isLoading,
    disabled: isLocked,
    showSearch: true,
    optionFilterProp: 'label',
    notFoundContent: isLoading ? 'Загружаем домены…' : 'Свободных доменов нет',
  };

  return (
    <div style={{ border: divider, borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
      <div style={{ ...COLUMNS, background: token.colorFillAlter, paddingBlock: 6 }}>
        <Typography.Text strong>Домены</Typography.Text>
        <Typography.Text strong>Значение</Typography.Text>
      </div>

      {rows.map((row, index) => (
        <div key={index} style={{ ...COLUMNS, borderTop: divider }}>
          {index === 0 ? (
            // Строка общая — это подпись, а не выбор; выбирают под ней только исключения
            <div className="flex flex-col gap-2">
              <Typography.Text style={{ lineHeight: '32px', paddingInlineStart: 12 }}>
                Все домены
              </Typography.Text>
              <Select
                {...domainSelect}
                prefix={<Typography.Text type="secondary">кроме</Typography.Text>}
                placeholder="не выбрано"
                value={except}
                options={options}
                onChange={(exceptDomainIds: number[]) => replace(0, { exceptDomainIds })}
              />
            </div>
          ) : (
            <Select
              {...domainSelect}
              placeholder="Выберите домены"
              value={row.domainIds ?? []}
              options={freeDomainOptions(options, ownIds, row.domainIds ?? [])}
              onChange={(domainIds: number[]) => replace(index, { domainIds })}
            />
          )}
          <div className="min-w-0">
            <FieldInput
              field={single}
              value={row.value}
              isLocked={isLocked}
              onChange={(next) => replace(index, { value: next })}
            />
            <Typography.Text type="secondary" style={hint}>
              {index === 0
                ? except.length === 0
                  ? 'Действует на всех доменах. Чтобы какие-то домены его не получали, выберите их в «кроме» слева'
                  : 'Действует на всех доменах, кроме выбранных слева. На них значения не будет, если не задать уникальное'
                : (row.domainIds ?? []).length === 0
                  ? 'Выберите слева домены — на них это значение заменит общее'
                  : `Действует на ${domainLabels(options, row.domainIds ?? []).join(', ')} вместо общего значения`}
            </Typography.Text>
          </div>
          {/* Общее значение не убирают: без него доменам не на что опереться */}
          {index > 0 && (
            <Button
              type="text"
              icon={<DeleteOutlined />}
              disabled={isLocked}
              title="Убрать уникальное значение"
              onClick={() => onChange(rows.filter((_, at) => at !== index))}
            />
          )}
        </div>
      ))}

      <div
        className="flex flex-wrap items-center justify-between gap-x-4"
        style={{ borderTop: divider, padding: '4px 12px 4px 4px' }}
      >
        <Button
          type="link"
          icon={<PlusOutlined />}
          disabled={isLocked || isLoading || isAllTaken}
          title={isAllTaken && !isLoading ? 'Свободных доменов не осталось' : undefined}
          onClick={() => onChange([...rows, { domainIds: [], value: draftValueOf(undefined, single) }])}
        >
          Добавить уникальное значение для домена
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
