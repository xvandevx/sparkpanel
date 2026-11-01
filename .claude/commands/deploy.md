# deploy

Выкатить aiAdmin на прод и проверить результат.

## Как это работает

Деплой идёт через CI: push в `main` репозитория `ai-panel/frontend` или `ai-panel/backend`
→ GitHub Actions собирает образ → GHCR → ssh на сервер → `docker compose up -d --no-deps <сервис>`.
Полная инструкция: `webSite/prod/README.md`.

## Действия

1. Уточни, **что** выкатываем: фронт, бэк или инфраструктуру (`prod/`).
2. Фронт/бэк — обычный push в `main` нужного репозитория. Проверить прогон:
   ```bash
   gh run list --limit 5
   gh run watch
   ```
   Ручной запуск без коммита: `gh workflow run deploy.yml`.
3. Инфраструктура (`prod/docker-compose.yml`, nginx-конфиги, скрипты) — CI её **не** возит,
   заливаем вручную из `webSite/`:
   ```bash
   rsync -avz --exclude '.env' --exclude 'docker/postgres' ./prod/ deploy@<SERVER_IP>:/home/deploy/aipanel/
   ```
   Потом на сервере: `docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload`
   (или `docker compose up -d`, если менялся compose).
4. Проверь прод:
   ```bash
   curl -I https://ai-panel.app
   ```
   Логи контейнеров — Dozzle на `http://<SERVER_IP>:9000`.

## Не делать

- Не пушить в `main` без спроса — это немедленный деплой на прод.
- Не выкатывать `prod/.env` — секреты живут только на сервере.
- Откат: перетегировать предыдущий образ (см. раздел «Передеплой» в `prod/README.md`),
  а не править код «горячим» коммитом.
