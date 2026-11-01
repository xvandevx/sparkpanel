#!/bin/sh
# Выпуск сертификата для одного ОБЫЧНОГО домена (HTTP-01) вместе с www.<домен>.
# Для wildcard *.ai-panel.app используйте ./issue-wildcard.sh (DNS-01).
#
# Usage: ./issue-cert.sh <domain> [email] [--staging]
#
# Прод-nginx читает сертификаты напрямую из certs/live/<domain>/ (симлинки certbot),
# копировать никуда не нужно: весь каталог certs/ смонтирован в контейнер nginx,
# а симлинки live/ -> ../../archive/ относительные и внутри контейнера резолвятся.
set -e
INIT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROD_DIR="$(cd "$INIT_DIR/.." && pwd)"
CERTS_DIR="$PROD_DIR/docker/nginx/certs"
DOMAIN="${1:?Укажите домен: ./issue-cert.sh ai-panel.app [email] [--staging]}"
shift

CERTBOT_EMAIL="${CERTBOT_EMAIL:-xvandev@gmail.com}"
STAGING=""
while [ $# -gt 0 ]; do
  case "$1" in
    --staging) STAGING="--staging" ;;
    *@*) CERTBOT_EMAIL="$1" ;;
    *) echo "Неизвестный аргумент: $1" >&2; exit 1 ;;
  esac
  shift
done

WWW_DOMAIN="www.$DOMAIN"

mkdir -p "$CERTS_DIR" "$PROD_DIR/docker/nginx/certbot/.well-known/acme-challenge"

sed -e "s/__DOMAIN__/$DOMAIN/g" -e "s/__WWW_DOMAIN__/$WWW_DOMAIN/g" \
  "$INIT_DIR/nginx.conf.template" > "$INIT_DIR/nginx.conf"

echo "==> Останавливаем прод-nginx (нужен свободный :80)..."
(cd "$PROD_DIR" && docker compose stop nginx 2>/dev/null) || true

cd "$INIT_DIR"
docker compose down 2>/dev/null || true
docker compose up -d nginx
sleep 2

if ! docker compose ps nginx 2>/dev/null | grep -qE "Up|running"; then
  echo "Ошибка: ssl-init nginx не запустился. Проверьте порт 80:"
  echo "  ss -tlnp | grep ':80 '"
  docker compose logs nginx 2>/dev/null || true
  exit 1
fi

if command -v dig >/dev/null 2>&1; then
  A_RECORD=$(dig +short A "$DOMAIN" 2>/dev/null | head -1)
  AAAA_RECORD=$(dig +short AAAA "$DOMAIN" 2>/dev/null | head -1)
  echo "==> DNS $DOMAIN: A=${A_RECORD:-нет} AAAA=${AAAA_RECORD:-нет}"
  if [ -n "$AAAA_RECORD" ]; then
    echo "    Внимание: есть AAAA — LE проверяет IPv6. Если IPv6 не настроен, удалите AAAA."
  fi
fi

TEST_FILE="preflight-$(date +%s)"
TEST_PATH="$PROD_DIR/docker/nginx/certbot/.well-known/acme-challenge/$TEST_FILE"
echo "ssl-init-ok" > "$TEST_PATH"
if ! curl -sf -H "Host: $DOMAIN" "http://127.0.0.1/.well-known/acme-challenge/$TEST_FILE" | grep -q ssl-init-ok; then
  echo "Ошибка: ACME webroot недоступен (Host: $DOMAIN)"
  echo "  curl -v -H 'Host: $DOMAIN' http://127.0.0.1/.well-known/acme-challenge/$TEST_FILE"
  docker compose logs nginx
  rm -f "$TEST_PATH"
  exit 1
fi
rm -f "$TEST_PATH"
echo "==> ACME webroot на :80 — OK"

echo "==> certbot: $DOMAIN, $WWW_DOMAIN ($CERTBOT_EMAIL)${STAGING:+ [staging]}"

set +e
CERTBOT_OUT=$(docker compose --profile certbot run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  --preferred-challenges http \
  -d "$DOMAIN" -d "$WWW_DOMAIN" \
  --cert-name "$DOMAIN" \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING \
  -n 2>&1)
CERTBOT_EXIT=$?
set -e

echo "$CERTBOT_OUT"

docker compose down 2>/dev/null || true

if [ "$CERTBOT_EXIT" -ne 0 ]; then
  echo ""
  echo "Certbot завершился с ошибкой ($CERTBOT_EXIT)."
  echo "Частые причины:"
  echo "  • 503 от Let's Encrypt — повторите через 5–10 мин или добавьте --staging"
  echo "  • DNS не указывает на этот сервер"
  echo "  • AAAA (IPv6) ведёт не сюда"
  echo "  • Порт 80 снаружи закрыт"
  exit "$CERTBOT_EXIT"
fi

echo ""
echo "Готово: $CERTS_DIR/live/$DOMAIN/{fullchain,privkey}.pem"
echo "(nginx читает этот путь напрямую — раскладывать копии не нужно)"
echo ""
echo "Запустите прод: cd $PROD_DIR && docker compose up -d"
