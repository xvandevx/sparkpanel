import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { FORM_CODE_PATTERN, trim } from '../../dto/create-form.dto';
import { SortField } from '../../../record-sort';

export class CreateFormFieldDto {
  @ApiProperty({ example: 'phone', description: 'Имя значения в заявке' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FORM_CODE_PATTERN, {
    message: 'Код поля: строчные латинские буквы, цифры и дефис между ними',
  })
  code: string;

  @ApiProperty({ example: 'Телефон', description: 'Подпись поля на сайте' })
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
