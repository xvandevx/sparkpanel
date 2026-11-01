import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateInfoblockDto {
  @ApiProperty({ example: 1, description: 'Раздел, в котором заводится инфоблок' })
  @Type(() => Number)
  @IsInt()
  sectionId: number;

  @ApiProperty({ example: 'news', description: 'Код, по которому инфоблок подключают' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(INFOBLOCK_CODE_PATTERN, { message: INFOBLOCK_CODE_MESSAGE })
  code: string;

  @ApiProperty({ example: 'Новости компании', description: 'Название для админки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Выводятся на главной', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 'Новость', description: 'Как называется одна запись списка' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  elementName?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Порядок внутри раздела' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
