import { PropertyType } from '../../infoblocks/settings/properties/property';
import { panelValues, type LinkRef, type WriteProperty } from './write-values';

const property = (patch: Partial<WriteProperty>): WriteProperty => ({
  id: 1,
  code: 'title',
  name: 'Заголовок',
  type: PropertyType.String,
  multiple: false,
  isMultiDomain: false,
  linkList: '',
  options: [],
  ...patch,
});

const color = property({
  id: 4,
  code: 'color',
  name: 'Цвет',
  type: PropertyType.List,
  options: [
    { id: 207, code: 'black' },
    { id: 208, code: 'white' },
  ],
});

const categories = property({
  id: 5,
  code: 'categories',
  name: 'Категории',
  type: PropertyType.ContentLink,
  multiple: true,
  linkList: 'product-categories',
});

/** Записи категорий: код и внешний ID → номер. */
const resolve = async (listKey: string, ref: LinkRef): Promise<number> => {
  if ('id' in ref) return ref.id;
  const known: Record<string, number> = { tools: 3, '1C-77': 9 };
  const id = known['code' in ref ? ref.code : ref.externalId];
  if (id === undefined) throw new Error(`нет в ${listKey}`);
  return id;
};

describe('свойства записи по API — в значения панели', () => {
  it('вариант «Списка» принимается и номером, и кодом', async () => {
    expect(await panelValues([color], { color: 'white' }, resolve)).toEqual([{ propertyId: 4, value: 208 }]);
    expect(await panelValues([color], { color: 207 }, resolve)).toEqual([{ propertyId: 4, value: 207 }]);
  });

  it('незнакомый код варианта — ошибка с перечнем', async () => {
    await expect(panelValues([color], { color: 'red' }, resolve)).rejects.toThrow(
      'У свойства «Цвет» нет варианта «red». Есть: black, white',
    );
  });

  it('привязка — номером, кодом и внешним ID', async () => {
    const values = await panelValues([categories], { categories: [2, 'tools', { externalId: '1C-77' }] }, resolve);
    expect(values).toEqual([
      {
        propertyId: 5,
        value: [
          { listKey: 'product-categories', recordId: '2' },
          { listKey: 'product-categories', recordId: '3' },
          { listKey: 'product-categories', recordId: '9' },
        ],
      },
    ]);
  });

  it('null стирает, строка уходит как есть', async () => {
    const title = property({});
    expect(await panelValues([title, color], { title: 'Тест', color: null }, resolve)).toEqual([
      { propertyId: 1, value: 'Тест' },
      { propertyId: 4, value: null },
    ]);
  });

  it('мультидоменное — переводится значение внутри групп', async () => {
    const badge = { ...color, isMultiDomain: true };
    const values = await panelValues([badge], { color: [{ domainIds: null, value: 'black' }, { domainIds: [2], value: 'white' }] }, resolve);
    expect(values[0].value).toEqual([
      { domainIds: null, value: 207 },
      { domainIds: [2], value: 208 },
    ]);
  });

  it('незнакомый код свойства — ошибка, а не тишина', async () => {
    await expect(panelValues([color], { colour: 'black' }, resolve)).rejects.toThrow('Нет свойства «colour». Есть: color');
  });
});

describe('panelValues: внешние файлы', () => {
  const gallery = property({ id: 9, code: 'gallery', name: 'Фото', type: PropertyType.Image, multiple: true });

  it('принимает номер, адрес и объект File из чтения', async () => {
    const values = await panelValues(
      [gallery],
      { gallery: [5, 'https://old.site/a.png', { id: 6 }, { id: null, url: 'https://old.site/b.png' }] },
      resolve,
    );
    expect(values).toEqual([
      { propertyId: 9, value: [5, 'https://old.site/a.png', 6, 'https://old.site/b.png'] },
    ]);
  });
});
