import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ParentDto, trim } from '../../dto/create-content.dto';
import { SortField } from '../../../record-sort';

/**
 * Символьный код элемента типа контента: как у типа (строчные латинские буквы,
 * цифры, дефис между ними), но ещё и с одним дефисом на конце. Коды старого
 * сайта кончаются на `_` (`2024_po_nast_` → `2024-po-nast-`), а адреса фильтра
 * сайта собираются из кодов и меняться не должны. Дефис в начале и два подряд —
 * по-прежнему нельзя. Код самого типа — без этого исключения.
 */
export const CONTENT_ITEM_CODE_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*-?$/;

export const CONTENT_ITEM_CODE_MESSAGE =
  'Код может содержать строчные латинские буквы, цифры и дефис между ними или в конце';

/** Тип контента — в адресе (`/infoblocks/contents/:contentId/items`), в теле его нет. */
export class CreateContentItemDto extends ParentDto {
  @ApiPropertyOptional({
    example: 'opening',
    description: 'Символьный код; пустой — без кода',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  @Matches(CONTENT_ITEM_CODE_PATTERN, { message: CONTENT_ITEM_CODE_MESSAGE })
  code?: string;

  @ApiProperty({ example: 'Мы открылись', description: 'Название элемента' })
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
