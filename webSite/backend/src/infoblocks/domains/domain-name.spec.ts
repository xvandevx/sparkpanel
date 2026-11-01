import {
  DOMAIN_NAME_PATTERN,
  domainAddresses,
  domainNameError,
  duplicateAddress,
  normalizeDomainName,
} from './domain-name';

// farkop.ru ─ ekb, www
// towbar-shop.ru
const rows = [
  { id: 1, parentId: null, name: 'farkop.ru' },
  { id: 2, parentId: 1, name: 'ekb' },
  { id: 3, parentId: 1, name: 'www' },
  { id: 4, parentId: null, name: 'towbar-shop.ru' },
];

describe('имя домена из набранного', () => {
  it('отбрасывает протокол, путь, пробелы и регистр', () => {
    expect(normalizeDomainName(' HTTPS://Ekb.Farkop.ru/catalog?x=1 ')).toBe('ekb.farkop.ru');
    expect(normalizeDomainName('farkop.ru#top')).toBe('farkop.ru');
  });

  it('пропускает имя хоста с портом и отклоняет опечатки', () => {
    expect(DOMAIN_NAME_PATTERN.test('localhost:3400')).toBe(true);
    expect(DOMAIN_NAME_PATTERN.test('-bad-.ru')).toBe(false);
    expect(DOMAIN_NAME_PATTERN.test('не домен')).toBe(false);
  });
});

describe('адрес домена', () => {
  it('у домена — его имя, у поддомена — своё имя и имя домена', () => {
    const addresses = domainAddresses(rows);
    expect(addresses.get(1)).toBe('farkop.ru');
    expect(addresses.get(2)).toBe('ekb.farkop.ru');
  });

  it('переименовали домен — адрес поддомена сложился заново', () => {
    const renamed = rows.map((row) => (row.id === 1 ? { ...row, name: 'farkop.com' } : row));
    expect(domainAddresses(renamed).get(2)).toBe('ekb.farkop.com');
  });
});

describe('имя на своём месте', () => {
  it('у поддомена — только своё имя', () => {
    expect(domainNameError('ekb', 'ekb.farkop.ru', 'farkop.ru')).toBeNull();
    expect(domainNameError('ekb.farkop.ru', 'ekb.farkop.ru.farkop.ru', 'farkop.ru')).toContain(
      'только его имя: ekb',
    );
    expect(domainNameError('farkop.ru', 'farkop.ru.farkop.ru', 'farkop.ru')).not.toBeNull();
  });

  it('порт бывает только в конце адреса', () => {
    expect(domainNameError('shop:80', 'shop:80.farkop.ru', 'farkop.ru')).not.toBeNull();
    expect(domainNameError('shop', 'shop.localhost:3400', 'localhost:3400')).toBeNull();
  });
});

describe('повтор адреса', () => {
  const before = domainAddresses(rows);

  it('новый поддомен с занятым адресом', () => {
    const after = domainAddresses([...rows, { id: 5, parentId: 1, name: 'ekb' }]);
    expect(duplicateAddress(before, after)).toBe('ekb.farkop.ru');
  });

  it('домен, чей адрес совпал с адресом поддомена', () => {
    const after = domainAddresses([...rows, { id: 5, parentId: null, name: 'ekb.farkop.ru' }]);
    expect(duplicateAddress(before, after)).toBe('ekb.farkop.ru');
  });

  it('одинаковое имя у поддоменов разных доменов — не повтор', () => {
    const after = domainAddresses([...rows, { id: 5, parentId: 4, name: 'ekb' }]);
    expect(duplicateAddress(before, after)).toBeNull();
  });
});
