import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Частичное обновление: приходит только то, что меняли. */
export class UpdateSettingsDto {
  @ApiPropertyOptional({ example: 'CoPanel', description: 'Название сайта' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(255)
  siteName?: string;
}
