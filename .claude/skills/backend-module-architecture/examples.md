# Backend module — примеры (aiAdmin)

Канонический вид модуля. Сущность `Item` здесь — плейсхолдер: подставь свою.

## Тонкий контроллер

```typescript
// backend/src/items/items.controller.ts
@ApiTags("items")
@ApiBearerAuth("JWT-auth")
@Controller("items")
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @ApiOperation({ summary: "Список записей текущего пользователя" })
  @ApiOkResponse({ type: [Item] })
  @Get()
  findAll(@Req() req) {
    // userId — ИЗ ТОКЕНА (AuthGuard кладёт user в req), не из запроса
    return this.itemsService.findAll(req.user.id);
  }

  @ApiOperation({ summary: "Обновить свою запись" })
  @ApiOkResponse({ type: Item })
  @Put(":id")
  update(@Param("id") id: string, @Body() dto: UpdateItemDto, @Req() req) {
    return this.itemsService.update(id, req.user.id, dto);
  }
}
```

Контроллер не знает ни про модели, ни про транзакции — только маршрут, токен и вызов сервиса.

## Сервис: изоляция по userId

```typescript
// backend/src/items/items.service.ts
@Injectable()
export class ItemsService {
  constructor(
    @InjectModel(Item) private readonly itemRepo: typeof Item,
  ) {}

  create(userId: number, dto: CreateItemDto) {
    return this.itemRepo.create({ ...dto, userId }); // userId дописываем сами
  }

  findAll(userId: number) {
    return this.itemRepo.findAll({
      where: { userId },                 // ← только записи владельца
      order: [["position", "ASC"]],
    });
  }

  async findOne(id: string, userId: number) {
    const item = await this.itemRepo.findOne({ where: { id, userId } }); // ← id И userId
    if (!item) throw new NotFoundException("Запись не найдена");
    return item;
  }
}
```

Чужую строку достать нельзя физически: `userId` всегда в `where`, а не проверяется `if`-ом
после выборки.

## Удаление с зависимыми записями — в транзакции

```typescript
async remove(id: string, userId: number) {
  const item = await this.itemRepo.findOne({ where: { id, userId } });
  if (!item) throw new NotFoundException("Запись не найдена");

  // У children.itemId — FK без ON DELETE CASCADE, поэтому удалять родителя
  // с детьми нельзя напрямую (Postgres вернёт FK-ошибку → 500).
  await this.itemRepo.sequelize.transaction(async (transaction) => {
    await this.childRepo.destroy({ where: { itemId: id }, transaction });
    await item.destroy({ transaction });
  });
  return { deleted: 1 };
}
```

## DTO: без userId, с валидацией и Swagger

```typescript
// backend/src/items/dto/item.dto.ts
export class CreateItemDto {
  @ApiProperty({ example: "Новая запись", description: "Название" })
  @IsString()
  title: string;

  @ApiProperty({ required: false, description: "ID родителя" })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  // userId здесь НЕТ и быть не должно — он приходит из JWT
}
```

`UpdateItemDto` пишем явно (те же поля, все `@IsOptional()`), а не через `PartialType` —
так у каждого поля остаётся своё `@ApiProperty`, и сгенерированный клиент фронта получает
нормальные типы.

## Модель: плоское дерево, индексы, Swagger-описания

```typescript
// backend/src/items/item.model.ts
// ВАЖНО: не импортируем сюда связанные модели — это создаёт цикл импортов
// (a.model → b.model → a.model), из-за которого класс оказывается undefined
// в момент вычисления @ApiOkResponse и схема пропадает из Swagger.
// Связь описываем на стороне ребёнка через @BelongsTo(() => Item).

@Table({
  tableName: "items",
  indexes: [
    { fields: ["userId"] },   // записи владельца
    { fields: ["parentId"] }, // дочерние записи
  ],
})
export class Item extends Model<Item, ItemCreationAttrs> {
  @ApiProperty({ example: "3f2b1c9a-...", description: "Уникальный идентификатор" })
  @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4, primaryKey: true })
  id: string;

  @ApiProperty({ example: "Новая запись", description: "Название" })
  @Column({ type: DataType.STRING, allowNull: false })
  title: string;

  // Дерево — самоссылка, а не вложенный children[]: собирать дерево будет фронт
  @Column({ type: DataType.UUID, allowNull: true })
  parentId: string | null;
}
```

Дженерик `Model<Item, ItemCreationAttrs>` описывает, какие поля обязательны при `create`.

## Регистрация нового модуля

```typescript
// backend/src/app.module.ts
SequelizeModule.forRoot({
  // ...
  models: [Users, Item, /* + новая модель */],
}),
// ...
imports: [/* ... */, ItemsModule, /* + новый модуль */],
```

Отдельных миграций нет — схема приводится к моделям при старте (`sync: { alter: true }`).

## После изменения API — перегенерировать клиент фронта

```bash
cd webSite/backend && npm run start:dev        # Swagger на http://localhost:3402/api/docs-json
cd webSite/frontend && npm run generate-api    # или generate-api:clean
```

Подробности — skill `frontend-api-client`.
