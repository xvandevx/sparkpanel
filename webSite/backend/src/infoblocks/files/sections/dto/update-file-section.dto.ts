import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { SortField } from '../../../record-sort';

/** Частичное обновление: `parentId: null` — осознанный перенос в корень. */
export class UpdateFileSectionDto {
  @ApiPropertyOptional({ example: 1, nullable: true, description: 'Новый родитель; null — корень' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ example: 'Баннеры' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @SortField()
  sort?: number;
}
