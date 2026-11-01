import { PropertyType } from '../infoblocks/settings/properties/property';
import { FIXED_LISTS } from './api-lists';
import { buildSpec } from './openapi-spec';

type Schema = Record<string, any>;

const products = FIXED_LISTS.find((list) => list.listKey === 'products')!;
const color = {
  id: 4,
  code: 'color',
  name: 'Цвет',
  hint: '',
  type: PropertyType.List,
  multiple: false,
  isMultiDomain: false,
  options: [{ id: 7, code: 'black', name: 'Чёрный' }],
} as never;

const spec = buildSpec({ serverUrl: 'http://site/api/v1', siteName: 'Сайт', lists: [{ list: products, properties: [color] }] }) as Schema;

describe('спецификация: запись', () => {
  it('у списка есть методы записи с пометкой о праве', () => {
    const paths = spec.paths as Schema;
    expect(Object.keys(paths['/catalog/products/items'])).toEqual(['get', 'post']);
    expect(Object.keys(paths['/catalog/products/items/{idOrCode}'])).toEqual(['get', 'patch', 'delete']);
    expect(Object.keys(paths['/catalog/products/items/external/{externalId}'])).toEqual(['get', 'put', 'delete']);
    expect(paths['/catalog/products/items/batch'].post.description).toMatch(/^\*\*Нужен ключ с правом записи/);
    expect(paths['/catalog/products/items/external/{externalId}'].get.description).not.toMatch(/Нужен ключ/);
  });

  it('тело upsert — без внешнего ID в fields, свойство «Список» — кодом или номером', () => {
    const schemas = spec.components.schemas as Schema;
    expect(Object.keys(schemas.ProductInput.properties.fields.properties)).toContain('externalId');
    expect(Object.keys(schemas.ProductUpsert.properties.fields.properties)).not.toContain('externalId');
    expect(schemas.ProductInput.properties.properties.properties.color.anyOf[0].anyOf).toEqual([
      { type: 'string', enum: ['black'] },
      { type: 'integer' },
    ]);
  });

  it('внешний ID — в записи при чтении', () => {
    expect(spec.components.schemas.Product.properties.externalId.type).toEqual(['string', 'null']);
  });
});
