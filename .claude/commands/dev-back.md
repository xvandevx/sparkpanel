# dev-back

Запустить только бэкенд (NestJS, :3402).

## Действия

1. Postgres должен быть поднят: `docker compose up -d postgres` (из `webSite/`), дождись `pg_isready`.
2. Проверь `backend/.env` (если нет — `cp .env.example .env`) и `backend/node_modules`
   (если нет — `npm install` в `backend/`).
3. Запусти **в фоне**:
   ```bash
   npm --prefix backend run start:dev
   ```
4. Проверь: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3402/api/docs-json`.
5. Сообщи: Swagger через nginx — http://localhost:3400/api/docs.

## Не делать

- Не поднимать frontend — это `/dev-front`.
- Схема БД мигрируется сама (`sequelize sync: { alter: true }`) — отдельных миграций нет,
  руками SQL не накатывать.
