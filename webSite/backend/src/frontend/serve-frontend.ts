import { INestApplication } from '@nestjs/common';
import {
  NextFunction,
  Request,
  Response,
  static as serveStatic,
} from 'express';
import { readdirSync } from 'fs';
import { join, relative } from 'path';

/**
 * Фронтенд статикой — для образа headless (`webSite/headless/`): `next build`
 * с `NEXT_OUTPUT=export` выгружает панель в HTML и JS, и её отдаёт сам NestJS
 * на том же порту, что и `/api`. Один процесс, один адрес — nginx не нужен.
 * Локально и на нашем проде фронтенд по-прежнему отдаёт Next, сюда не доходит.
 *
 * Страница — файл `<адрес>.html` (`/admin/pages` → `admin/pages.html`).
 * Динамические страницы Next выгружает по одной на маршрут, с параметром
 * в имени (`admin/contents/[contentId].html`): номер из адреса страница берёт
 * сама, уже в браузере. Список страниц читается при старте: адрес из запроса
 * только ищется в нём, по диску им никто не ходит.
 */
export function serveFrontend(app: INestApplication, dir: string): void {
  const pages = scanPages(dir);
  const notFound = join(dir, '404.html');

  // Файлы сборки: в имени хэш, поэтому их можно кешировать навсегда
  app.use(
    serveStatic(dir, {
      index: false,
      redirect: false,
      setHeaders: (res, path) => {
        if (path.includes(join('_next', 'static'))) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      },
    }),
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api' || req.path.startsWith('/api/')) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path === '/') return res.redirect('/admin');

    // Страница меняется с каждой версией образа — браузер её не кеширует
    res.setHeader('Cache-Control', 'no-cache');
    const page = findPage(pages, req.path.replace(/\/+$/, ''));
    if (page) return res.sendFile(page);
    res.status(404).sendFile(notFound);
  });
}

interface FrontendPage {
  /** Адрес страницы: `/admin/pages`; у динамической — с параметром, `/admin/contents/[contentId]` */
  route: string;
  /** Совпадение адреса у динамической страницы, у обычной — null */
  pattern: RegExp | null;
  file: string;
}

/** Все `.html` выгрузки, кроме `404.html`, — страницами */
function scanPages(dir: string): FrontendPage[] {
  return htmlFiles(dir)
    .map((file) => {
      const route =
        '/' +
        relative(dir, file)
          .split('\\')
          .join('/')
          .replace(/\.html$/, '');
      const isDynamic = route.includes('[');
      const pattern = isDynamic
        ? new RegExp('^' + route.replace(/\[[^\]]+\]/g, '[^/]+') + '$')
        : null;
      return { route, pattern, file };
    })
    .filter((page) => page.route !== '/404');
}

function htmlFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return htmlFiles(path);
    return entry.name.endsWith('.html') ? [path] : [];
  });
}

/** Обычная страница сильнее динамической: `/admin/files` — не `[sectionId]` */
function findPage(pages: FrontendPage[], path: string): string | null {
  const exact = pages.find((page) => !page.pattern && page.route === path);
  if (exact) return exact.file;
  return pages.find((page) => page.pattern?.test(path))?.file ?? null;
}
