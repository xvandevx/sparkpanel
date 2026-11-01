import { ApiProperty } from '@nestjs/swagger';

/** Результат удаления: страница удаляется вместе со всем поддеревом. */
export class RemovedPagesDto {
  @ApiProperty({ example: 3, description: 'Сколько страниц удалено вместе с вложенными' })
  removed: number;
}
