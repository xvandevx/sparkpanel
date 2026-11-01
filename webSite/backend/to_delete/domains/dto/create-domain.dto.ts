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

/** Имя хоста: латинские буквы, цифры и дефисы, точки между частями, необязательный порт. */
export const DOMAIN_HOST_PATTERN =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/;

/**
 * Приводит введённое к имени хоста: убирает протокол, путь и лишние пробелы.
 * Вставить адрес из адресной строки — обычное дело, отказывать из-за `https://`
 * незачем: нормализуем до проверки, а `@Matches` ловит уже настоящие опечатки.
 */
export const normalizeHost = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  return value
    .trim()
    .toLowerCase()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .replace(/\/.*$/, '');
};

export class CreateDomainDto {
  @ApiProperty({
    example: 'shop.example.com',
    description: 'Имя хоста; протокол и путь отбрасываются, имя без точки дополняется основным доменом',
  })
  @Transform(({ value }) => normalizeHost(value))
  @IsString()
  @IsNotEmpty({ message: 'Укажите домен' })
  @MaxLength(255)
  @Matches(DOMAIN_HOST_PATTERN, { message: 'Домен указан неверно — пример: shop.example.com' })
  host: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Домен интернет-магазина', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @ApiPropertyOptional({ example: 100, description: 'Порядок в списке доменов' })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
