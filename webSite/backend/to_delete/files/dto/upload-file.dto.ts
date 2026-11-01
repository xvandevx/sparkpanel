import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Тело загрузки: multipart. Сам файл сюда не попадает — его забирает FileInterceptor
 * и кладёт в `req.file`; поле `file` описано только ради Swagger, иначе в схеме
 * (и в сгенерированном клиенте) не будет параметра-файла.
 *
 * Числа и строки в multipart приезжают строками, поэтому `@Type(() => Number)`.
 */
export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Файл' })
  file?: unknown;

  @ApiProperty({ example: 1, description: 'Раздел, в который кладём файл' })
  @Type(() => Number)
  @IsInt()
  sectionId: number;

  @ApiPropertyOptional({ example: 'Баннер на главной' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  description?: string;
}
