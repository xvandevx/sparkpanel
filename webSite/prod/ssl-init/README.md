# Выпуск SSL (ai-panel.app)

Прод-nginx читает сертификаты **напрямую** из `../docker/nginx/certs/live/<домен>/{fullchain,privkey}.pem` —
это те самые симлинки certbot, копировать их никуда не нужно. Весь каталог `certs/` смонтирован
в контейнер nginx, а симлинки `live/ → ../../archive/` относительные, поэтому внутри контейнера
резолвятся корректно. Порт 80 у прод-nginx занят под 301-редирект,
поэтому выпуск/продление идёт через **временный nginx :80** из этой папки
(прод-nginx на время выпуска останавливается).

## 1. Обычный домен — HTTP-01 (это нужный вариант по умолчанию)

Выпускается вместе с `www.<домен>`:

```bash
cd prod/ssl-init
chmod +x *.sh
./issue-cert.sh ai-panel.app
# тест без лимитов Let's Encrypt:  ./issue-cert.sh ai-panel.app --staging
```

Скрипт сам делает preflight: проверяет DNS, поднимает временный nginx и убеждается,
что ACME-webroot реально отдаётся по :80 — только потом зовёт certbot.

Несколько доменов сразу:

```bash
cp domains.example domains.txt
./issue-all-certs.sh
```

## 2. Wildcard `*.ai-panel.app` — DNS-01 (вручную)

Понадобится, когда появятся поддомены (`api.`, `admin.`, `demo.`). Один сертификат
покроет `ai-panel.app`, `www.ai-panel.app` и любые `*.ai-panel.app`. Wildcard нельзя выпустить
по HTTP-01 — только DNS-01.

```bash
cd prod/ssl-init
./issue-wildcard.sh ai-panel.app
```

Certbot покажет значение TXT-записи `_acme-challenge.ai-panel.app`. Добавьте её в DNS,
дождитесь распространения и нажмите Enter:

```bash
dig +short TXT _acme-challenge.ai-panel.app   # проверка, что запись видна
```

Прод-nginx при этом останавливать не нужно.

## После выпуска

Certbot кладёт сертификат в `../docker/nginx/certs/live/<домен>/` — это ровно тот путь, который
прописан в `conf.d/ai-panel.conf`. Останется поднять/перечитать прод-nginx:

```bash
cd ..
docker compose up -d            # первый запуск
# или, если nginx уже работает:
docker compose exec nginx nginx -s reload
```

## Продление

`../renew-ssl.sh` (cron 2×/сутки) — продлевает HTTP-01 домены автоматически.
Wildcard (DNS-01/manual) продлевается вручную — `./issue-wildcard.sh ai-panel.app`.

## Файлы

| Файл | Назначение |
|------|------------|
| `issue-cert.sh` | Выпуск одного обычного домена (HTTP-01) + `www` |
| `issue-all-certs.sh` | Выпуск по списку `domains.txt` |
| `issue-wildcard.sh` | Выпуск wildcard `*.ai-panel.app` (DNS-01, вручную) |
| `nginx.conf.template` | Шаблон временного nginx :80 (→ `nginx.conf`) |
| `docker-compose.yml` | Временный nginx :80 + certbot |

## Частые проблемы

- **503 от Let's Encrypt** — повторить через 5–10 мин, при отладке `--staging`.
- **Timeout HTTP-01** — DNS `A` не на этот сервер, порт 80 закрыт снаружи, или есть лишняя `AAAA`.
- **Каталог `live/<домен>-0001/`** — certbot добавил суффикс при перевыпуске, и путь в nginx-конфиге
  перестанет совпадать. Поэтому все скрипты передают `--cert-name <домен>`: имя линии остаётся
  прежним, а `archive/` наполняется новыми файлами. Если суффикс всё же появился — удалите лишнюю
  линию (`certbot delete --cert-name <домен>-0001`) и выпустите заново.
- **`cert.pem` вместо `fullchain.pem`** — в nginx нужен именно `fullchain.pem`: `cert.pem` идёт без
  промежуточной цепочки, и часть клиентов (Android, старые браузеры) сочтёт сертификат недоверенным.
- **Владелец файлов — `root`** — так и будет: certbot пишет из контейнера от root. Это нормально,
  nginx читает их тоже от root. Менять владельца на `deploy` больше не требуется — на хосте
  сертификаты никто не читает.
- **`nginx: [emerg] cannot load certificate`** при первом `up -d` — сертификата ещё нет,
  сначала выпустите его, потом поднимайте прод.
