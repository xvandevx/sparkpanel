#!/usr/bin/env bash
# Гасит весь локальный стек: dev-серверы на хосте + контейнеры.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

log() { printf "\033[36m▸ %s\033[0m\n" "$1"; }

log "Гашу backend (:3402) и frontend (:3401)"
# ВАЖНО: бьём именно по портам — pkill по "nest start"/"next dev" убивает
# только обёртку, а дочерний node продолжает держать порт.
lsof -ti:3402 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:3401 2>/dev/null | xargs kill -9 2>/dev/null || true

log "Останавливаю контейнеры (nginx, postgres, minio)"
docker compose down 2>/dev/null || true

printf "\033[32m✓ Всё остановлено\033[0m\n"
