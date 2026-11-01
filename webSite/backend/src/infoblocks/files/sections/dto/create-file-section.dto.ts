import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { SortField } from '../../../record-sort';

export class CreateFileSectionDto {
  @ApiPropertyOptional({
    example: 1,
    nullable: true,
    description: 'Родитель; не указан или null — раздел встанет в корень',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsInt()
  parentId?: number | null;

  @ApiProperty({ example: 'Баннеры', description: 'Название для админки' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @SortField()
  sort?: number;
}
