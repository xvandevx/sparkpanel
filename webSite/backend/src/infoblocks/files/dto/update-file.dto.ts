import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Правка карточки файла: имя. Содержимое файла не правят — его загружают
 * заново; остальное о файле заводят свойствами списка.
 */
export class UpdateFileDto {
  @ApiPropertyOptional({ example: 'banner-main.jpg' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}
