import * as express from 'express';
import { Readable } from 'stream';
import * as request from 'supertest';
import { objectKey, uploadsHandler } from './serve-uploads';

describe('objectKey', () => {
  it('берёт ключ из пути', () => {
    expect(objectKey('/00/00/78/otchet.pdf')).toBe('00/00/78/otchet.pdf');
  });

  it('не выпускает за пределы ключей панели', () => {
    expect(objectKey('/../secret')).toBeNull();
    expect(objectKey('/00/%2e%2e/x.png')).toBeNull();
    expect(objectKey('/00/..%2F..%2Fx.png')).toBeNull();
    expect(objectKey('/00//x.png')).toBeNull();
    expect(objectKey('/')).toBeNull();
    expect(objectKey('/%E0%A4%A')).toBeNull();
  });
});

describe('uploadsHandler', () => {
  const object = (overrides = {}) => ({
    Body: Readable.from([Buffer.from('hello')]),
    ContentType: 'text/html',
    ContentLength: 5,
    ContentDisposition: 'attachment; filename="a.html"',
    CacheControl: 'public, max-age=31536000, immutable',
    ETag: '"abc"',
    ...overrides,
  });
  const appWith = (read: jest.Mock) => express().use('/uploads', uploadsHandler({ read } as never));

  it('отдаёт объект с заголовками, записанными при загрузке', async () => {
    const read = jest.fn().mockResolvedValue(object());
    const res = await request(appWith(read)).get('/uploads/00/00/01/a.html');

    expect(read).toHaveBeenCalledWith('00/00/01/a.html', expect.any(Object));
    expect(res.status).toBe(200);
    expect(res.text).toBe('hello');
    expect(res.headers['content-type']).toBe('text/html');
    expect(res.headers['content-disposition']).toBe('attachment; filename="a.html"');
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('часть файла — 206, диапазон уходит в хранилище', async () => {
    const read = jest.fn().mockResolvedValue(
      object({
        Body: Readable.from([Buffer.from('el')]),
        ContentLength: 2,
        ContentRange: 'bytes 1-2/5',
      }),
    );
    const res = await request(appWith(read))
      .get('/uploads/00/00/01/a.mp4')
      .set('Range', 'bytes=1-2');

    expect(read.mock.calls[0][1].range).toBe('bytes=1-2');
    expect(res.status).toBe(206);
    expect(res.headers['content-range']).toBe('bytes 1-2/5');
  });

  it('ответы хранилища «не изменился» и «нет такого» передаёт, остальное — 502', async () => {
    const failing = (status: number) =>
      jest.fn().mockRejectedValue(
        Object.assign(new Error('s3'), {
          $metadata: { httpStatusCode: status },
        }),
      );

    expect((await request(appWith(failing(304))).get('/uploads/00/00/01/a.png')).status).toBe(304);
    expect((await request(appWith(failing(404))).get('/uploads/00/00/01/a.png')).status).toBe(404);
    expect((await request(appWith(failing(403))).get('/uploads/00/00/01/a.png')).status).toBe(502);
  });

  it('по чужому пути в хранилище не ходит', async () => {
    const read = jest.fn();
    const res = await request(appWith(read)).get('/uploads/00/%2e%2e/%2e%2e/etc/passwd');

    expect(res.status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });

  it('другие методы пропускает дальше', async () => {
    const read = jest.fn();
    const res = await request(appWith(read)).post('/uploads/00/00/01/a.png');

    expect(res.status).toBe(404);
    expect(read).not.toHaveBeenCalled();
  });
});
