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
  Min,
} from 'class-validator';
import { INFOBLOCK_CODE_MESSAGE, INFOBLOCK_CODE_PATTERN } from './create-infoblock-section.dto';

/** Частичное обновление; `sectionId` в теле — это перенос инфоблока в другой раздел. */
export class UpdateInfoblockDto {
  @ApiPropertyOptional({ example: 1, description: 'Перенос инфоблока в другой раздел' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;

  @ApiPropertyOptional({ example: 'news' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(INFOBLOCK_CODE_PATTERN, { message: INFOBLOCK_CODE_MESSAGE })
  code?: string;

  @ApiPropertyOptional({ example: 'Новости компании' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Выводятся на главной', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Новость' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  elementName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
