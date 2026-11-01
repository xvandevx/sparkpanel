import { PanelError } from '../../common/panel-client';
import { CATEGORIES_LIST } from '../../infoblocks/products/product-lists';
import { PropertyType } from '../../infoblocks/settings/properties/property';
import type { ApiList } from '../api-lists';
import type { ApiKeyOwner } from '../keys/api-keys.service';
import { ExternalWriteService } from './external-write.service';

/**
 * Запись по API на поддельной панели: в памяти лежат записи раздела,
 * их внешние ID и значения, а маршрут значений отвергает число не в свойстве
 * «Вес» — как отверг бы настоящий. Проверяется то, что делает сам сервис:
 * права, поиск по внешнему ID, дерево, пакет и откат.
 */

const CATEGORIES: ApiList = {
  listKey: CATEGORIES_LIST,
  path: '/catalog/categories',
  group: 'Каталог',
  name: 'Категории',
  schema: 'Category',
  fields: ['id', 'externalId', 'code', 'name', 'parentId', 'sort', 'createdAt', 'updatedAt'],
  searchIn: ['name', 'code'],
  writeFields: ['externalId', 'name', 'code', 'isActive', 'sort', 'parentId', 'parentExternalId'],
};

const PROPERTIES = [
  { id: 1, code: 'weight', name: 'Вес', type: PropertyType.Number, multiple: false, isMultiDomain: false, linkList: '', options: [] },
  {
    id: 2,
    code: 'size',
    name: 'Размер',
    type: PropertyType.List,
    multiple: false,
    isMultiDomain: false,
    linkList: '',
    options: [
      { id: 21, code: 's' },
      { id: 22, code: 'm' },
    ],
  },
];

type Row = { id: number; name: string; code: string; parentId: number | null };

function setup() {
  const rows = new Map<number, Row>();
  const external = new Map<string, number>();
  const values = new Map<number, Record<number, unknown>>();
  let nextId = 1;

  const idOf = (path: string) => Number(path.split('/').pop());
  const panel = {
    post: jest.fn(async (_user: unknown, _path: string, body: Partial<Row>) => {
      const row = { id: nextId++, name: '', code: '', parentId: null, ...body };
      rows.set(row.id, row);
      return { id: row.id };
    }),
    patch: jest.fn(async (_user: unknown, path: string, body: Record<string, unknown>) => {
      const id = idOf(path);
      if (!path.includes('/values/')) {
        Object.assign(rows.get(id) as Row, body);
        return;
      }
      const items = body.values as { propertyId: number; value: unknown }[];
      if (items.some((item) => item.propertyId === 1 && typeof item.value !== 'number')) {
        throw new PanelError(400, 'Неверное значение свойства «Вес»');
      }
      values.set(id, { ...values.get(id), ...Object.fromEntries(items.map((item) => [item.propertyId, item.value])) });
      if (typeof body.externalId === 'string') external.set(body.externalId, id);
    }),
    delete: jest.fn(async (_user: unknown, path: string) => {
      const id = idOf(path);
      rows.delete(id);
      external.forEach((recordId, key) => recordId === id && external.delete(key));
    }),
  };
  const lookup = {
    row: async (_listKey: string, id: number) => rows.get(id) ?? null,
    idByCode: async (_listKey: string, code: string) => Array.from(rows.values()).find((row) => row.code === code)?.id ?? null,
    idByExternalId: async (_listKey: string, externalId: string) => external.get(externalId) ?? null,
    externalIdOf: async (_listKey: string, id: number) =>
      Array.from(external).find(([, recordId]) => recordId === id)?.[0] ?? null,
    hasCode: () => true,
  };
  const service = new ExternalWriteService(
    { listAt: async () => CATEGORIES } as never,
    {
      findOne: async () => ({ useCode: true, maxDepth: null }),
      settingsOf: async () => ({ properties: PROPERTIES }),
    } as never,
    lookup as never,
    panel as never,
    { findByPk: async () => ({ id: 1, email: 'root@site', isRoot: true, isActive: true }) } as never,
  );
  return { service, panel, rows, external, values };
}

const key = (rights: Partial<ApiKeyOwner> = {}): ApiKeyOwner => ({
  keyId: 1,
  keyName: '1С',
  userId: 1,
  isWritable: true,
  writeLists: null,
  ...rights,
});

describe('запись во внешнее API', () => {
  it('ключ только на чтение писать не может', async () => {
    const { service, panel } = setup();
    await expect(service.create(key({ isWritable: false }), '/catalog/categories', { fields: { name: 'A' } })).rejects.toThrow(
      'Ключу не разрешена запись в «Категории»',
    );
    expect(panel.post).not.toHaveBeenCalled();
  });

  it('ключ с правом записи пишет только в разрешённые списки', async () => {
    const { service } = setup();
    await expect(
      service.upsert(key({ writeLists: ['products'] }), '/catalog/categories', 'C1', { fields: { name: 'A' } }),
    ).rejects.toThrow('Ключу не разрешена запись в «Категории»');
    await expect(
      service.upsert(key({ writeLists: [CATEGORIES_LIST] }), '/catalog/categories', 'C1', { fields: { name: 'A' } }),
    ).resolves.toMatchObject({ status: 'created' });
  });

  it('правку подписывает ключ: JWT создателя с via «API «…»»', async () => {
    const { service, panel } = setup();
    await service.create(key(), '/catalog/categories', { fields: { name: 'A' } });
    expect(panel.post.mock.calls[0][0]).toMatchObject({ id: 1, via: 'API «1С»' });
  });

  it('upsert по внешнему ID создаёт запись, а повторный вызов её правит', async () => {
    const { service, rows, values } = setup();
    const first = await service.upsert(key(), '/catalog/categories', '1C-5', { fields: { name: 'Инструменты' }, properties: { size: 's' } });
    expect(first).toEqual({ externalId: '1C-5', id: 1, status: 'created' });

    const second = await service.upsert(key(), '/catalog/categories', '1C-5', { fields: { name: 'Инструмент' }, properties: { size: 22 } });
    expect(second).toEqual({ externalId: '1C-5', id: 1, status: 'updated' });
    expect(rows.size).toBe(1);
    expect(rows.get(1)?.name).toBe('Инструмент');
    expect(values.get(1)).toEqual({ 2: 22 });
  });

  it('дерево собирается через parentExternalId', async () => {
    const { service, rows } = setup();
    await service.upsert(key(), '/catalog/categories', 'ROOT', { fields: { name: 'Корень' } });
    await service.upsert(key(), '/catalog/categories', 'CHILD', { fields: { name: 'Ветка', parentExternalId: 'ROOT' } });
    expect(rows.get(2)?.parentId).toBe(1);
    await expect(
      service.upsert(key(), '/catalog/categories', 'ORPHAN', { fields: { name: 'Сирота', parentExternalId: 'NOPE' } }),
    ).rejects.toThrow('Нет записи с внешним ID «NOPE» — родителя');
  });

  it('в пакете с ошибкой посередине остальные записи сохраняются', async () => {
    const { service, rows } = setup();
    const { items } = await service.batch(key(), '/catalog/categories', [
      { externalId: 'A', fields: { name: 'Первая' } },
      { externalId: 'B', fields: { name: 'Вторая' }, properties: { weight: 'тяжёлая' } },
      { externalId: 'C', fields: { name: 'Третья', parentExternalId: 'A' } },
    ]);
    expect(items).toEqual([
      { externalId: 'A', id: 1, status: 'created' },
      { externalId: 'B', id: null, status: 'error', error: 'Неверное значение свойства «Вес»' },
      { externalId: 'C', id: 3, status: 'created' },
    ]);
    // Вторая запись создана и откатилась: без свойств и внешнего ID она бы стала дублем
    expect(Array.from(rows.keys())).toEqual([1, 3]);
    expect(rows.get(3)?.parentId).toBe(1);
  });

  it('не прошли свойства — правка полей возвращается', async () => {
    const { service, rows } = setup();
    await service.upsert(key(), '/catalog/categories', 'A', { fields: { name: 'Было' } });
    await expect(
      service.upsert(key(), '/catalog/categories', 'A', { fields: { name: 'Стало' }, properties: { weight: 'x' } }),
    ).rejects.toThrow('Неверное значение свойства «Вес»');
    expect(rows.get(1)?.name).toBe('Было');
  });

  it('занятый внешний ID — 409 до записи', async () => {
    const { service, panel } = setup();
    await service.upsert(key(), '/catalog/categories', 'A', { fields: { name: 'Первая' } });
    panel.post.mockClear();
    await expect(
      service.create(key(), '/catalog/categories', { fields: { name: 'Дубль', externalId: 'A' } }),
    ).rejects.toThrow('Внешний ID «A» уже у записи #1');
    expect(panel.post).not.toHaveBeenCalled();
  });
});
