import { ApiProperty } from '@nestjs/swagger';

/**
 * Запись, к которой ведёт привязка: страница, элемент или тип контента, роль,
 * категория товаров, форма обратной связи или её поле. Адресуется так же, как настройки
 * и значения свойств: ключ списка плюс ключ записи в нём.
 */
export class LinkTargetDto {
  @ApiProperty({ example: 'infoblock-elements.3', description: 'Ключ списка' })
  listKey: string;

  @ApiProperty({ example: 'element-7', description: 'Ключ записи в списке' })
  recordId: string;

  @ApiProperty({
    example: '3',
    nullable: true,
    type: String,
    description: 'Ключ родительской записи в том же списке: выбор рисует дерево; null — верхний уровень',
  })
  parentId: string | null;

  @ApiProperty({ example: 'Кроссовки', description: 'Название записи' })
  name: string;

  @ApiProperty({ example: 'sneakers', nullable: true, description: 'Код записи' })
  code: string | null;

  @ApiProperty({ example: 'Инфоблок «Товары»', description: 'Откуда запись: группа в выборе' })
  group: string;
}
