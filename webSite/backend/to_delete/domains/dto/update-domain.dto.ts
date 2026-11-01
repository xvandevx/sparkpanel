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
import { DOMAIN_HOST_PATTERN, normalizeHost } from './create-domain.dto';

/**
 * Частичное обновление: приходит только то, что меняли. Полей, которых нет
 * в теле, правка не касается — их отсутствие не значит «очистить».
 *
 * `isMain` менять нельзя: основной домен заводится системой и остаётся
 * единственным — иначе у сайта оказалось бы два главных имени.
 */
export class UpdateDomainDto {
  @ApiPropertyOptional({ example: 'shop.example.com' })
  @IsOptional()
  @Transform(({ value }) => normalizeHost(value))
  @IsString()
  @IsNotEmpty({ message: 'Укажите домен' })
  @MaxLength(255)
  @Matches(DOMAIN_HOST_PATTERN, { message: 'Домен указан неверно — пример: shop.example.com' })
  host?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 'Домен интернет-магазина', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string | null;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
