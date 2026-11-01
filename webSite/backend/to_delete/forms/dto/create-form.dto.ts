import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

/** Код формы: строчные латинские буквы, цифры и дефисы между ними. */
export const FORM_CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Получатель заявок. Пустая строка допустима — заявки просто никуда не уходят;
 * проверку формата это не отменяет, поэтому пустое значение разрешено явно.
 */
export const NOTIFY_EMAIL_PATTERN = /^$|^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Вставить адрес с пробелом или заглавными — обычное дело; приводим до проверки. */
export const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class CreateFormDto {
  @ApiProperty({ example: 'feedback', description: 'Код, по которому форму подключают на сайте' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FORM_CODE_PATTERN, {
    message: 'Код может содержать строчные латинские буквы, цифры и дефис между ними',
  })
  code: string;

  @ApiProperty({ example: 'Обратная связь', description: 'Название для админки' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Ответим в течение рабочего дня', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;

  @ApiPropertyOptional({ example: 'sales@example.com', description: 'Куда отправлять заявки' })
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

  @ApiPropertyOptional({ example: 'Отправить', description: 'Подпись кнопки отправки' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  submitLabel?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Порядок в списке форм' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
