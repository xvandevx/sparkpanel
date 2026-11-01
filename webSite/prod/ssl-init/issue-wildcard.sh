#!/bin/sh
# Выпуск WILDCARD-сертификата *.ai-panel.app + ai-panel.app (DNS-01, вручную).
# Wildcard нельзя выпустить по HTTP-01 — только через DNS-01 (TXT-запись).
# Такой сертификат покрывает ai-panel.app, www.ai-panel.app и любые другие *.ai-panel.app
# (пригодится, когда появятся api./admin./demo. поддомены).
#
# Прод-nginx останавливать НЕ нужно (порт 80 не задействован).
#
# Usage: ./issue-wildcard.sh [domain] [email] [--staging]
set -e
INIT_DIR="$(cd "$(dirname "$0")" && pwd)"

DOMAIN="${1:-ai-panel.app}"
case "$1" in *@*|--staging|"") ;; *) shift 2>/dev/null || true ;; esac

CERTBOT_EMAIL="${CERTBOT_EMAIL:-xvandev@gmail.com}"
STAGING=""
for arg in "$@"; do
  case "$arg" in
    --staging) STAGING="--staging" ;;
    *@*) CERTBOT_EMAIL="$arg" ;;
  esac
done

echo "==> Wildcard-сертификат для *.$DOMAIN + $DOMAIN ($CERTBOT_EMAIL)${STAGING:+ [staging]}"
echo "    Certbot попросит создать TXT-запись _acme-challenge.$DOMAIN — добавьте её в DNS,"
echo "    дождитесь распространения (dig +short TXT _acme-challenge.$DOMAIN) и нажмите Enter."
echo ""

cd "$INIT_DIR"
docker compose --profile certbot run --rm -it certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d "$DOMAIN" -d "*.$DOMAIN" \
  --cert-name "$DOMAIN" \
  --email "$CERTBOT_EMAIL" \
  --agree-tos \
  --no-eff-email \
  $STAGING

echo ""
echo "Готово: сертификат в certs/live/$DOMAIN/. Reload прод-nginx:  cd .. && docker compose exec nginx nginx -s reload"
