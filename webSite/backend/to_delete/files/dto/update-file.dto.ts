import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/** Частичное обновление карточки файла. Сам файл не меняется — его перезаливают заново. */
export class UpdateFileDto {
  @ApiPropertyOptional({ example: 'Баннер на главной', nullable: true })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 2, description: 'Перенести файл в другой раздел' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;
}
