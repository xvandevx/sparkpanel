import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { INFOBLOCK_CODE_MESSAGE, INFOBLOCK_CODE_PATTERN } from './create-infoblock-section.dto';

/**
 * Частичное обновление: приходит только то, что меняли. Поля, которых нет
 * в теле, остаются как есть.
 */
export class UpdateInfoblockSectionDto {
  @ApiPropertyOptional({ example: 'content' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(INFOBLOCK_CODE_PATTERN, { message: INFOBLOCK_CODE_MESSAGE })
  code?: string;

  @ApiPropertyOptional({ example: 'Контент сайта' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Всё, что редакторы наполняют сами', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
