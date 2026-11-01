import { canWrite } from './write-access';

describe('права ключа на запись', () => {
  it('ключ только на чтение не пишет никуда', () => {
    expect(canWrite({ isWritable: false, writeLists: null }, 'products')).toBe(false);
    expect(canWrite({ isWritable: false, writeLists: ['products'] }, 'products')).toBe(false);
  });

  it('ключ с отмеченными списками пишет только в них', () => {
    const rights = { isWritable: true, writeLists: ['products', 'product-categories'] };
    expect(canWrite(rights, 'products')).toBe(true);
    expect(canWrite(rights, 'product-categories')).toBe(true);
    expect(canWrite(rights, 'pages')).toBe(false);
    expect(canWrite(rights, 'content-items.3')).toBe(false);
  });

  it('ключ «во все списки» пишет и в новые типы контента', () => {
    expect(canWrite({ isWritable: true, writeLists: null }, 'content-items.42')).toBe(true);
  });
});
