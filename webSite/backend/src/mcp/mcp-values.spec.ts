import { BadRequestException } from '@nestjs/common';
import { PropertyType } from '../infoblocks/settings/properties/property';
import {
  assertFields,
  mergeValues,
  panelFilters,
  recordOut,
  valueFormat,
  valuesOf,
  type PanelProperty,
} from './mcp-values';

const property = (id: number, code: string, type: PropertyType, extra: Partial<PanelProperty> = {}): PanelProperty => ({
  id,
  code,
  name: code,
  hint: '',
  type,
  required: false,
  multiple: false,
  isMultiDomain: false,
  options: [],
  linkList: '',
  columns: null,
  headers: [],
  formats: [],
  maxSizeMb: null,
  ...extra,
});

const PRICE = property(12, 'price', PropertyType.Number);
const BRAND = property(13, 'brand', PropertyType.List, { multiple: true });

describe('mcp-values', () => {
  it('свойства по кодам превращаются в значения по номерам', () => {
    expect(valuesOf([PRICE, BRAND], { price: 1990, brand: [7] })).toEqual([
      { propertyId: 12, value: 1990 },
      { propertyId: 13, value: [7] },
    ]);
  });

  it('незнакомый код — ошибка с перечнем известных', () => {
    expect(() => valuesOf([PRICE], { cost: 1 })).toThrow('Нет свойства «cost». Есть: price');
  });

  it('лишнее поле записи — ошибка, а не тишина', () => {
    expect(() => assertFields({ name: 'A', title: 'B' }, [{ key: 'name', note: '' }])).toThrow(BadRequestException);
  });

  it('правка ложится поверх черновика по номеру свойства', () => {
    expect(
      mergeValues(
        [
          { propertyId: 12, value: 100 },
          { propertyId: 13, value: [1] },
        ],
        [{ propertyId: 12, value: 200 }],
      ),
    ).toEqual([
      { propertyId: 12, value: 200 },
      { propertyId: 13, value: [1] },
    ]);
  });

  it('фильтр по коду свойства уходит в таблицу номером, по полю — как есть', () => {
    expect(
      panelFilters(
        [
          { key: 'price', kind: 'range', from: 1, to: null },
          { key: 'isActive', kind: 'options', codes: ['true'] },
        ],
        [PRICE],
      ),
    ).toEqual([
      { key: 'property-12', kind: 'range', from: 1, to: null },
      { key: 'isActive', kind: 'options', codes: ['true'] },
    ]);
  });

  it('запись отдаётся со свойствами по кодам и черновиком рядом', () => {
    const out = recordOut(
      { id: 5, name: 'Фаркоп', userId: 1 },
      [PRICE],
      [{ propertyId: 12, value: 1990 }],
      {
        recordId: '5',
        fields: { name: 'Фаркоп Bosal' },
        values: [{ propertyId: 12, value: 2100 }],
        isNew: false,
        authorEmail: 'admin@x',
        updatedAt: '2026-10-30T00:00:00.000Z',
      },
    );
    expect(out).toEqual({
      id: 5,
      name: 'Фаркоп',
      properties: { price: 1990 },
      draft: {
        isNew: false,
        fields: { name: 'Фаркоп Bosal' },
        properties: { price: 2100 },
        savedBy: 'admin@x',
        savedAt: '2026-10-30T00:00:00.000Z',
      },
    });
  });

  it('у множественного свойства формат — массив', () => {
    expect(valueFormat(BRAND)).toBe('массив значений, каждое — номер варианта — id из options');
  });
});
