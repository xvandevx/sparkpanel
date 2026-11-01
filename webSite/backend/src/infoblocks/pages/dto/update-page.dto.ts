import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PAGE_CODE_MESSAGE, PAGE_CODE_PATTERN } from './create-page.dto';
import { SortField } from '../../record-sort';

/**
 * Частичное обновление: приходит только то, что меняли. Поля, которых нет в теле,
 * остаются как есть. `parentId: null` — осознанный перенос страницы в корень сайта.
 */
export class UpdatePageDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Перенос в другого родителя; null — в корень сайта',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;


  @ApiPropertyOptional({ example: 'about' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(PAGE_CODE_PATTERN, { message: PAGE_CODE_MESSAGE })
  code?: string;

  @ApiPropertyOptional({ example: 'О компании' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}
