import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, ValidateIf } from 'class-validator';

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
}
