# ssl

Выпустить или продлить SSL-сертификат для домена aiAdmin.

## Действия

Всё выполняется **на сервере**, в папке `prod/` (обычно `/home/deploy/aipanel`).
Подробности: `webSite/prod/ssl-init/README.md`.

1. Первый выпуск (HTTP-01, вместе с `www`):
   ```bash
   cd /home/deploy/aipanel/ssl-init && chmod +x *.sh && ./issue-cert.sh ai-panel.app
   ```
   Репетиция без лимитов Let's Encrypt: `./issue-cert.sh ai-panel.app --staging`.
2. Wildcard (DNS-01, когда появятся поддомены) — интерактивно, нужен доступ к DNS:
   ```bash
   ./issue-wildcard.sh ai-panel.app
   ```
   Certbot покажет TXT `_acme-challenge.ai-panel.app`; проверить — `dig +short TXT _acme-challenge.ai-panel.app`.
3. Продление руками (обычно висит в cron 2×/сутки):
   ```bash
   cd /home/deploy/aipanel && ./renew-ssl.sh
   ```
4. После выпуска:
   ```bash
   docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
   curl -I https://ai-panel.app
   ```

## Помни

- Выпуск по HTTP-01 **останавливает прод-nginx** на ~20 секунд (порт 80 нужен временному nginx).
- Wildcard по DNS-01 автоматически не продлевается — только руками.
- Сертификаты и `prod/.env` в git не коммитятся.
- Домен `ai-panel.app` — заглушка: если он изменился, сначала поправь
  `prod/docker/nginx/conf.d/ai-panel.conf` и `prod/.env`.
