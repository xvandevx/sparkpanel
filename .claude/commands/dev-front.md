# dev-front

Запустить только фронтенд (Next.js, :3401).

## Действия

1. Для полноценной работы нужен nginx (`docker compose up -d nginx` из `webSite/`) — приложение
   открывается на http://localhost:3400, а не на :3401.
2. Проверь `frontend/node_modules`; если нет — `npm install` во `frontend/`.
3. Запусти **в фоне**:
   ```bash
   npm --prefix frontend run dev
   ```
4. Проверь: `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3400/`.

## Не делать

- Не поднимать backend — это `/dev-back`.
- Не редактировать `frontend/src/generated/` — это авто-генерация из Swagger (`npm run generate-api`).
