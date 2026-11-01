# Прод aiAdmin (ai-panel.app)

> **TODO(домен).** `ai-panel.app` — рабочая заглушка. Когда домен появится, заменить его в
> `docker/nginx/conf.d/ai-panel.conf`, `.env.example` (`GOOGLE_CALL_BACK`), этом README
> и в Google Cloud Console.

На сервер копируется **только эта папка** `prod/` целиком. Внутри — `docker-compose.yml`,
nginx-конфиги (`docker/nginx/`), инструмент выпуска SSL (`ssl-init/`) и скрипт продления
(`renew-ssl.sh`). Код на сервер не едет: приложения приезжают готовыми образами из GHCR,
которые собирает CI.

Сервисы: nginx (80/443) → `frontend` (Next.js SSR, :3000) и `backend` (NestJS, :3010),
`postgres` (только на петлевом интерфейсе), `dozzle` (UI логов, :9000). Файлы медиатеки —
папка `docker/uploads`, её монтирует `backend`.

**Один origin.** `https://ai-panel.app/api/...` → backend, `/uploads/...` → тоже backend,
всё остальное → frontend.
Так задумано: Google OAuth-колбэк регистрируется на `https://ai-panel.app/api/auth/google/callback`,
а бэкенд после логина редиректит на `/?token=...` **относительно** — верно только при одном origin.
Плюс фронт ходит в API относительными путями ⇒ **CORS не нужен**.

| Что | Где |
|-----|-----|
| Админка | `https://ai-panel.app` (`www` → 301 на apex) |
| API | `https://ai-panel.app/api` |
| Swagger | закрыт (404). Открывается в `docker/nginx/conf.d/ai-panel.conf` под basic-auth |
| Файлы медиатеки | `https://ai-panel.app/uploads/<ключ>` — nginx передаёт backend, тот отдаёт из `docker/uploads` |
| Логи контейнеров | `http://<SERVER_IP>:9000` (Dozzle) |
| Postgres | `127.0.0.1:5432` на сервере, снаружи закрыт — только SSH-туннель |

---

## 0. Что где живёт

| Репозиторий | Что делает CI |
|-------------|---------------|
| [`ai-panel/frontend`](https://github.com/ai-panel/frontend) | push в `main` → образ `ghcr.io/ai-panel/frontend:main` → ssh → перезапуск `frontend` |
| [`ai-panel/backend`](https://github.com/ai-panel/backend) | push в `main` → тесты → образ `ghcr.io/ai-panel/backend:main` → ssh → перезапуск `backend` |
| `aiAdmin` (эта папка) | инфраструктура прода, деплоится вручную через `rsync` |

---

## 1. Установить Docker + Compose

Ubuntu/Debian, официальный репозиторий (Compose v2 идёт плагином):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker
docker --version && docker compose version
```

---

## 2. Пользователь для деплоя

Отдельный непривилегированный пользователь в группе `docker` — под ним ходит CI:

```bash
sudo adduser deploy                     # спросит и задаст пароль
sudo usermod -aG docker deploy          # docker без sudo
```

### Ключ для CI (рекомендуется — надёжнее пароля)

На **рабочей машине** генерируем пару специально для деплоя:

```bash
ssh-keygen -t ed25519 -C "github-actions-aipanel" -f ~/.ssh/aipanel_deploy -N ""
cat ~/.ssh/aipanel_deploy.pub      # это в authorized_keys на сервере
cat ~/.ssh/aipanel_deploy          # это целиком (с BEGIN/END) в секрет REMOTE_SERVER_SSH_KEY
```

На **сервере**:

```bash
sudo mkdir -p /home/deploy/.ssh
sudo nano /home/deploy/.ssh/authorized_keys      # вставить содержимое aipanel_deploy.pub
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh
```

Проверка с рабочей машины:

```bash
ssh -i ~/.ssh/aipanel_deploy deploy@<SERVER_IP> "docker ps"
```

Дальше всё делаем под `deploy` (перелогиниться, чтобы применилась группа `docker`).

---

## 3. Скопировать `prod/` на сервер

С рабочей машины, из `webSite/`:

```bash
rsync -avz --exclude '.env' --exclude 'docker/postgres' --exclude 'docker/uploads' ./prod/ deploy@<SERVER_IP>:/home/deploy/aipanel/
```

Образы `ghcr.io/ai-panel/*` приватные — залогиниться в GHCR (PAT с `read:packages`):

```bash
echo <GHCR_TOKEN> | docker login ghcr.io -u <github_user> --password-stdin
```

---

## 4. DNS

`A`-записи `ai-panel.app` и `www.ai-panel.app` → IP сервера. `AAAA` не заводить, пока IPv6
не настроен: Let's Encrypt проверяет IPv6 первым и выпуск сертификата упадёт по таймауту.

```bash
dig +short A ai-panel.app
```

---

## 5. Сертификаты SSL

Порт 80 у прод-nginx занят под 301-редирект, поэтому выпуск идёт через временный nginx
из `ssl-init/` (прод-nginx на это время останавливается). Подробно — [`ssl-init/README.md`](ssl-init/README.md).

```bash
cd /home/deploy/aipanel/ssl-init
chmod +x *.sh
./issue-cert.sh ai-panel.app          # HTTP-01, вместе с www.ai-panel.app
# репетиция без лимитов LE:  ./issue-cert.sh ai-panel.app --staging
cd ..
```

Certbot положит сертификат в `docker/nginx/certs/live/ai-panel.app/` — nginx читает этот путь
напрямую, копировать никуда не нужно. Файлы останутся с владельцем `root` (certbot пишет их из
контейнера) — это нормально, nginx работает от root и читает их без проблем.

`dhparam.pem` (нужен nginx-конфигу) генерируется один раз, ~1–2 минуты:

```bash
openssl dhparam -out docker/nginx/certs/dhparam.pem 2048
```

Когда появятся поддомены (`api.`, `demo.`) — удобнее wildcard по DNS-01:
`cd ssl-init && ./issue-wildcard.sh ai-panel.app`.

---

## 6. Поднять сервис

```bash
cd /home/deploy/aipanel
cp .env.example .env
nano .env                            # заполнить секреты (таблица ниже)
mkdir -p docker/uploads && sudo chown 1001:1001 docker/uploads   # файлы медиатеки: пишет nestjs (uid 1001)

docker compose config                # проверка конфига
docker compose pull                  # подтянуть образы из GHCR
docker compose up -d
```

`.env` (пути/хосты/порты — в `docker-compose.yml`, секреты — только здесь):

| Переменная | Куда идёт |
|------------|-----------|
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | postgres + backend |
| `PRIVATE_KEY` | backend — подпись JWT (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | backend — срок жизни токена (по умолчанию `7d`) |


**Первый вход.** Регистрации в панели нет и администратор не задаётся через env: откройте
`https://<домен>/admin` сразу после деплоя — панель сообщит, что главного администратора нет,
и предложит создать его. Эндпоинт первичной настройки публичный и одноразовый: как только root
создан, он отвечает 409, а второго root не даст создать уникальный индекс в БД. Поэтому
**сделайте это первым делом после того, как сайт поднялся** — иначе root заведёт кто-то другой.

**Внимание:** переменные из блока `environment:` сервиса **перекрывают** одноимённые
из `env_file`. Сейчас в `environment:` у backend только `NODE_ENV` и `POSTGRES_HOST`/`POSTGRES_PORT`,
остальное берётся из `.env`.

Google OAuth пока не подключён (в `.env.example` переменные закомментированы). Когда дойдёт
до него — Redirect URI должен посимвольно совпадать с тем, что прописано в Google Cloud Console
→ Credentials → OAuth 2.0 Client ID → Authorized redirect URIs.

Переменные фронтенда живут в `docker-compose.yml` (секретов там нет):

| Переменная | Кто читает | Зачем |
|------------|-----------|-------|
| `NEXT_PUBLIC_API_HOST` | браузер | Пусто ⇒ относительные `/api`-пути, тот же origin, без CORS |
| `API_HOST` | SSR внутри контейнера | `http://backend:3010` — `getServerSideProps` не может ходить по относительному пути, нужен абсолютный URL |

Обе нужны одновременно: первая — для кода в браузере, вторая — для кода, который Next
выполняет у себя на сервере (проверка токена при SSR). Забыть `API_HOST` — значит после
логина Google получить редирект на лендинг вместо интерфейса.

Проверка:

```bash
docker compose ps
docker compose exec nginx nginx -t
curl -I https://ai-panel.app
docker compose logs -f backend frontend
```

---

## 7. Секреты GitHub Actions

Одинаковый набор в **обоих** репозиториях (`ai-panel/frontend` и `ai-panel/backend`),
Settings → Secrets and variables → Actions → New repository secret:

| Секрет | Значение |
|--------|----------|
| `GHCR_PAT` | GitHub PAT (classic) с правами `write:packages`, `read:packages` |
| `REMOTE_SERVER_HOST` | IP или домен сервера |
| `REMOTE_SERVER_USERNAME` | `deploy` |
| `REMOTE_SERVER_SSH_KEY` | приватный ключ `~/.ssh/aipanel_deploy` целиком |
| `REMOTE_SERVER_SSH_PORT` | `22` |
| `DEPLOY_PATH` | `/home/deploy/aipanel` |

Первый образ надо запушить до `docker compose up -d` — иначе `pull` не найдёт тег.
Проще всего: сделать пустой коммит в `main` (или запустить workflow вручную —
в обоих есть `workflow_dispatch`).

Пакеты в GHCR по умолчанию приватные. Убедитесь, что у пользователя `deploy` на сервере
выполнен `docker login ghcr.io` (шаг 3) — CI логинится сам, но первый ручной `pull`
без этого не пройдёт.

---

## 8. Передеплой и эксплуатация

**Обычный релиз** — просто push в `main` соответствующего репозитория. CI соберёт образ
и перезапустит только свой контейнер (`--no-deps`), остальное не трогает.

Руками, если нужно:

```bash
cd /home/deploy/aipanel
docker compose pull
docker compose up -d
docker image prune -f
```

Откат на предыдущий образ:

```bash
docker images ghcr.io/ai-panel/frontend        # найти прошлый IMAGE ID
docker tag <IMAGE_ID> ghcr.io/ai-panel/frontend:main
docker compose up -d --no-deps frontend
```

Изменили `nginx`-конфиг или `docker-compose.yml` — залейте `rsync`-ом (шаг 3) и:

```bash
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
# при правке compose:  docker compose up -d
```

### Доступ к базе с рабочей машины

Postgres слушает только петлевой интерфейс сервера (`127.0.0.1:5432` в `docker-compose.yml`),
из интернета к нему подключиться нельзя. Доступ — через SSH-туннель.

**Вариант 1 — туннель в терминале.** Локальный порт берём 5433: на рабочей машине 5432
занят сторонним сервисом.

```bash
ssh -N -L 5433:127.0.0.1:5432 deploy@<SERVER_IP>
```

Терминал останется занят (`-N` — без запуска команды), туннель живёт, пока он открыт.
В другом окне:

```bash
psql -h 127.0.0.1 -p 5433 -U aipanel -d aipanel
```

**Вариант 2 — DataGrip / WebStorm (туннель поднимет сама IDE).**

1. **New → Data Source → PostgreSQL**.
2. Вкладка **SSH/SSL** → галка **Use SSH tunnel** → **...**:
   - Host: `<SERVER_IP>`, Port: `22`, User name: `deploy`
   - Auth type: **Key pair**, Private key file: `~/.ssh/aipanel_deploy` (тот же ключ, что у CI)
3. Вкладка **General** — параметры пишем так, как их видит **сервер**, IDE сама прокинет их
   через туннель:
   - Host: `127.0.0.1`, Port: `5432`
   - Database / User: `aipanel`, Password — `POSTGRES_PASSWORD` из `prod/.env`
4. **Test Connection** → **OK**.

Частая ошибка: указать в General порт `5433` — это порт локального туннеля из варианта 1,
а IDE строит собственный и обращается к серверному `5432`.

**Бэкап:**

```bash
cd /home/deploy/aipanel
docker compose exec -T postgres pg_dump -U aipanel aipanel | gzip > ~/aipanel-$(date +%F).sql.gz
```

Забрать дамп на рабочую машину:

```bash
scp deploy@<SERVER_IP>:~/aipanel-*.sql.gz ./
```

### Файлы медиатеки

Раздел «Файлы» хранит картинки и документы не в базе, а папкой на диске.

| Что | Где |
|-----|-----|
| Данные (сами файлы) | `/home/deploy/aipanel/docker/uploads` на сервере — **второй том с данными помимо postgres** |
| В контейнере | `/data/uploads` (`UPLOADS_DIR` в образе бэкенда), владелец — uid 1001 (`nestjs`) |
| Раскладка | файл лежит по своему ключу: `00/00/78/voprosy-i-otvety.pdf` (папки — из номера файла) |
| Публичные ссылки | `https://<домен>/uploads/<ключ>` — nginx передаёт бэкенду (`location /uploads/`) |

Отдаёт файлы сам бэкенд: тип по расширению, `.html`/`.svg` — только на скачивание, вечный
кэш. Списка файлов папки по `/uploads/` нет. Ссылки, которые бэкенд отдаёт фронту,
**относительные** (`/uploads/...`) — тот же origin, что и у панели.

S3 при желании подключается в самой панели — «Настройки → Хранилища», новые файлы
пойдут туда; уже загруженные остаются в папке.

**Бэкап тома.** Дамп базы файлы **не** включает — их надо забирать отдельно, обычным архивом:

```bash
cd /home/deploy/aipanel
sudo tar czf ~/aipanel-media-$(date +%F).tar.gz -C docker uploads
```

Файл записывается целиком и потом не меняется, так что останавливать бэкенд не нужно.
Восстановление — распаковать обратно в `docker/` и вернуть владельца:
`sudo chown -R 1001:1001 docker/uploads`.

### Продление сертификатов (cron)

```bash
crontab -e
```

```cron
15 3,15 * * * cd /home/deploy/aipanel && ./renew-ssl.sh >> /var/log/aipanel-renew.log 2>&1
```

HTTP-01 домены продлеваются автоматически (nginx на ~20 секунд уходит в даун).
Wildcard, если будет выпущен по DNS-01, — вручную раз в ~2–3 месяца.

---

## Отличия от локального dev

- Локально nginx проксирует на `host.docker.internal` (dev-серверы на хосте), в проде —
  на контейнеры `frontend`/`backend` по имени сервиса.
- Локально стек висит на портах `340x` (nginx :3400, Next :3401, Nest :3402, Postgres :3403),
  в проде — стандартные 80/443 снаружи и 3000/3010/5432 внутри сети контейнеров.
- Файлы медиатеки локально — папка `backend/uploads` (бэкенд на хосте), в проде —
  `docker/uploads`, примонтированная в контейнер бэкенда как `/data/uploads`.
- Локально всё по `http://localhost:3400`, в проде — HTTPS с HSTS.
- Схема БД мигрируется самим NestJS (`sequelize sync: { alter: true }`) — отдельного шага
  миграций в деплое нет.

## Частые проблемы

- **`nginx: cannot load certificate`** при первом `up -d` — сертификата ещё нет, сначала шаг 5.
- **502 от nginx** — контейнер приложения не поднялся: `docker compose logs backend`.
- **Google OAuth возвращает `redirect_uri_mismatch`** — URI в Google Console не совпадает
  с `GOOGLE_CALL_BACK` посимвольно (протокол, `www`, слеш на конце).
- **CI падает на `docker login`** — истёк `GHCR_PAT` или у него нет `write:packages`.
- **Загрузка файла падает с `EACCES`** — папка `docker/uploads` на сервере не принадлежит
  uid 1001: `sudo chown -R 1001:1001 docker/uploads`.
