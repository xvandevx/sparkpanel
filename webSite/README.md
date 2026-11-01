# SparkPanel — webSite

Админ-панель SparkPanel: NestJS API + Next.js клиент за общим nginx.

Правила работы с кодом — [`../CLAUDE.md`](../CLAUDE.md) (корень) и
[`frontend/CLAUDE.md`](frontend/CLAUDE.md) (слои фронта).

## Запуск

```bash
./scripts/dev.sh      # docker (nginx :3400 + postgres :3403) + backend :3402 + frontend :3401
./scripts/stop.sh     # погасить всё
```

Открывается на **http://localhost:3400** — один origin, как на проде.
Прямой `:3401` использовать нельзя: сломается Google OAuth.

| Что | URL |
|-----|-----|
| Панель | http://localhost:3400/admin |
| API | http://localhost:3400/api |
| Swagger | http://localhost:3400/api/docs |
| Файлы медиатеки | http://localhost:3400/uploads/&lt;ключ&gt; (папка `backend/uploads`) |
| Postgres | localhost:3403 |

Первый запуск: `cp backend/.env.example backend/.env`, затем `npm install` в `backend/` и `frontend/`.

## Состояние

Инфраструктура, конфиги и правила готовы. Прикладной код пишется с нуля — из focuzy ничего
не переносится.

Сделано:

- backend: модуль `auth` (первичная настройка, вход по email/паролю, JWT, глобальный `AuthGuard`)
  и `users` (модель, bcrypt, единственный root с гарантией на уровне индекса БД);
- frontend: админка на **Ant Design** по слоям (`pages` → `components` → `logic` → `redux` → `api`):
  экран доступа (создание администратора / вход) и приложение с левым меню — главная, страницы,
  инфоблоки, контент, почта, пользователи (разделы пока заглушки);
- фон страницы входа — анимированный Vanta «halo» (`components/ui/VantaHalo.tsx`): three.js и vanta
  грузятся динамически (в стартовый бандл не попадают), при системной настройке
  «уменьшить движение» вместо анимации остаётся статичный фон `#131a43`.

Учётки по умолчанию нет: при первом открытии `/admin` панель сообщит, что главного администратора
нет, и предложит создать его прямо там. Сбросить в dev — `DELETE FROM users;` в postgres.

## Прод

Всё прод-окружение — в [`prod/`](prod/), инструкция с нуля — [`prod/README.md`](prod/README.md).
