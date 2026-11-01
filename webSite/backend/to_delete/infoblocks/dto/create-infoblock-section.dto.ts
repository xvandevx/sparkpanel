import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

/** Код раздела и инфоблока: строчные латинские буквы, цифры и дефисы между ними. */
export const INFOBLOCK_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const INFOBLOCK_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры и дефис между ними';

export class CreateInfoblockSectionDto {
  @ApiProperty({ example: 'content', description: 'Код раздела' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(INFOBLOCK_CODE_PATTERN, { message: INFOBLOCK_CODE_MESSAGE })
  code: string;

  @ApiProperty({ example: 'Контент сайта', description: 'Название для админки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Всё, что редакторы наполняют сами', nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ example: 100, description: 'Порядок среди разделов' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
