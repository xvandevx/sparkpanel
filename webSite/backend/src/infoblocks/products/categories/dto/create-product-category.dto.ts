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
import { PRODUCT_CODE_MESSAGE, PRODUCT_CODE_PATTERN, trim } from '../../dto/create-product.dto';
import { SortField } from '../../../record-sort';

export class CreateProductCategoryDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Родитель; не указан или null — категория встанет в корень',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({
    example: 'sneakers',
    description: 'Символьный код; пустой — без кода',
  })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(120)
  @Matches(PRODUCT_CODE_PATTERN, { message: PRODUCT_CODE_MESSAGE })
  code?: string;

  @ApiProperty({ example: 'Кроссовки', description: 'Название категории' })
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
