import { BadRequestException } from '@nestjs/common';
import { gzipSync } from 'zlib';
import { columnsOf, parseSiteDump, rowsCount, tableOrder } from './site-dump';

const dump = { format: 'sparkpanel-site', version: 1, tables: { users: [{ id: 1 }], roles: [] } };

describe('parseSiteDump', () => {
  it('читает и сжатый файл, и просто JSON', () => {
    const json = Buffer.from(JSON.stringify(dump));
    expect(parseSiteDump(gzipSync(json))).toEqual(dump);
    expect(parseSiteDump(json)).toEqual(dump);
  });

  it('не копия сайта — 400', () => {
    expect(() => parseSiteDump(Buffer.from('не json'))).toThrow(BadRequestException);
    expect(() => parseSiteDump(Buffer.from(JSON.stringify({ ...dump, format: 'x' })))).toThrow(
      BadRequestException,
    );
    // Копия одного списка — не копия сайта
    expect(() => parseSiteDump(Buffer.from(JSON.stringify({ version: 1, listKey: 'pages' })))).toThrow(
      BadRequestException,
    );
  });

  it('строки таблицы — только объекты', () => {
    const broken = { ...dump, tables: { users: [1, 2] } };
    expect(() => parseSiteDump(Buffer.from(JSON.stringify(broken)))).toThrow(BadRequestException);
  });
});

describe('rowsCount и columnsOf', () => {
  it('считают строки и собирают колонки со всех строк', () => {
    expect(rowsCount(dump as never)).toBe(1);
    expect(columnsOf([{ id: 1 }, { id: 2, name: 'a' }])).toEqual(['id', 'name']);
  });
});

describe('tableOrder', () => {
  it('таблица, на которую ссылаются, — раньше ссылающейся', () => {
    const order = tableOrder(
      ['values', 'records', 'settings', 'users'],
      [
        { table: 'values', ref: 'records' },
        { table: 'records', ref: 'settings' },
      ],
    );
    expect(order.indexOf('settings')).toBeLessThan(order.indexOf('records'));
    expect(order.indexOf('records')).toBeLessThan(order.indexOf('values'));
    expect(order).toHaveLength(4);
  });

  it('ссылка на себя и на чужую таблицу порядок не ломают', () => {
    expect(
      tableOrder(
        ['pages', 'files'],
        [
          { table: 'pages', ref: 'pages' },
          { table: 'files', ref: 'site_backups' },
        ],
      ),
    ).toEqual(['pages', 'files']);
  });

  it('кольцо ссылок — таблицы всё равно все', () => {
    expect(
      tableOrder(
        ['a', 'b'],
        [
          { table: 'a', ref: 'b' },
          { table: 'b', ref: 'a' },
        ],
      ).sort(),
    ).toEqual(['a', 'b']);
  });
});
