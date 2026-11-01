#!/bin/sh
# Продление Let's Encrypt для aiAdmin.
# Прод-nginx на :80 делает 301-редирект, поэтому продление HTTP-01 идёт через
# временный nginx из ssl-init (прод-nginx на время останавливается, ~20 секунд).
#
# Wildcard *.ai-panel.app (если выпускался по DNS-01 --manual) автоматически НЕ продлевается —
# его нужно перевыпускать вручную: cd ssl-init && ./issue-wildcard.sh ai-panel.app
#
# Cron (2 раза в сутки; реально certbot перевыпустит только если < 30 дней до конца):
#   15 3,15 * * * cd /home/deploy/aipanel && ./renew-ssl.sh >> /var/log/aipanel-renew.log 2>&1
set -e
PROD_DIR="$(cd "$(dirname "$0")" && pwd)"
INIT_DIR="$PROD_DIR/ssl-init"

# Универсальный временный nginx :80 — отдаёт ACME webroot для любого домена.
cat > "$INIT_DIR/nginx.conf" <<'NGINX'
server {
    listen 80 default_server;
    server_name _;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/certbot;
        default_type "text/plain";
    }
    location / { return 200 "renew ok\n"; default_type text/plain; }
}
NGINX

echo "==> Останавливаем прод-nginx..."
(cd "$PROD_DIR" && docker compose stop nginx) || true

cd "$INIT_DIR"
docker compose down 2>/dev/null || true
docker compose up -d nginx
sleep 2

echo "==> certbot renew (HTTP-01 webroot)..."
docker compose --profile certbot run --rm certbot renew \
  --webroot -w /var/www/certbot --quiet || \
  echo "    (часть сертификатов могла не продлиться — напр. wildcard, он DNS-01/manual)"

docker compose down 2>/dev/null || true

# Копировать ничего не нужно: nginx смотрит прямо в certs/live/<domain>/,
# а certbot при продлении просто перевешивает симлинки на новый archive/*N.pem.
echo "==> Запускаем прод-nginx..."
(cd "$PROD_DIR" && docker compose up -d nginx)
docker compose -f "$PROD_DIR/docker-compose.yml" exec nginx nginx -t || true
echo "Готово."
