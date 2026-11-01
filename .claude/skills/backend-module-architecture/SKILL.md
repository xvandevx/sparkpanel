---
name: backend-module-architecture
description: >-
  Use when writing, refactoring, or reviewing backend code in aiAdmin (webSite/backend/) —
  NestJS modules, controllers, services, DTOs, Sequelize models. Covers the
  one-module-per-feature layout, thin controllers with no business logic, DTO/type
  isolation, migrations for every schema change, and the rule that userId (record author) always comes from the JWT and
  never from the request body. Triggers on new endpoints, new entities, changes
  under backend/src, and API reviews.
---

# Backend Module Architecture (aiAdmin)

Правила API-слоя для стека aiAdmin: NestJS 9 + `sequelize-typescript` + PostgreSQL.
Доменная модель — `webSite/backend/src/DOMAIN.md`.

## Когда применять

- Новый эндпоинт, новая сущность или новый модуль
- Рефакторинг существующего контроллера/сервиса
- Ревью изменений в `backend/src/`

---

## 1. Один модуль = одна фича

```
backend/src/<feature>/
  <feature>.controller.ts   тонкий HTTP-слой
  <feature>.service.ts      вся бизнес-логика и доступ к БД
  <feature>.module.ts       сборка модуля
  <feature>.model.ts        Sequelize-модель
  dto/<feature>.dto.ts      Create*/Update* DTO — изолированы в dto/
```

Регистрация новой сущности — в `app.module.ts`: модель в `models: [...]`, модуль в `imports: [...]`.
Схема БД — **миграциями**: `sync: { alter: false }` только создаёт новые таблицы.
Новая колонка, индекс, переименование, перенос данных в существующей таблице —
файл `src/migrations/NNNN-суть.ts` в конец списка `MIGRATIONS` (`migrations/index.ts`),
переживающий повторный запуск (`IF NOT EXISTS`, условия в `WHERE`). Применённую
миграцию не правят — исправляют следующей.

**Любая правка модели или схемы — сначала спросить пользователя, нужна ли миграция.**
Модель молча не правим: без миграции колонка на живых базах не появится.

Крупная фича может иметь несколько пар controller/service в одной папке — это нормально,
дробить на модули не нужно.

---

## 2. Главное правило: тонкие контроллеры (No Business Logic)

В контроллере **запрещена любая бизнес-логика**.

- **Разрешено:** описать маршрут и Swagger, достать `req.user.id`, провалидировать DTO
  (декораторами `class-validator`), вызвать сервис, вернуть результат.
- **Запрещено:** расчёты, циклы по бизнес-данным, обращения к репозиториям/`sequelize`,
  сложные `if/else` с бизнес-правилами, сборка деревьев, работа с датами.

### Чек-лист контроллера

- [ ] Только `req.user.id` → service → return
- [ ] Нет `@InjectModel` и обращений к моделям
- [ ] Нет `for`/`map`/`reduce` по бизнес-данным
- [ ] Нет транзакций и `where` — они в сервисе
- [ ] Каждый метод описан `@ApiOperation` + `@ApiOkResponse` (иначе фронт получит
      кривой сгенерированный клиент)

---

## 3. `userId` — автор, и только из JWT

Контент общий: записи всех списков видят и правят все вошедшие, `userId` записи —
кто её завёл (строка «Автор» в карточке). `AuthGuard` подключён глобально (`APP_GUARD`
в `app.module.ts`), поэтому **все маршруты защищены по умолчанию**; публичные
помечаются `@Public()`.

**`userId` берётся из `req.user.id` и НИКОГДА из тела запроса.** Если `userId` попал
в `CreateXxxDto` — это баг: любой сможет подписать запись чужим именем. Убрать из DTO,
брать из токена.

> Права по ролям — когда появятся — проверяются в сервисе по роли из того же JWT,
> а не доверием к клиенту.

---

## 4. DTO и типы

- Create/Update DTO — только в `dto/`, рядом с модулем. Не тащить типы между модулями
  без явной необходимости.
- DTO — источник Swagger-схемы, а Swagger — источник типизированного клиента фронта.
  Поменял DTO → на фронте `npm run generate-api` (см. skill `frontend-api-client`).
- Валидация — декораторами `class-validator` на DTO, а не `if`-ами в контроллере.
- Поля, которых не должно быть в теле запроса (`id`, `userId`, `createdAt`) — в DTO не выносим.

---

## 5. Модель

- PK — `UUID`, `userId` — `INTEGER`.
- Дерево — **плоское**: `parentId` + `position`, а не вложенный `children[]`.
  Сборка дерева — задача фронта (`logic/`), не БД.
- Индексы на `userId` и на все FK (`parentId`, …).
- **Не импортируй модели друг в друга.** `a.model → b.model → a.model` даёт цикл,
  из-за которого класс оказывается `undefined` в момент вычисления `@ApiOkResponse` — и схема
  молча пропадает из Swagger (а значит, и из клиента фронта). Связь описывай на стороне ребёнка
  через `@BelongsTo(() => Parent)`.
- Каждое поле модели — с `@ApiProperty`: модель отдаётся наружу как Swagger-схема.
- FK без `ON DELETE CASCADE` ⇒ удаление родителя должно сносить детей **в транзакции**,
  иначе Postgres вернёт FK-ошибку и клиент получит 500.

---

## 6. Формат ответа агента

При написании или рефакторинге модуля выдавай результат тремя блоками:

**Блок 1 — Расположение.** Список файлов модуля и что регистрируется в `app.module.ts`.

**Блок 2 — Контроллер + сервис.** Контроллер максимально тонкий, вся логика в сервисе.

**Блок 3 — DTO и модель.** Отдельно, с указанием, нужна ли перегенерация клиента на фронте.

---

## 7. Запреты (кратко)

| ❌ Запрещено | ✅ Вместо этого |
|-------------|----------------|
| Бизнес-логика в контроллере | Сервис модуля |
| `userId` из `@Body()` | `req.user.id` из JWT |
| Модель/`sequelize` в контроллере | `@InjectModel` в сервисе |
| Правка модели без миграции | Спросить, затем `src/migrations/NNNN-суть.ts` |
| Эндпоинт без `@ApiOperation`/`@ApiOkResponse` | Полное Swagger-описание |
| Правки в `frontend/src/generated/` | `npm run generate-api` во фронте |

Примеры кода: [examples.md](examples.md).
