import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { FORM_CODE_PATTERN, NOTIFY_EMAIL_PATTERN, normalizeEmail } from './create-form.dto';

/**
 * Частичное обновление: приходит только то, что меняли. Поля, которых нет
 * в теле, остаются как есть.
 */
export class UpdateFormDto {
  @ApiPropertyOptional({ example: 'feedback' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FORM_CODE_PATTERN, {
    message: 'Код может содержать строчные латинские буквы, цифры и дефис между ними',
  })
  code?: string;

  @ApiPropertyOptional({ example: 'Обратная связь' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Ответим в течение рабочего дня', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'sales@example.com' })
  @IsOptional()
  @Transform(({ value }) => normalizeEmail(value))
  @IsString()
  @MaxLength(255)
  @Matches(NOTIFY_EMAIL_PATTERN, { message: 'Почта указана неверно — пример: sales@example.com' })
  notifyEmail?: string;

  @ApiPropertyOptional({ example: 'Спасибо! Мы получили заявку.', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  successMessage?: string | null;

  @ApiPropertyOptional({ example: 'Отправить' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  submitLabel?: string;

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
