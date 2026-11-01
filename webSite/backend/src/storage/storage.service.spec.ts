import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { StorageKind, StorageService } from './storage.service';

describe('StorageService — встроенная папка', () => {
  const dir = join(mkdtempSync(join(tmpdir(), 'storage-')), 'uploads');
  const storage = new StorageService({ get: () => dir } as never);
  const builtin = { kind: StorageKind.Builtin } as const;

  it('кладёт файл по ключу и убирает его', async () => {
    await storage.put(builtin, '00/00/07/otchet.pdf', Buffer.from('pdf'), 'application/pdf', '');
    expect(readFileSync(join(dir, '00/00/07/otchet.pdf'), 'utf8')).toBe('pdf');

    await storage.remove(builtin, '00/00/07/otchet.pdf');
    expect(existsSync(join(dir, '00/00/07/otchet.pdf'))).toBe(false);
  });

  it('удаление уже удалённого — не ошибка', async () => {
    await expect(storage.remove(builtin, '00/00/08/net.pdf')).resolves.toBeUndefined();
  });

  it('за пределы папки не пишет', async () => {
    await expect(
      storage.put(builtin, '../x.txt', Buffer.from('x'), 'text/plain', ''),
    ).rejects.toThrow();
  });

  it('адрес — относительный /uploads/<ключ>', () => {
    expect(storage.url(builtin, '00/00/07/otchet.pdf')).toBe('/uploads/00/00/07/otchet.pdf');
  });
});
