import { INestApplication } from '@nestjs/common';
import { Request, Response, static as serveStatic } from 'express';
import { basename } from 'path';
import { contentDisposition } from '../infoblocks/files/file-disposition';
import { StorageService, UPLOADS_PATH } from './storage.service';

/**
 * Файлы встроенного хранилища по `/uploads/<ключ>` — из папки хранилища,
 * везде одинаково: в образе headless запрос приходит сюда сам, локально и на
 * нашем проде его передаёт nginx. Range (перемотка видео), ETag и 304 express
 * умеет сам; выйти за пределы папки он не даёт (`..` — отказ), списка файлов
 * папки не отдаёт.
 *
 * Тип файла — по расширению. Им же решается «показать или скачать»
 * (`file-disposition.ts`): `.html` и `.svg` с origin панели только скачиваются.
 * Имя файла при скачивании — его код (`otchet.pdf`): исходное имя есть только
 * в базе, а в неё за каждым файлом не ходим.
 */
export function serveUploads(app: INestApplication): void {
  app.use(UPLOADS_PATH, uploadsHandler(app.get(StorageService).uploadsDir));
  // Файла нет — пустой 404, а не страница панели
  app.use(UPLOADS_PATH, (req: Request, res: Response) => res.status(404).end());
}

export const uploadsHandler = (dir: string) =>
  serveStatic(dir, {
    index: false,
    redirect: false,
    // Ключ уникален, содержимое по нему не переписывается — кэш навсегда
    maxAge: '1y',
    immutable: true,
    setHeaders: (res, path) => {
      const mimeType = serveStatic.mime.lookup(path);
      res.setHeader('Content-Disposition', contentDisposition(mimeType, basename(path)));
      // Тип — по расширению: браузер не угадывает его по содержимому
      res.setHeader('X-Content-Type-Options', 'nosniff');
    },
  });
