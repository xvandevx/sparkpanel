import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

/** Фильтр списка файлов. Раздел не указан — отдаём всю медиатеку пользователя. */
export class FilesQueryDto {
  @ApiPropertyOptional({ example: 1, description: 'Показать файлы только этого раздела' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;
}
