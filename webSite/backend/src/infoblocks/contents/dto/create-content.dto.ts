import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
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
 * Символьный код типа контента и элемента — сегмент адреса: строчные латинские
 * буквы, цифры и дефис между ними.
 */
export const CONTENT_CODE_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CONTENT_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры и дефис между ними';

export const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** Родитель записи дерева — общий у типа контента и элемента. */
export class ParentDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Родитель; не указан или null — запись встанет в корень',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;
}

export class CreateContentDto extends ParentDto {
  /**
   * Код обязателен: он же код списка элементов типа, а список без кода
   * сайту не найти
   */
  @ApiProperty({
    example: 'news',
    description: 'Символьный код — он же код списка элементов',
  })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(CONTENT_CODE_PATTERN, { message: CONTENT_CODE_MESSAGE })
  code: string;

  @ApiProperty({
    example: 'Новости',
    description: 'Название — оно же имя списка элементов',
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
