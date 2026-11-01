import { BadRequestException } from '@nestjs/common';
import {
  BACKUP_VERSION,
  changedCount,
  orphanIds,
  parseBackupData,
  planRecords,
  recordPrints,
  type BackupData,
} from './backup-data';

const backup = (patch: Partial<BackupData> = {}): BackupData => ({
  version: BACKUP_VERSION,
  listKey: 'products',
  settings: {
    useCode: true,
    codeRequired: false,
    codeUnique: false,
    maxDepth: 1,
    isHistoryEnabled: true,
    isDraftEnabled: false,
  },
  tabs: [],
  properties: [],
  options: [],
  filters: [],
  rows: [{ id: 1, name: 'Фаркоп' }],
  records: [],
  values: [],
  drafts: [],
  ...patch,
});

describe('parseBackupData', () => {
  it('читает копию своего списка', () => {
    expect(parseBackupData(backup(), 'products').rows).toHaveLength(1);
  });

  it('не читает копию другого списка', () => {
    expect(() => parseBackupData(backup(), 'pages')).toThrow(
      BadRequestException,
    );
  });

  it('не читает файл другого формата', () => {
    expect(() =>
      parseBackupData({ ...backup(), version: 99 }, 'products'),
    ).toThrow('Это не файл резервной копии списка');
    expect(() => parseBackupData('текст', 'products')).toThrow(
      BadRequestException,
    );
  });

  it('не читает копию без строк или с записью без номера', () => {
    expect(() =>
      parseBackupData(
        { ...backup(), values: undefined } as unknown as BackupData,
        'products',
      ),
    ).toThrow('нет строк «values»');
    expect(() =>
      parseBackupData(backup({ rows: [{ id: 'x' }] }), 'products'),
    ).toThrow('у записи нет номера');
  });
});

describe('planRecords', () => {
  const current = [{ id: 1 }, { id: 2 }, { id: 3, isBlocked: true }];

  it('удаляет записи, которых нет в копии, но не защищённые', () => {
    const plan = planRecords(current, [{ id: 1 }, { id: 4 }]);
    expect(plan.removed).toEqual([2]);
    expect(plan.kept).toEqual([3]);
  });

  it('возвращает записи копии, которых сейчас нет', () => {
    expect(
      planRecords(current, [{ id: 1 }, { id: 4 }, { id: 5 }]).returned,
    ).toEqual([4, 5]);
  });

  it('номер строкой и числом — одна запись', () => {
    expect(planRecords([{ id: '7' }], [{ id: 7 }])).toEqual({
      removed: [],
      kept: [],
      returned: [],
    });
  });
});

describe('recordPrints и changedCount', () => {
  const rows = [
    { id: 1, name: 'Фаркоп', updatedAt: '2026-10-01' },
    { id: 2, name: 'Розетка', updatedAt: '2026-10-01' },
  ];
  const records = [{ id: 10, recordKey: '1' }];
  const values = [{ id: 100, recordId: 10, propertyId: 5, text: '12490' }];
  const print = recordPrints(rows, records, values);

  it('даты и номера строк не делают запись изменённой', () => {
    const later = recordPrints(
      rows.map((row) => ({ ...row, updatedAt: '2026-10-29' })),
      [{ id: 11, recordKey: '1' }],
      [{ id: 200, recordId: 11, propertyId: 5, text: '12490' }],
    );
    expect(changedCount(print, later)).toBe(0);
  });

  it('другое поле или значение — запись изменилась', () => {
    const edited = recordPrints(
      [{ ...rows[0], name: 'Фаркоп съёмный' }, rows[1]],
      records,
      [{ ...values[0], text: '13000' }],
    );
    expect(changedCount(print, edited)).toBe(1);
    expect(changedCount(print, recordPrints(rows, records, []))).toBe(1);
  });

  it('записи только одной стороны изменёнными не считаются', () => {
    expect(
      changedCount(
        print,
        recordPrints([rows[0], { id: 3, name: 'Новая' }], records, values),
      ),
    ).toBe(0);
  });
});

describe('orphanIds', () => {
  it('находит записи, чей родитель пропал', () => {
    const rows = [
      { id: 1, parentId: null },
      { id: 2, parentId: 1 },
      { id: 3, parentId: 9 },
    ];
    expect(orphanIds(rows)).toEqual([3]);
  });
});
