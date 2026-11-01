import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { FILE_SECTION_CODE_MESSAGE, FILE_SECTION_CODE_PATTERN } from './create-file-section.dto';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

/** Частичное обновление: приходит только то, что меняли. */
export class UpdateFileSectionDto {
  @ApiPropertyOptional({ example: 'banners' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Matches(FILE_SECTION_CODE_PATTERN, { message: FILE_SECTION_CODE_MESSAGE })
  code?: string;

  @ApiPropertyOptional({ example: 'Баннеры' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;
}
