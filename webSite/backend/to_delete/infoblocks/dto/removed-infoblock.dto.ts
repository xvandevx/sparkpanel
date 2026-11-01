import { ApiProperty } from '@nestjs/swagger';

/**
 * Результат удаления: запись уходит вместе со всем, что под ней.
 * Раздел уносит свои инфоблоки, инфоблок — свои элементы.
 */
export class RemovedInfoblockDto {
  @ApiProperty({ example: 2, description: 'Сколько инфоблоков удалено вместе с разделом' })
  removedBlocks: number;

  @ApiProperty({ example: 17, description: 'Сколько элементов удалено вместе с инфоблоками' })
  removedElements: number;
}
