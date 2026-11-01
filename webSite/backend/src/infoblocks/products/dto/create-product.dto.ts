import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { SortField } from '../../record-sort';

/**
 * Символьный код товара и категории — сегмент адреса: строчные латинские
 * буквы, цифры и дефис между ними. Пустой допустим: нужен ли код, решает
 * настройка списка «Символьный код записей».
 */
export const PRODUCT_CODE_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PRODUCT_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры и дефис между ними';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductDto {
  @ApiPropertyOptional({
    example: 'air-max-90',
    description: 'Символьный код; пустой — без кода',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  @Matches(PRODUCT_CODE_PATTERN, { message: PRODUCT_CODE_MESSAGE })
  code?: string;

  @ApiProperty({
    example: 'Кроссовки Air Max 90',
    description: 'Название товара',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @SortField()
  sort?: number;
}
