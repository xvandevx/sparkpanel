---
name: frontend-api-client
description: Use when writing or modifying frontend code (in webSite/frontend/) that calls the backend API in aiAdmin — how to use the auto-generated typed API client, regenerate it from the backend Swagger, handle errors, and troubleshoot. Triggers on adding/changing API calls, new endpoints, DTO types, or "generate-api".
---

# Frontend API Client (aiAdmin)

Фронтенд (`webSite/frontend/`) общается с бэкендом через **автоматически сгенерированный**
типизированный API-клиент на основе Swagger-документации бэкенда. Клиенты и типы генерируются,
руками их не пишем.

Полная справка: [webSite/frontend/API_CLIENT_README.md](../../../webSite/frontend/API_CLIENT_README.md).

## Ключевое правило

- Файлы в `frontend/src/generated/api/` **сгенерированы — не редактируем вручную**. Меняется API на
  бэкенде → перегенерируем клиент (см. ниже).
- Импортируем клиент и типы из `../src/api/client` (сконфигурированный `api` + типы DTO).
- Компоненты/редьюсеры **не дергают клиент напрямую** — только через data-слой в `frontend/api/*`
  (см. `frontend/CLAUDE.md`, слой `api/`).

## Клиент

`src/api/client.ts` создаёт `Configuration` и по одному экземпляру `*Api` на контроллер бэкенда,
плюс общий объект `api` для удобства:

```typescript
import { api } from '../src/api/client';

api.auth   // AuthApi: authControllerLogin(dto), authControllerMe()
// ...по одному полю на каждый контроллер бэкенда
```

Методы называются по контроллеру, напр. `api.auth.authControllerLogin({ email, password })`.
Точные имена смотри в `src/generated/api/apis/*` после генерации.

## Обработка ошибок

```typescript
try {
  const { data } = await api.auth.authControllerMe();
} catch (error) {
  console.error('Не удалось получить текущего пользователя:', error);
}
```

## Регенерация клиента (при изменении API бэкенда)

```bash
# 1. Бэкенд должен быть запущен (Swagger на http://localhost:3402/api/docs-json)
cd webSite/backend && npm run start:dev

# 2. В другом терминале, в папке frontend
cd webSite/frontend && npm run generate-api      # или generate-api:clean — с очисткой src/generated
```

## Конфигурация

- Базовый URL: `API_HOST` из `config/api.ts` — по умолчанию **пустая строка**, то есть относительные
  `/api`-пути и тот же origin через nginx (:3400). `NEXT_PUBLIC_API_HOST` — escape hatch, если фронт
  поднят отдельно от API. Конфигурация клиента — `src/api/client.ts`.
- JWT-токен подставляется через `accessToken` в `Configuration`.

## Troubleshooting

- **Java не найдена** (нужна генератору): `brew install openjdk@11`; путь уже вшит в скрипт `generate-api`.
- **`ERR_REQUIRE_ESM` при генерации**: свежий `@openapitools/openapi-generator-cli` (ESM) требует
  Node ≥20.19. На старом Node версия запинена на CJS `2.15.3` — не убирай пиннинг из `package.json`.
- **`generate-api:clean` удаляет `src/generated` ДО генерации** — если генерация упадёт, каталог останется
  пустым; перегенерируй `generate-api`, когда бэкенд поднят.
- **Эндпоинта нет в клиенте** — на бэкенде у метода нет `@ApiOperation`/`@ApiOkResponse` либо модель
  без `@ApiProperty`. Чинить там, см. skill `backend-module-architecture`.
