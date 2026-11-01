import { Button, Input, theme, Typography } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import FilterButton from './FilterButton';
import FilterChip from './FilterChip';
import { activeFilterEntries } from './columnFilter';
import type { useFilters } from './useFilters';

/**
 * Плашка над таблицей: поиск, под ним строка фильтра — «Фильтр», чип на каждое
 * поле набора и «Добавить условие». Всё, что отбирает строки таблицы, собрано
 * в одном месте и отделено фоном от шапки с кнопками.
 *
 * Отбирает таблица сразу, по мере выбора: записи уже на клиенте, кнопка
 * «Применить» только заставила бы лишний раз нажимать.
 */
export default function FilterPanel({
  searchHint,
  query,
  onQuery,
  filter,
}: {
  /** Подсказка в строке поиска; null — искать не по чему, строки нет */
  searchHint: string | null;
  /** Что набрано в поиске */
  query: string;
  onQuery: (query: string) => void;
  /** Фильтр списка; null — фильтровать не по чему, строки фильтра нет */
  filter: ReturnType<typeof useFilters> | null;
}) {
  const { token } = theme.useToken();

  if (searchHint === null && filter === null) return null;

  // Сбрасывать нечего, пока ничего не набрано и ни в одном поле ничего не выбрано
  const isResettable =
    query !== '' || (filter !== null && activeFilterEntries(filter.entries).length > 0);
  const reset = () => {
    onQuery('');
    filter?.reset();
  };

  return (
    <div
      className="flex flex-col gap-3"
      style={{
        padding: token.paddingSM,
        background: token.colorFillAlter,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadiusLG,
      }}
    >
      {searchHint !== null && (
        <Input
          allowClear
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          prefix={<SearchOutlined />}
          placeholder={searchHint}
        />
      )}

      {filter !== null && (
        <div className="flex flex-wrap items-center gap-2">
          <Typography.Text type="secondary" className="mr-1">
            <FilterOutlined /> Фильтр
          </Typography.Text>
          {filter.entries.map(({ filter: columnFilter, field }) => (
            <FilterChip
              key={field.key}
              filter={columnFilter}
              field={field}
              onChange={filter.change}
              onRemove={() => filter.remove(field.key)}
            />
          ))}
          <FilterButton fields={filter.fields} keys={filter.keys} onToggle={filter.toggle} />
          {isResettable && (
            <Button type="link" className="ml-auto" onClick={reset}>
              Сбросить
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
