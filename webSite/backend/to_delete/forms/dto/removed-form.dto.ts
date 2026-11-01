import { ApiProperty } from '@nestjs/swagger';

/** Результат удаления формы: вместе с ней уходят все её поля. */
export class RemovedFormDto {
  @ApiProperty({ example: 3, description: 'Сколько полей удалено вместе с формой' })
  removedFields: number;
}
