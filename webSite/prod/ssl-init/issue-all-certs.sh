#!/bin/sh
# Выпуск сертификатов для всех обычных доменов из domains.txt (HTTP-01, по одному).
# Wildcard *.ai-panel.app сюда НЕ входит — он выпускается отдельно: ./issue-wildcard.sh ai-panel.app
set -e
INIT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAINS_FILE="${DOMAINS_FILE:-$INIT_DIR/domains.txt}"

if [ ! -f "$DOMAINS_FILE" ]; then
  echo "Создайте $DOMAINS_FILE (по одному домену на строку). Пример: cp domains.example domains.txt"
  exit 1
fi

while IFS= read -r line || [ -n "$line" ]; do
  domain=$(echo "$line" | sed 's/#.*//' | tr -d '[:space:]')
  [ -z "$domain" ] && continue
  echo "========== $domain =========="
  "$INIT_DIR/issue-cert.sh" "$domain"
done < "$DOMAINS_FILE"
