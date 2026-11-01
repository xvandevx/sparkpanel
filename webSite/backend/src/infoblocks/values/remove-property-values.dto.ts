import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString } from 'class-validator';

/**
 * Записи, чьи значения стираем: удалённая запись и все вложенные в неё —
 * страница уходит вместе с дочерними. Ключи — через запятую в запросе.
 */
export class RemovePropertyValuesQueryDto {
  @ApiProperty({ type: String, example: '5,6,7', description: 'Ключи записей через запятую' })
  @Transform(({ value }) =>
    String(value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  )
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  recordIds: string[];
}

export class RemovedPropertyValuesDto {
  @ApiProperty({ example: 3, description: 'Сколько записей потеряли значения' })
  removed: number;
}
