import { BadRequestException } from '@nestjs/common';
import { FilterKind, type RecordValues } from '../infoblocks/records/records-page';
import { PropertyType } from '../infoblocks/settings/properties/property';
import {
  apiValue,
  apiValues,
  domainValue,
  facetOf,
  parseApiFilters,
  parseExpand,
  type ApiPropertyDef,
  type ValueContext,
} from './external-values';

const property = (patch: Partial<ApiPropertyDef>): ApiPropertyDef => ({
  id: 1,
  code: 'prop',
  name: 'Свойство',
  hint: '',
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
  optionsPropertyId: null,
  ...patch,
});

const brand = property({
  id: 4,
  code: 'brand',
  type: PropertyType.List,
  options: [
    { id: 10, code: 'bosch', name: 'Bosch' },
    { id: 11, code: 'thule', name: 'Thule' },
  ],
});
const price = property({ id: 5, code: 'price', type: PropertyType.Number });
const categories = property({ id: 6, code: 'categories', type: PropertyType.ContentLink, multiple: true, linkList: 'product-categories' });
const photo = property({ id: 7, code: 'photo', type: PropertyType.Image });

const context: ValueContext = {
  files: new Map([[41, { id: 41, name: 'Фото', url: 'http://site/uploads/41.jpg', mimeType: 'image/jpeg', size: 10, isExternal: false }]]),
  linkNames: new Map([['product-categories/3', 'Фаркопы']]),
  expanded: new Map(),
};

describe('domainValue', () => {
  const groups = [
    { domainIds: null, value: 'общее', exceptDomainIds: [3] },
    { domainIds: [2], value: 'ekb' },
  ];

  it('без домена — общее значение', () => expect(domainValue(groups, null)).toBe('общее'));
  it('уникальное значение домена сильнее общего', () => expect(domainValue(groups, 2)).toBe('ekb'));
  it('на домен из «кроме» общее не действует', () => expect(domainValue(groups, 3)).toBeNull());
  it('обычное значение — как есть', () => expect(domainValue('просто', 2)).toBe('просто'));
});

describe('apiValue', () => {
  it('«Список» — кодом варианта', () => expect(apiValue(brand, 11, context)).toBe('thule'));
  it('изображение — файлом с адресом', () => expect(apiValue(photo, 41, context)).toMatchObject({ id: 41, url: 'http://site/uploads/41.jpg' }));
  it('внешнее изображение — той же формой, без номера', () =>
    expect(apiValue(photo, 'https://old.site/upload/logo.png', context)).toEqual({
      id: null,
      name: 'logo.png',
      url: 'https://old.site/upload/logo.png',
      mimeType: null,
      size: null,
      isExternal: true,
    }));
  it('привязка — списком, номером и названием', () =>
    expect(apiValue(categories, [{ listKey: 'product-categories', recordId: '3' }], context)).toEqual([
      { list: 'product-categories', id: 3, name: 'Фаркопы' },
    ]));
  it('пустое — null, у множественного — []', () => {
    expect(apiValue(price, undefined, context)).toBeNull();
    expect(apiValue(categories, undefined, context)).toEqual([]);
  });
});

describe('apiValue с expand', () => {
  const towbar = { id: 3, code: 'towbars', name: 'Фаркопы', properties: { photo: null } };
  const expanded: ValueContext = { ...context, expanded: new Map([[6, new Map([['product-categories/3', towbar]])]]) };
  const links = [
    { listKey: 'product-categories', recordId: '3' },
    { listKey: 'product-categories', recordId: '9' },
  ];

  it('раскрытая привязка — записью целиком, нет записи — привязкой, порядок прежний', () =>
    expect(apiValue(categories, links, expanded)).toEqual([towbar, { list: 'product-categories', id: 9, name: null }]));

  it('одиночная — объектом', () =>
    expect(apiValue({ ...categories, multiple: false }, links[0], expanded)).toBe(towbar));

  it('свойство не из expand — привязкой, даже если запись раскрыта для другого', () =>
    expect(apiValue({ ...categories, id: 60, multiple: false }, links[0], expanded)).toEqual({ list: 'product-categories', id: 3, name: 'Фаркопы' }));
});

describe('parseExpand', () => {
  const roles = property({ id: 9, code: 'role', type: PropertyType.ContentLink, linkList: 'roles' });
  const type = property({ id: 12, code: 'type', type: PropertyType.ContentTypeLink });
  const properties = [brand, categories, roles, type];
  const targets = new Set(['product-categories', 'contents']);

  it('коды через запятую — в свойства, повторы и пробелы не мешают', () =>
    expect(parseExpand(' categories, type,categories', properties, targets)).toEqual([categories, type]));

  it('пусто — ничего не раскрывать', () => expect(parseExpand('', properties, targets)).toEqual([]));

  it('неизвестный код, не привязка и привязка к списку не из API — 400', () => {
    expect(() => parseExpand('nope', properties, targets)).toThrow(BadRequestException);
    expect(() => parseExpand('brand', properties, targets)).toThrow(BadRequestException);
    expect(() => parseExpand('role', properties, targets)).toThrow(BadRequestException);
  });
});

describe('apiValues', () => {
  it('мультидоменное — значением домена, чужие свойства отбрасываются', () => {
    const city = property({ id: 8, code: 'city', isMultiDomain: true });
    const stored: RecordValues = new Map([
      ['1', new Map<number, unknown>([[8, [{ domainIds: null, value: 'Москва' }, { domainIds: [2], value: 'Екатеринбург' }]], [99, 'скрытое']])],
    ]);
    expect(apiValues(stored, [city], 2).get('1')).toEqual(new Map([[8, 'Екатеринбург']]));
  });
});

describe('parseApiFilters', () => {
  const properties = [brand, price, categories, photo];

  it('«Список» — коды вариантов в их номера', () =>
    expect(parseApiFilters({ brand: 'bosch,thule' }, properties)).toEqual([
      { propertyId: 4, filter: { key: 'property-4', kind: FilterKind.Options, codes: ['10', '11'] } },
    ]));

  it('число — диапазон из [gte] и [lte]', () =>
    expect(parseApiFilters({ price: { gte: '1000' } }, properties)[0].filter).toEqual({
      key: 'property-5',
      kind: FilterKind.Range,
      from: 1000,
      to: null,
    }));

  it('привязка — номера записей в ключи «список/запись»', () =>
    expect(parseApiFilters({ categories: ['3', '4'] }, properties)[0].filter).toMatchObject({ codes: ['product-categories/3', 'product-categories/4'] }));

  it('у привязки — ещё и номера записей для отбора в базе, у остальных их нет', () => {
    const [categories, brand] = parseApiFilters({ categories: '3, 4', brand: 'bosch' }, properties);
    expect(categories.linkIds).toEqual(['3', '4']);
    expect(brand.linkIds).toBeUndefined();
  });

  it('неизвестное свойство и нефильтруемый тип — 400', () => {
    expect(() => parseApiFilters({ nope: '1' }, properties)).toThrow(BadRequestException);
    expect(() => parseApiFilters({ photo: '1' }, properties)).toThrow(BadRequestException);
    expect(() => parseApiFilters({ price: { gte: 'много' } }, properties)).toThrow(BadRequestException);
  });
});

describe('facetOf', () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const values: RecordValues = new Map([
    ['1', new Map<number, unknown>([[4, 10], [5, 1990]])],
    ['2', new Map<number, unknown>([[4, 10], [5, 48900]])],
    ['3', new Map<number, unknown>([[4, 11]])],
  ]);

  it('«Список» — каждый вариант со счётчиком', () =>
    expect(facetOf(brand, rows, values, new Map())).toEqual({
      type: 'list',
      values: [
        { value: 'bosch', label: 'Bosch', count: 2 },
        { value: 'thule', label: 'Thule', count: 1 },
      ],
    }));

  it('число — min и max', () => expect(facetOf(price, rows, values, new Map())).toEqual({ type: 'number', min: 1990, max: 48900 }));
});
