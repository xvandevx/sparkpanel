import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import {
  CONTENT_CODE_MESSAGE,
  CONTENT_CODE_PATTERN,
  ParentDto,
  trim,
} from '../../dto/create-content.dto';
import { SortField } from '../../../record-sort';

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
  @Matches(CONTENT_CODE_PATTERN, { message: CONTENT_CODE_MESSAGE })
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
