import * as express from 'express';
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as request from 'supertest';
import { uploadsHandler } from './serve-uploads';

describe('uploadsHandler', () => {
  const root = mkdtempSync(join(tmpdir(), 'uploads-'));
  const dir = join(root, 'uploads');
  mkdirSync(join(dir, '00/00/01'), { recursive: true });
  writeFileSync(join(dir, '00/00/01/photo.png'), 'png-bytes');
  writeFileSync(join(dir, '00/00/01/logo.svg'), '<svg onload="alert(1)"/>');
  writeFileSync(join(root, 'secret.txt'), 'top-secret-content');

  const app = express().use('/uploads', uploadsHandler(dir));

  it('картинку показывает, с типом по расширению и вечным кэшем', async () => {
    const res = await request(app).get('/uploads/00/00/01/photo.png');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
    expect(res.headers['content-disposition']).toMatch(/^inline; filename="photo.png"/);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('svg отдаёт на скачивание: в нём бывает скрипт', async () => {
    const res = await request(app).get('/uploads/00/00/01/logo.svg');

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/^attachment;/);
  });

  it('часть файла — 206, повтор по ETag — 304', async () => {
    const part = await request(app).get('/uploads/00/00/01/photo.png').set('Range', 'bytes=0-2');
    expect(part.status).toBe(206);
    expect(part.headers['content-range']).toBe('bytes 0-2/9');

    const full = await request(app).get('/uploads/00/00/01/photo.png');
    const same = await request(app)
      .get('/uploads/00/00/01/photo.png')
      .set('If-None-Match', full.headers.etag);
    expect(same.status).toBe(304);
  });

  it('за пределы папки и в список файлов не пускает', async () => {
    const outside = await request(app).get('/uploads/..%2fsecret.txt');
    const listing = await request(app).get('/uploads/00/00/01/');

    expect(outside.status).toBe(404);
    expect(outside.text).not.toContain('top-secret-content');
    expect(listing.status).toBe(404);
  });
});
