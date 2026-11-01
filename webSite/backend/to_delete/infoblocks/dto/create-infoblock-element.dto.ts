import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  type ValidatorConstraintInterface,
} from 'class-validator';
import { INFOBLOCK_CODE_MESSAGE, INFOBLOCK_CODE_PATTERN } from './create-infoblock-section.dto';

/** Дата элемента хранится как календарный день, без времени и часового пояса. */
export const ELEMENT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const ELEMENT_DATE_MESSAGE = 'Дата указывается в виде ГГГГ-ММ-ДД';

/**
 * Дата существует в календаре. Одной формы строки мало: «2026-02-31» ей
 * удовлетворяет, а Postgres такую дату не принимает — запрос падал бы
 * ошибкой сервера вместо внятного отказа по полю.
 */
export function isCalendarDate(value: unknown): boolean {
  const raw = String(value ?? '');
  if (!ELEMENT_DATE_PATTERN.test(raw)) return false;

  const [year, month, day] = raw.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Проверка даты для DTO: та же функция, что и снаружи. */
@ValidatorConstraint({ name: 'calendarDate', async: false })
export class CalendarDate implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return isCalendarDate(value);
  }

  defaultMessage(): string {
    return ELEMENT_DATE_MESSAGE;
  }
}

export class CreateInfoblockElementDto {
  @ApiProperty({ example: 'otkrytie-ofisa', description: 'Сегмент адреса элемента' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(INFOBLOCK_CODE_PATTERN, { message: INFOBLOCK_CODE_MESSAGE })
  code: string;

  @ApiProperty({ example: 'Открытие нового офиса' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Коротко о главном', nullable: true })
  @IsOptional()
  @IsString()
  preview?: string | null;

  @ApiPropertyOptional({ example: '<p>Полный текст</p>', nullable: true })
  @IsOptional()
  @IsString()
  content?: string | null;

  @ApiPropertyOptional({ example: '/files/1/2026/09/banner.jpg', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  image?: string | null;

  @ApiPropertyOptional({ example: '2026-09-16', nullable: true })
  @IsOptional()
  @Validate(CalendarDate)
  date?: string | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 100, description: 'Порядок внутри инфоблока' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: 'object', example: {}, description: 'Произвольные свойства' })
  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}
