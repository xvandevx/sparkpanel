import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { INFOBLOCK_CODE_MESSAGE, INFOBLOCK_CODE_PATTERN } from './create-infoblock-section.dto';
import { CalendarDate } from './create-infoblock-element.dto';

/** Частичное обновление: приходит только то, что меняли. */
export class UpdateInfoblockElementDto {
  @ApiPropertyOptional({ example: 'otkrytie-ofisa' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(INFOBLOCK_CODE_PATTERN, { message: INFOBLOCK_CODE_MESSAGE })
  code?: string;

  @ApiPropertyOptional({ example: 'Открытие нового офиса' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Коротко о главном', nullable: true })
  @IsOptional()
  @IsString()
  preview?: string | null;

  @ApiPropertyOptional({ example: '<p>Полный текст</p>', nullable: true })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({ example: '/files/1/2026/09/banner.jpg', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  image?: string | null;

  @ApiPropertyOptional({ example: '2026-09-16', nullable: true })
  @IsOptional()
  @Validate(CalendarDate)
  date?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: 'object', example: {} })
  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}
