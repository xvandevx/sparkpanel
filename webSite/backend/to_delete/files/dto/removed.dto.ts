import { ApiProperty } from '@nestjs/swagger';

/** Результат удаления: какую запись убрали. */
export class RemovedDto {
  @ApiProperty({ example: 1, description: 'Идентификатор удалённой записи' })
  id: number;
}
