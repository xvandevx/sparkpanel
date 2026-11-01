import { BadRequestException } from '@nestjs/common';
import { PropertyType } from '../settings/properties/property';
import {
  FilterKind,
  pageRecords,
  parseFilters,
  withDrafts,
  withEditedAt,
  type PageQuery,
  type PageRow,
  type RecordValues,
} from './records-page';

// 1 Главная ─ 2 Новости ─ 3 Акция
//           └ 4 Каталог
// 5 Лендинг
// 6 Блог ─ 7 Зима
const rows = [
  { id: 1, parentId: null, name: 'Главная', isActive: true },
  { id: 2, parentId: 1, name: 'Новости', isActive: true },
  { id: 3, parentId: 2, name: 'Акция', isActive: false },
  { id: 4, parentId: 1, name: 'Каталог', isActive: true },
  { id: 5, parentId: null, name: 'Лендинг', isActive: false },
  { id: 6, parentId: null, name: 'Блог', isActive: true },
  { id: 7, parentId: 6, name: 'Зима', isActive: true },
];

const query = (patch: Partial<PageQuery> = {}): PageQuery => ({
  page: 1,
  pageSize: 20,
  search: '',
  searchIn: ['name'],
  sort: null,
  isDescending: false,
  isTree: false,
  filters: [],
  ...patch,
});

const noValues: RecordValues = new Map();
const ids = (items: { id: number }[]) => items.map((item) => item.id);

describe('страница плоского списка', () => {
  it('режет записи по размеру страницы и считает их все', () => {
    const page = pageRecords(rows, query({ page: 2, pageSize: 3 }), [], noValues);
    expect(ids(page.items)).toEqual([4, 5, 6]);
    expect(page.total).toBe(7);
  });

  it('сортирует по полю, номер — числом', () => {
    expect(ids(pageRecords(rows, query({ sort: 'name' }), [], noValues).items)).toEqual([3, 6, 1, 7, 4, 5, 2]);
    expect(ids(pageRecords(rows, query({ sort: 'id', isDescending: true }), [], noValues).items)[0]).toBe(7);
  });
});

describe('страница дерева', () => {
  it('размер страницы — записи верхнего уровня, каждая со всей веткой', () => {
    const first = pageRecords(rows, query({ isTree: true, pageSize: 2 }), [], noValues);
    expect(ids(first.items)).toEqual([1, 2, 3, 4, 5]);
    expect(first.total).toBe(3);

    const second = pageRecords(rows, query({ isTree: true, pageSize: 2, page: 2 }), [], noValues);
    expect(ids(second.items)).toEqual([6, 7]);
  });

  it('сортировка — среди соседей на каждом уровне', () => {
    const page = pageRecords(rows, query({ isTree: true, sort: 'name' }), [], noValues);
    expect(ids(page.items)).toEqual([6, 7, 1, 4, 2, 3, 5]);
  });

  it('запись с потерянным родителем встаёт наверх, кольцо не зацикливает', () => {
    const broken = [
      { id: 1, parentId: 9 },
      { id: 2, parentId: 3 },
      { id: 3, parentId: 2 },
    ];
    const page = pageRecords(broken, query({ isTree: true }), [], noValues);
    expect(ids(page.items)).toEqual([1, 2, 3]);
    expect(page.total).toBe(2);
  });

  it('найденное — плоским списком, даже если таблица — дерево', () => {
    const page = pageRecords(rows, query({ isTree: true, search: 'а' }), [], noValues);
    expect(ids(page.items)).toEqual([1, 3, 4, 7]);
    expect(page.total).toBe(4);
  });
});

describe('поиск и фильтр', () => {
  it('номер записи — целиком, с решёткой или без', () => {
    expect(ids(pageRecords(rows, query({ search: '#3' }), [], noValues).items)).toEqual([3]);
  });

  it('логическое поле — выбором true/false, текстовое — подстрокой', () => {
    const inactive = pageRecords(
      rows,
      query({ filters: [{ key: 'isActive', kind: FilterKind.Options, codes: ['false'] }] }),
      [],
      noValues,
    );
    expect(ids(inactive.items)).toEqual([3, 5]);

    const text = pageRecords(
      rows,
      query({ filters: [{ key: 'name', kind: FilterKind.Text, text: 'ЛЕН' }] }),
      [],
      noValues,
    );
    expect(ids(text.items)).toEqual([5]);
  });

  it('по свойствам: вариант, привязка, число, HTML, заполненность, мультидоменное', () => {
    const properties = [
      { id: 10, type: PropertyType.List },
      { id: 11, type: PropertyType.ContentLink, isMultiDomain: false },
      { id: 12, type: PropertyType.Number },
      { id: 13, type: PropertyType.Html },
      { id: 14, type: PropertyType.Image },
      { id: 15, type: PropertyType.String, isMultiDomain: true },
    ];
    const values: RecordValues = new Map([
      [
        '1',
        new Map<number, unknown>([
          [10, 7],
          [11, [{ listKey: 'roles', recordId: '2' }]],
          [12, 150],
          [13, '<p>Летняя <b>распродажа</b></p>'],
          [14, 31],
          [15, [{ domainIds: null, value: 'общий' }, { domainIds: [3], value: 'екатеринбург' }]],
        ]),
      ],
      ['2', new Map<number, unknown>([[12, 50]])],
    ]);
    const only = (filter: Parameters<typeof query>[0]) =>
      ids(pageRecords(rows, query(filter), properties, values).items);

    expect(only({ filters: [{ key: 'property-10', kind: FilterKind.Options, codes: ['7'] }] })).toEqual([1]);
    expect(only({ filters: [{ key: 'property-11', kind: FilterKind.Options, codes: ['roles/2'] }] })).toEqual([1]);
    expect(only({ filters: [{ key: 'property-12', kind: FilterKind.Range, from: 100, to: null }] })).toEqual([1]);
    expect(only({ filters: [{ key: 'property-12', kind: FilterKind.Range, from: null, to: 100 }] })).toEqual([2]);
    // Подстрока — в тексте, а не в тегах
    expect(only({ filters: [{ key: 'property-13', kind: FilterKind.Text, text: 'летняя распродажа' }] })).toEqual([1]);
    expect(only({ filters: [{ key: 'property-13', kind: FilterKind.Text, text: '<b>' }] })).toEqual([]);
    expect(only({ filters: [{ key: 'property-14', kind: FilterKind.Filled, isFilled: false }] })).toEqual([
      2, 3, 4, 5, 6, 7,
    ]);
    expect(only({ filters: [{ key: 'property-15', kind: FilterKind.Text, text: 'екат' }] })).toEqual([1]);
    // Свойство удалили — поле фильтра ничего не находит
    expect(only({ filters: [{ key: 'property-99', kind: FilterKind.Text, text: 'а' }] })).toEqual([]);
  });
});

describe('фильтр из запроса', () => {
  it('разбирает поля всех видов', () => {
    expect(
      parseFilters(
        JSON.stringify([
          { key: 'isActive', kind: 'options', codes: ['true'] },
          { key: 'name', kind: 'text', text: 'фар' },
          { key: 'property-2', kind: 'range', from: 1, to: null },
          { key: 'property-3', kind: 'filled', isFilled: true },
        ]),
      ),
    ).toHaveLength(4);
    expect(parseFilters(undefined)).toEqual([]);
  });

  it('непонятное — 400', () => {
    expect(() => parseFilters('{')).toThrow(BadRequestException);
    expect(() => parseFilters('{}')).toThrow(BadRequestException);
    expect(() => parseFilters('[{"key":"name","kind":"text"}]')).toThrow(BadRequestException);
    expect(() => parseFilters('[{"key":"x","kind":"range","from":"1"}]')).toThrow(BadRequestException);
  });
});

describe('«Изменено» с правкой свойств', () => {
  const rows = [
    { id: 1, updatedAt: '2026-10-01T10:00:00.000Z' },
    { id: 2, updatedAt: '2026-10-05T10:00:00.000Z' },
    { id: 3, updatedAt: '2026-10-05T10:00:00.000Z' },
  ];
  const editedAt = new Map([
    ['1', new Date('2026-10-03T10:00:00.000Z')],
    ['2', new Date('2026-10-02T10:00:00.000Z')],
  ]);

  it('берёт позднее из правки записи и правки свойств', () => {
    expect(withEditedAt(rows, editedAt).map((row) => row.updatedAt)).toEqual([
      '2026-10-03T10:00:00.000Z',
      '2026-10-05T10:00:00.000Z',
      '2026-10-05T10:00:00.000Z',
    ]);
  });

  it('у записи без своей даты — дата правки свойств', () => {
    expect(withEditedAt<PageRow>([{ id: 1 }], editedAt)[0].updatedAt).toBe('2026-10-03T10:00:00.000Z');
  });
});

describe('черновики поверх опубликованного', () => {
  const values: RecordValues = new Map([['2', new Map<number, unknown>([[4, 'Белый']])]]);
  const drafts = [
    { recordId: '2', fields: { name: 'Свежие новости', parentId: '6', id: 99 }, values: [{ propertyId: 4, value: 'Чёрный' }] },
    { recordId: '5', fields: {}, values: [{ propertyId: 4, value: 'Серый' }] },
  ];

  it('поля черновика — поверх записи, номер и родитель — опубликованные', () => {
    const drafted = withDrafts(rows, values, drafts).rows.find((row) => row.id === 2);
    expect(drafted).toEqual({ id: 2, parentId: 1, name: 'Свежие новости', isActive: true });
  });

  it('свойства черновика — поверх значений, в том числе у записи без значений', () => {
    const merged = withDrafts(rows, values, drafts).values;
    expect(merged.get('2')?.get(4)).toBe('Чёрный');
    expect(merged.get('5')?.get(4)).toBe('Серый');
    // Опубликованные значения не трогаются: их отдают карточке как есть
    expect(values.get('2')?.get(4)).toBe('Белый');
  });

  it('по черновику ищут', () => {
    const drafted = withDrafts(rows, values, drafts);
    const page = pageRecords(drafted.rows, query({ search: 'свежие' }), [], drafted.values);
    expect(page.items.map((row) => row.id)).toEqual([2]);
  });
});
