# dev-up

Поднять полный локальный стек aiAdmin: docker (nginx :3400 + postgres :3403) → backend :3402 → frontend :3401.
Все порты стека — `340x`: 4000/4001/4010/4432 заняты focuzy, 3000 — ещё одним проектом.

## Действия

1. Проверь, что Docker запущен: `docker info >/dev/null 2>&1`. Если нет — скажи пользователю открыть Docker Desktop, дальше не иди.
2. Из `webSite/`:
   ```bash
   chmod +x scripts/dev.sh && ./scripts/dev.sh
   ```
   Это долгий процесс — запускай **в фоне** (`run_in_background: true`), скрипт держит оба dev-сервера.
3. Через 10–20 секунд проверь, что стек отвечает:
   ```bash
   curl -s -o /dev/null -w 'front %{http_code}\n' http://localhost:3400/
   curl -s -o /dev/null -w 'api   %{http_code}\n' http://localhost:3400/api/docs-json
   ```
4. Сообщи URL: http://localhost:3400 — админка, http://localhost:3400/api — API, http://localhost:3400/api/docs — Swagger.

## Не делать

- Не открывать `http://localhost:3401` напрямую как «рабочий» URL — приложение живёт на одном origin
  через nginx, иначе ломается Google OAuth (см. `CLAUDE.md`).
- Не поднимать `prod/` — это прод.
