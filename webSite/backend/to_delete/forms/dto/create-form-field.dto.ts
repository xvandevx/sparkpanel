import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { FormFieldType } from '../form-field.model';

/**
 * Код поля: им подписано значение в заявке и в письме, поэтому формат — как у
 * имени переменной: строчные латинские буквы, цифры и подчёркивание.
 */
export const FORM_FIELD_CODE_PATTERN = /^[a-z][a-z0-9_]*$/;

/** Полсотни вариантов в списке — это уже не форма обратной связи, а чей-то импорт. */
export const FIELD_OPTIONS_MAX = 50;

export class CreateFormFieldDto {
  @ApiProperty({ example: 'phone', description: 'Ключ значения в заявке' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FORM_FIELD_CODE_PATTERN, {
    message: 'Код поля: строчные латинские буквы, цифры и подчёркивание, начиная с буквы',
  })
  code: string;

  @ApiProperty({ example: 'Телефон', description: 'Подпись поля на сайте' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional({ enum: FormFieldType, example: FormFieldType.Text })
  @IsOptional()
  @IsEnum(FormFieldType)
  type?: FormFieldType;

  @ApiPropertyOptional({ example: '+7 (900) 000-00-00', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholder?: string | null;

  @ApiPropertyOptional({
    example: ['Консультация', 'Заказ', 'Другое'],
    description: 'Варианты списка; обязательны для типа «Список», у остальных игнорируются',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(FIELD_OPTIONS_MAX)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  options?: string[];

  @ApiPropertyOptional({ example: true, description: 'Без этого поля заявку не отправить' })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Порядок среди полей формы' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
