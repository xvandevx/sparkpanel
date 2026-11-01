# aiAdmin backend

NestJS 9 + `sequelize-typescript` + PostgreSQL. API админ-панели.

Полные правила работы с кодом — [`../CLAUDE.md`](../CLAUDE.md) и skill
`backend-module-architecture` (`.claude/skills/` в корне репозитория).

## Запуск

```bash
cp .env.example .env          # один раз
npm install
npm run start:dev             # :3402, с watch
```

Postgres должен быть поднят: `docker compose up -d postgres` из `webSite/` (наружу :3403).
Приложение целиком открывается на http://localhost:3400 (nginx), Swagger —
http://localhost:3400/api/docs (JSON: `/api/docs-json`).

Весь стек одной командой: `../scripts/dev.sh`.

## Команды

```bash
npm run start:dev    # dev с watch (:3402)
npm run build        # nest build -> dist/
npm run start:prod   # node dist/main
npm run lint         # eslint --fix
npm run format       # prettier --write src/**/*.ts
npm test             # jest (все *.spec.ts под src/)
npm test -- users    # один набор: подстрока имени файла теста
```

## Авторизация

| Метод | Что делает |
|-------|-----------|
| `GET /api/auth/setup` | `{ needsRoot }` — нужна ли первичная настройка. Публичный |
| `POST /api/auth/setup` | Создаёт единственного root-пользователя и сразу выдаёт токен. Публичный, но работает только пока root нет (иначе 409) |
| `POST /api/auth/login` | `{ email, password }` → `{ token, user }`. Публичный (`@Public()`) |
| `GET /api/auth/me` | Текущий пользователь по `Authorization: Bearer <token>` |

- Пароли хранятся bcrypt-хэшем в `users.passwordHash`; наружу пользователь отдаётся только
  через `UserDto`, поэтому хэш не может попасть в ответ.
- На «нет такого пользователя» и «неверный пароль» отвечаем одинаково (401, один текст),
  иначе форма логина превращается в проверялку существующих email.
- Регистрации нет: первый и единственный root заводится через экран первичной настройки
  (`POST /api/auth/setup`). Через env администратор не задаётся.
- **Второго root быть не может.** Проверки `hasRoot()` в сервисе мало: между SELECT и INSERT
  пролезет параллельный запрос, а эндпоинт открыт без авторизации. Гарантию даёт частичный
  уникальный индекс `users_single_root` (`UNIQUE (role) WHERE role = 'root'`); нарушение
  уникальности сервис превращает в 409.
- Сбросить настройку в dev: `DELETE FROM users;` — страница снова предложит создать root.
- `JwtModule` подключён через `registerAsync` + `ConfigService`: синхронный `register` прочитал бы
  `process.env.PRIVATE_KEY` раньше, чем `ConfigModule` загрузит `.env`, и логин падал бы
  с `secretOrPrivateKey must have a value`.

## Договорённости

- Глобальный префикс `api`, Swagger на `/api/docs`, порт из `PORT` (локально 3402,
  в контейнере 3010).
- `AuthGuard` подключается как `APP_GUARD` — **все маршруты защищены по умолчанию**,
  публичные помечаются `@Public()`.
- `userId` берётся из JWT (`req.user.id`), **никогда** из тела запроса.
- Схема БД авто-мигрируется (`synchronize: true`, `sync: { alter: true }`) — отдельных
  файлов миграций нет. Новая сущность регистрируется в `models: [...]`, её модуль — в
  `imports: [...]` в `app.module.ts`.
- Один модуль = одна фича: `<feature>/{model, dto, service, controller, module}`.
