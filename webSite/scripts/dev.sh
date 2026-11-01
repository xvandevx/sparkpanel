#!/usr/bin/env bash
# Запускает весь локальный стек одной командой:
#   docker (nginx :3400 + postgres :3403) -> backend :3402 -> frontend :3401
# Всё приложение открывается на http://localhost:3400 (через nginx, как на проде).
# Весь стек живёт на портах 340x — 4000/4001/4010/4432 заняты focuzy, 3000 — другим проектом.
#
# Ctrl+C — гасит backend/frontend. Контейнеры оставляем жить (см. scripts/stop.sh).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# БД: наружу отдаётся 3403 (на хосте 5432 занят сторонним сервисом)
export POSTGRES_HOST=localhost
export POSTGRES_PORT=3403
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
export POSTGRES_DB=postgres

log() { printf "\033[36m▸ %s\033[0m\n" "$1"; }
die() { printf "\033[31m✗ %s\033[0m\n" "$1" >&2; exit 1; }

# --- 1. Docker ---
docker info >/dev/null 2>&1 || die "Docker не запущен. Открой Docker Desktop и повтори."

log "Поднимаю docker: nginx (:3400) + postgres (:3403)"
docker compose up -d nginx postgres

log "Жду postgres"
for i in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1; then break; fi
  [ "$i" = 30 ] && die "postgres не поднялся за 30с"
  sleep 1
done

# --- 2. Backend / Frontend ---
PIDS=()
cleanup() {
  log "Останавливаю backend/frontend"
  for pid in "${PIDS[@]:-}"; do kill "$pid" 2>/dev/null || true; done
  # nest/next поднимают дочерние процессы — добиваем по портам
  lsof -ti:3402 -ti:3401 2>/dev/null | xargs kill -9 2>/dev/null || true
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

log "Запускаю backend (:3402)"
# Порт явно: PORT из окружения сильнее backend/.env, а запускающий скрипт
# (панель превью, CI) может выставить свой — и бэкенд встанет на 3400 вместо nginx
(cd backend && PORT=3402 npm run start:dev) &
PIDS+=($!)

log "Запускаю frontend (:3401)"
(cd frontend && npm run dev) &
PIDS+=($!)

printf "\n\033[32m✓ Стек поднимается. Открывай: http://localhost:3400\033[0m\n"
printf "  API:     http://localhost:3400/api\n"
printf "  Swagger: http://localhost:3400/api/docs\n"
printf "  Файлы:   http://localhost:3400/uploads/<ключ> (папка backend/uploads)\n"
printf "  Ctrl+C — остановить backend/frontend\n\n"

wait
