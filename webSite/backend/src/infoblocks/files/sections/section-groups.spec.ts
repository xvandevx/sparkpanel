import { groupId, listTitle } from './section-groups';

describe('listTitle', () => {
  const types = [
    { id: 12, parentId: null, name: 'SEO' },
    { id: 14, parentId: 12, name: 'Мета-теги по цветам' },
  ];

  it('ведёт элементы типа контента через «Контент» и предков типа', () => {
    expect(listTitle('content-items.14', 'Мета-теги по цветам', types)).toBe(
      'Контент / SEO / Мета-теги по цветам',
    );
  });

  it('кладёт категории под «Товары»', () => {
    expect(listTitle('product-categories', 'Категории', [])).toBe('Товары / Категории');
    expect(listTitle('products', 'Каталог', [])).toBe('Товары');
  });

  it('оставляет список без пункта меню как есть', () => {
    expect(listTitle('pages', 'Страницы сайта', [])).toBe('Страницы сайта');
  });

  it('не зацикливается на кольце типов и не теряет пропавший тип', () => {
    const ring = [
      { id: 1, parentId: 2, name: 'А' },
      { id: 2, parentId: 1, name: 'Б' },
    ];
    expect(listTitle('content-items.1', 'А', ring)).toBe('Контент / Б / А');
    expect(listTitle('content-items.9', 'Без типа', [])).toBe('Контент / Без типа');
  });

  it('даёт группе номер, который не спутать с разделом', () => {
    expect(groupId('pages')).toBe('group-pages');
  });
});
