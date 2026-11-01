import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { FIELD_OPTIONS_MAX, FORM_FIELD_CODE_PATTERN } from './create-form-field.dto';

/** Частичное обновление поля: приходит только то, что меняли. */
export class UpdateFormFieldDto {
  @ApiPropertyOptional({ example: 'phone' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FORM_FIELD_CODE_PATTERN, {
    message: 'Код поля: строчные латинские буквы, цифры и подчёркивание, начиная с буквы',
  })
  code?: string;

  @ApiPropertyOptional({ example: 'Телефон' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  label?: string;

  @ApiPropertyOptional({ enum: FormFieldType, example: FormFieldType.Select })
  @IsOptional()
  @IsEnum(FormFieldType)
  type?: FormFieldType;

  @ApiPropertyOptional({ example: '+7 (900) 000-00-00', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  placeholder?: string | null;

  @ApiPropertyOptional({ example: ['Консультация', 'Заказ', 'Другое'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(FIELD_OPTIONS_MAX)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  options?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
