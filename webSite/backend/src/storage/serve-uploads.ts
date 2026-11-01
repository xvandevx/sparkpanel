import { INestApplication, Logger } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { StorageService, describe } from './storage.service';

const logger = new Logger('Uploads');

/**
 * Файлы встроенного хранилища по `/uploads/<ключ>` — для образа headless
 * (`webSite/headless/`): nginx там нет, и объект из MinIO отдаёт сам NestJS.
 * Локально и на нашем проде этот путь перехватывает nginx, сюда запрос
 * не доходит. Путь — `S3_PUBLIC_PREFIX`; задан полным адресом (CDN) —
 * раздавать нечего, браузер ходит туда.
 *
 * Тип, «показать или скачать» и срок кэша хранилище помнит с загрузки
 * (`StorageService.put`) — здесь они только передаются браузеру.
 */
export function serveUploads(app: INestApplication): void {
  const storage = app.get(StorageService);
  if (storage.servedPath) app.use(storage.servedPath, uploadsHandler(storage));
}

export const uploadsHandler =
  (storage: Pick<StorageService, 'read'>) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();

    const key = objectKey(req.path);
    if (!key) {
      res.status(404).end();
      return;
    }

    let object: Awaited<ReturnType<StorageService['read']>>;
    try {
      object = await storage.read(key, {
        range: req.headers.range,
        ifNoneMatch: req.headers['if-none-match'],
        ifModifiedSince: req.headers['if-modified-since'],
      });
    } catch (error) {
      const status = PASSED_STATUSES.has(statusOf(error)) ? statusOf(error) : 502;
      if (status === 502) logger.warn(`Объект ${key} не прочитан: ${describe(error)}`);
      res.status(status).end();
      return;
    }

    const headers: Record<string, string | number | undefined> = {
      'Content-Type': object.ContentType,
      'Content-Length': object.ContentLength,
      'Content-Range': object.ContentRange,
      'Content-Disposition': object.ContentDisposition,
      'Cache-Control': object.CacheControl,
      ETag: object.ETag,
      'Last-Modified': object.LastModified?.toUTCString(),
      'Accept-Ranges': 'bytes',
      // Тип — тот, что записан при загрузке: браузер не угадывает его по содержимому
      'X-Content-Type-Options': 'nosniff',
    };
    for (const [name, value] of Object.entries(headers)) {
      if (value !== undefined) res.setHeader(name, value);
    }
    res.status(object.ContentRange ? 206 : 200);

    const body = object.Body as Readable;
    if (req.method === 'HEAD') {
      body.destroy();
      res.end();
      return;
    }
    // Браузер закрыл соединение посреди файла — не ошибка, поток просто закрывается
    await pipeline(body, res).catch(() => undefined);
  };

/**
 * Ответы хранилища, которые браузеру отдаются как есть: не изменился, нет
 * такого, не то условие, не тот диапазон. Остальное (неверные ключи, хранилище
 * лежит) — 502 и строка в лог.
 */
const PASSED_STATUSES = new Set([304, 404, 412, 416]);

/**
 * Ключ объекта из пути запроса: `/00/00/78/otchet.pdf` → `00/00/78/otchet.pdf`.
 * Ключи панели — латиница, цифры, точка, дефис и подчёркивание
 * (`files/file-key.ts`); всё остальное, `..` и пустые сегменты — null: по чужому
 * пути панель в хранилище не ходит.
 */
export const objectKey = (path: string): string | null => {
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return null;
  }
  const segments = decoded.replace(/^\/+/, '').split('/');
  const isValid = segments.every(
    (segment) => /^[A-Za-z0-9._-]+$/.test(segment) && segment !== '.' && segment !== '..',
  );
  return isValid ? segments.join('/') : null;
};

const statusOf = (error: unknown): number | undefined =>
  (error as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
