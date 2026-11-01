# Типизированный API-клиент (aiAdmin frontend)

Клиент к бэкенду **генерируется** из Swagger-документации NestJS. Руками код клиента
не пишем и не правим.

## Раскладка

| Что | Где |
|-----|-----|
| Сгенерированный клиент и типы | `src/generated/api/` — **не редактировать** |
| Конфигурация клиента (basePath, токен) | `src/api/client.ts` |
| Базовый URL и OAuth-ссылка | `config/api.ts` |
| Data-слой приложения (обёртки) | `api/*.ts` |

Компоненты и редьюсеры **не** импортируют `src/generated/` напрямую — только через `api/*`
(см. [CLAUDE.md](CLAUDE.md), правила слоёв).

## Генерация

```bash
# 1. Бэкенд поднят, Swagger отдаётся на http://localhost:3402/api/docs-json
cd ../backend && npm run start:dev

# 2. В другом терминале, во frontend/
npm run generate-api          # или generate-api:clean — с полной очисткой src/generated
```

`generate-api` бьёт напрямую в `:3402` (минуя nginx) — так проще: генератору не нужен
поднятый фронт. Через nginx тот же JSON доступен на `http://localhost:3400/api/docs-json`.

## Конфигурация клиента

- `basePath` берётся из `API_HOST` (`config/api.ts`) и по умолчанию **пустой** ⇒ относительные
  `/api`-пути ⇒ тот же origin через nginx ⇒ CORS не нужен.
- `NEXT_PUBLIC_API_HOST` — escape hatch, если фронт поднят отдельно от API.
- JWT подставляется через `accessToken` в `Configuration` (`src/api/client.ts`).

## Troubleshooting

- **Java не найдена** (нужна генератору): `brew install openjdk@11`; путь уже вшит в скрипт
  `generate-api`.
- **`ERR_REQUIRE_ESM` при генерации**: свежий `@openapitools/openapi-generator-cli` (ESM) требует
  Node ≥20.19. На старом Node версия запинена на CJS `2.15.3` — не убирай пиннинг из `package.json`.
- **`generate-api:clean` удаляет `src/generated` ДО генерации** — если генерация упадёт, каталог
  останется пустым; перегенерируй `generate-api`, когда бэкенд поднят.
- **Эндпоинт не появился в клиенте** — у метода контроллера нет `@ApiOperation`/`@ApiOkResponse`
  или модель не размечена `@ApiProperty`. Чинить на бэкенде, см. skill `backend-module-architecture`.
