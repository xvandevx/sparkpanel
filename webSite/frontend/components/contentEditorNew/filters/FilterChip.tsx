import { useMemo, useState } from 'react';
import { Button, Checkbox, Input, InputNumber, Popover, Radio, Typography } from 'antd';
import { CloseOutlined, DownOutlined, SearchOutlined } from '@ant-design/icons';
import {
  linkListOf,
  useLinkTargets,
  type LinkOption,
  type LinkOptionGroup,
} from '../../../logic/contentLinks';
import type { TableColumn } from '../table/columns';
import {
  emptyFilter,
  filterOptions,
  filterSummary,
  FilterKind,
  optionGroups,
  type ColumnFilter,
} from './columnFilter';

/** Сколько вариантов показываем без поиска: дальше список уже листают, а не читают. */
const SEARCH_FROM = 8;

/**
 * Чип поля фильтра: имя поля, а если в нём что-то выбрано — и выбранное
 * («Активность: Да»). Выбранное подсвечено, пустое поле — пунктиром, так сразу
 * видно, что отбирает таблицу. Крестик на чипе очищает выбранное, само поле
 * остаётся; клик по чипу открывает выбор, а в нём — «Убрать из фильтра».
 *
 * Выбор отбирает таблицу сразу, по мере выбора: «Готово» только закрывает окно.
 */
export default function FilterChip({
  filter,
  field,
  onChange,
  onRemove,
}: {
  filter: ColumnFilter;
  /** Колонка, по которой фильтруют */
  field: TableColumn;
  onChange: (filter: ColumnFilter) => void;
  /** Убрать поле из фильтра — у всех */
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Записи для привязки читаются, только если фильтруют по привязке, и только её списка
  const { targets, isLoading } = useLinkTargets(field.property ? [linkListOf(field.property)] : []);
  const options = useMemo(() => filterOptions(field, targets), [field, targets]);

  const summary = filterSummary(filter, options);
  const isActive = summary !== null;

  const content = (
    <div className="flex flex-col gap-3" style={{ width: 260 }}>
      <FilterControl filter={filter} options={options} isLoading={isLoading} onChange={onChange} />
      <div className="flex items-center justify-between">
        <Button
          type="link"
          size="small"
          style={{ paddingInline: 0 }}
          onClick={() => {
            setIsOpen(false);
            onRemove();
          }}
        >
          Убрать из фильтра
        </Button>
        <Button type="primary" size="small" onClick={() => setIsOpen(false)}>
          Готово
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      trigger="click"
      placement="bottomLeft"
      arrow={false}
      title={field.name}
      open={isOpen}
      onOpenChange={setIsOpen}
      content={content}
      destroyOnHidden
    >
      <Button
        shape="round"
        color={isActive ? 'primary' : 'default'}
        variant={isActive ? 'filled' : 'dashed'}
        iconPlacement="end"
        icon={
          isActive ? (
            <CloseOutlined
              role="button"
              aria-label="Очистить"
              title="Очистить"
              style={{ fontSize: 10 }}
              onClick={(event) => {
                // Крестик очищает поле, а не открывает выбор
                event.stopPropagation();
                onChange(emptyFilter(field));
              }}
            />
          ) : (
            <DownOutlined style={{ fontSize: 10 }} />
          )
        }
      >
        {isActive ? (
          <span>
            {field.name}: <strong>{summary}</strong>
          </span>
        ) : (
          field.name
        )}
      </Button>
    </Popover>
  );
}

/**
 * Выбор в поле — по его виду: галочки вариантов (подходит запись хоть с одним),
 * подстрока, диапазон числа или «заполнено ли».
 */
function FilterControl({
  filter,
  options,
  isLoading,
  onChange,
}: {
  filter: ColumnFilter;
  options: (LinkOption | LinkOptionGroup)[];
  isLoading: boolean;
  onChange: (filter: ColumnFilter) => void;
}) {
  switch (filter.kind) {
    case FilterKind.Options:
      return (
        <OptionsControl
          options={options}
          codes={filter.codes}
          isLoading={isLoading}
          onChange={(codes) => onChange({ ...filter, codes })}
        />
      );
    case FilterKind.Text:
      return (
        <Input
          autoFocus
          allowClear
          value={filter.text}
          placeholder="Содержит"
          onChange={(event) => onChange({ ...filter, text: event.target.value })}
        />
      );
    case FilterKind.Range:
      return (
        <div className="flex items-center gap-2">
          <InputNumber
            autoFocus
            value={filter.from}
            placeholder="от"
            style={{ flex: 1 }}
            onChange={(from) => onChange({ ...filter, from: typeof from === 'number' ? from : null })}
          />
          —
          <InputNumber
            value={filter.to}
            placeholder="до"
            style={{ flex: 1 }}
            onChange={(to) => onChange({ ...filter, to: typeof to === 'number' ? to : null })}
          />
        </div>
      );
    case FilterKind.Filled:
      return (
        <Radio.Group
          className="flex flex-col gap-2"
          value={filter.isFilled === null ? 'any' : filter.isFilled ? 'filled' : 'empty'}
          options={[
            { value: 'any', label: 'Не важно' },
            { value: 'filled', label: 'Заполнено' },
            { value: 'empty', label: 'Не заполнено' },
          ]}
          onChange={(event) =>
            onChange({
              ...filter,
              isFilled: event.target.value === 'any' ? null : event.target.value === 'filled',
            })
          }
        />
      );
  }
}

/**
 * Варианты галочками; у длинного списка — поиск. Записи из дерева (марка → модель →
 * кузов) стоят лесенкой, и галочка у родителя ставит и снимает всю его ветку:
 * отметили «Kia» — подходят товары с любым кузовом Kia. В поиске найденное
 * подписано путём — без лесенки «Седан» не отличить от «Седана» другой модели.
 */
function OptionsControl({
  options,
  codes,
  isLoading,
  onChange,
}: {
  options: (LinkOption | LinkOptionGroup)[];
  codes: string[];
  isLoading: boolean;
  onChange: (codes: string[]) => void;
}) {
  const [search, setSearch] = useState('');

  const groups = optionGroups(options);
  const total = groups.reduce((count, group) => count + group.options.length, 0);
  const needle = search.trim().toLowerCase();
  const shown = groups
    .map((group) => ({
      ...group,
      options: group.options.filter((option) =>
        (option.path ?? option.label).toLowerCase().includes(needle),
      ),
    }))
    .filter((group) => group.options.length > 0);

  if (isLoading) return <Typography.Text type="secondary">Загружаем записи…</Typography.Text>;
  if (total === 0) return <Typography.Text type="secondary">Выбрать не из чего</Typography.Text>;

  const toggle = (option: LinkOption, isChecked: boolean) => {
    const branch = [option.value, ...(option.descendants ?? [])];
    // Сняли модель — с марки отметка тоже снимается: её ветка уже отмечена не вся
    const ancestors = groups
      .flatMap((group) => group.options)
      .filter((item) => (item.descendants ?? []).includes(option.value))
      .map((item) => item.value);
    onChange(
      isChecked
        ? Array.from(new Set([...codes, ...branch]))
        : codes.filter((code) => !branch.includes(code) && !ancestors.includes(code)),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {total > SEARCH_FROM && (
        <Input
          autoFocus
          allowClear
          size="small"
          prefix={<SearchOutlined />}
          placeholder="Найти вариант"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      )}
      <div className="flex flex-col gap-2" style={{ maxHeight: 280, overflowY: 'auto' }}>
        {shown.length === 0 && <Typography.Text type="secondary">Ничего не нашлось</Typography.Text>}
        {shown.map((group) => (
          <div key={group.label ?? ''} className="flex flex-col gap-2">
            {group.label !== null && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {group.label}
              </Typography.Text>
            )}
            {group.options.map((option) => (
              <Checkbox
                key={option.value}
                checked={codes.includes(option.value)}
                // Отмечена только часть ветки — у родителя полугалочка
                indeterminate={
                  !codes.includes(option.value) &&
                  (option.descendants ?? []).some((code) => codes.includes(code))
                }
                // Лесенка — только без поиска: там найденное подписано путём
                style={{ marginLeft: needle === '' ? (option.depth ?? 0) * 20 : 0 }}
                onChange={(event) => toggle(option, event.target.checked)}
              >
                {needle === '' ? option.label : (option.path ?? option.label)}
              </Checkbox>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
