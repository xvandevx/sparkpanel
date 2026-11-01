import { contentTypePath, contentTypesInTreeOrder } from './content-tree';

const type = (id: number, parentId: number | null, name: string) => ({ id, parentId, name });

describe('contentTypesInTreeOrder', () => {
  it('родитель, за ним его ветка; путь — от корня', () => {
    const types = [
      type(1, null, 'Новости'),
      type(2, 3, 'Уникальные описания товаров'),
      type(3, null, 'SEO'),
    ];
    const order = contentTypesInTreeOrder(types).map(({ type: item, path }) => [
      item.id,
      contentTypePath(path),
    ]);
    expect(order).toEqual([
      [1, 'Новости'],
      [3, 'SEO'],
      [2, 'SEO / Уникальные описания товаров'],
    ]);
  });

  it('без родителя — в корне, кольцо не зацикливает и не теряет типы', () => {
    const types = [type(1, 99, 'Сирота'), type(2, 3, 'А'), type(3, 2, 'Б')];
    expect(contentTypesInTreeOrder(types).map(({ type: item }) => item.id).sort()).toEqual([1, 2, 3]);
  });
});
