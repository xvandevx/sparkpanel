import { InfoblockPropertyDto } from '../settings/properties/property.dto';
import { PropertyType, normalizeValues } from '../settings/properties/property';
import { PropertyValue } from './property-values.model';
import { valueRows, valuesMap } from './property-values.service';

const property = (patch: Partial<InfoblockPropertyDto>): InfoblockPropertyDto =>
  ({
    id: 4,
    code: 'title',
    name: 'Заголовок',
    type: PropertyType.String,
    tab: '',
    required: false,
    multiple: false,
    isMultiDomain: false,
    isHidden: false,
    isExternal: false,
    options: [],
    formats: [],
    maxSizeMb: null,
    maxWidth: null,
    maxHeight: null,
    columns: null,
    headers: [],
    linkList: '',
    ...patch,
  }) as InfoblockPropertyDto;

/** Строки, как их вернула бы база: `valueRows` плюс номер строки. */
const stored = (rows: ReturnType<typeof valueRows>): PropertyValue[] =>
  rows.map((row, index) => ({ id: index + 1, ...row }) as unknown as PropertyValue);

describe('мультидоменные значения в строках базы', () => {
  it('группы раскладываются по строкам и собираются обратно', () => {
    const badge = property({
      code: 'badge',
      type: PropertyType.List,
      multiple: true,
      isMultiDomain: true,
      options: [{ id: 7, code: 'hit', name: 'Хит' }, { id: 8, code: 'new', name: 'Новинка' }],
    });
    const value = [
      { domainIds: null, value: [7, 8], exceptDomainIds: [5] },
      { domainIds: [2, 3], value: [8] },
    ];

    const rows = valueRows([badge], { badge: value }, 12);
    expect(rows.map((row) => [row.sort, row.domainIds, row.exceptDomainIds, row.optionId])).toEqual([
      [0, null, [5], 7],
      [1, null, [5], 8],
      [2, [2, 3], null, 8],
    ]);

    const back = valuesMap([badge], stored(rows));
    expect(normalizeValues([badge], back, false).values.badge).toEqual(value);
  });

  it('пустое общее не пишется строкой, уникальные остаются', () => {
    const title = property({ isMultiDomain: true });
    const rows = valueRows([title], { title: [{ domainIds: null, value: null }, { domainIds: [2], value: 'b' }] }, 12);
    expect(rows).toHaveLength(1);
    expect(normalizeValues([title], valuesMap([title], stored(rows)), false).values.title).toEqual([
      { domainIds: null, value: null },
      { domainIds: [2], value: 'b' },
    ]);
  });

  it('флаг выключили — читается только общее, уникальные лежат до включения', () => {
    const multi = property({ isMultiDomain: true });
    const rows = stored(
      valueRows([multi], { title: [{ domainIds: null, value: 'a' }, { domainIds: [2], value: 'b' }] }, 12),
    );
    expect(valuesMap([property({})], rows)).toEqual({ title: 'a' });
    expect(valuesMap([multi], rows).title).toEqual([
      { domainIds: null, value: 'a', exceptDomainIds: [] },
      { domainIds: [2], value: 'b' },
    ]);
  });

  it('строки, сохранённые до флага, становятся общим значением', () => {
    const plain = stored(valueRows([property({})], { title: 'старое' }, 12));
    const multi = property({ isMultiDomain: true });
    expect(normalizeValues([multi], valuesMap([multi], plain), false).values.title).toEqual([
      { domainIds: null, value: 'старое' },
    ]);
  });
});
