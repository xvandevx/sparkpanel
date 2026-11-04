import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { MAX_LOGO_SIZE } from '../logo';

/** base64 длиннее исходника на треть; сверху — запас на `data:…;base64,` */
const LOGO_MAX_LENGTH = Math.ceil(MAX_LOGO_SIZE / 3) * 4 + 100;

/** Частичное обновление: приходит только то, что меняли. */
export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'CoPanel', description: 'Название сайта' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  siteName?: string;

  @ApiPropertyOptional({
    example: 2,
    nullable: true,
    type: Number,
    description: 'Хранилище для новых файлов; null — встроенное',
  })
  // `null` — осознанный выбор встроенного, поэтому его не отбрасываем
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsInt()
  @Min(1)
  storageId?: number | null;

  @ApiPropertyOptional({
    example: 'data:image/png;base64,iVBORw0KGgo…',
    nullable: true,
    type: String,
    description:
      'Логотип панели картинкой data URI: PNG, JPEG, WebP, GIF или SVG до 512 КБ; null — вернуть логотип SparkPanel',
  })
  // `null` — убрать свой логотип. Тип и вес картинки проверяет сервис (`logo.ts`):
  // здесь только грубый предел длины, чтобы не разбирать мегабайты
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(LOGO_MAX_LENGTH)
  logo?: string | null;
}
