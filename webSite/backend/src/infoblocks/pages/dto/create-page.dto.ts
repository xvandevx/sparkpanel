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
  ValidateIf,
} from 'class-validator';
import { SortField } from '../../record-sort';

/**
 * Сегмент адреса и код страницы: строчные латинские буквы, цифры и дефисы
 * между ними. Пустая строка допустима: пустой сегмент — главная страница,
 * пустой код — страница без кода. Адрес — свойство «Адрес», его по этому же
 * правилу проверяет раздел при сохранении значений.
 */
export const PAGE_CODE_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PAGE_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры и дефис между ними';

export const PAGE_URL_MESSAGE =
  'Адрес может содержать строчные латинские буквы, цифры и дефис между ними';

export class CreatePageDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Родитель; не указан или null — страница встанет в корень сайта',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;


  @ApiPropertyOptional({ example: 'about', description: 'Символьный код; пустой — без кода' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(PAGE_CODE_PATTERN, { message: PAGE_CODE_MESSAGE })
  code?: string;

  @ApiProperty({ example: 'О компании', description: 'Название для админки' })
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
