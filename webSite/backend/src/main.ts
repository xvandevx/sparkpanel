import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json } from 'express';
import { AppModule } from './app.module';
import { serveFrontend } from './frontend/serve-frontend';
import { serveUploads } from './storage/serve-uploads';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Глобальный префикс "api": nginx (:3400) отдаёт /api/... сюда как есть.
  app.setGlobalPrefix('api');

  // Ассистент присылает файл в base64 прямо в вызове upload_file, а обычный
  // предел тела — 100 КБ. Поднят только для MCP и не выше, чем пропустит nginx
  // (25 МБ — файл до ~18 МБ). Парсер встаёт раньше общего, и тот уже
  // разобранное тело не трогает. Общий ставим сами: Nest свой JSON-парсер
  // не добавляет, если какой-то уже есть, — и тела остальных маршрутов
  // приходили бы пустыми
  app.use('/api/mcp', json({ limit: '25mb' }));
  app.use(json());

  // whitelist режет поля, которых нет в DTO — в т.ч. попытки протащить userId/role из тела.
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SparkPanel API')
    .setDescription('API админ-панели SparkPanel')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT-auth',
    )
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  // Файлы встроенного хранилища (/uploads/…) — из MinIO через панель.
  // Локально и на проде их раньше перехватывает nginx
  serveUploads(app);

  // Образ headless: панель статикой с того же порта (webSite/headless/).
  // Локально переменной нет — фронтенд отдаёт `next dev` через nginx
  if (process.env.FRONTEND_DIR) serveFrontend(app, process.env.FRONTEND_DIR);

  // Локально 3402, в контейнере 3010 (см. Dockerfile).
  const port = Number(process.env.PORT ?? 3402);
  await app.listen(port);
}

bootstrap();
