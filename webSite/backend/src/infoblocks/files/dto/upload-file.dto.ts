import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

/**
 * Тело загрузки: multipart. Сам файл сюда не попадает — его забирает
 * FileInterceptor и кладёт в `req.file`; поле `file` описано ради Swagger,
 * иначе в сгенерированном клиенте не будет параметра-файла.
 *
 * Куда класть — одно из двух: раздел (загрузка в разделе «Файлы») или свойство
 * (загрузка из карточки записи — файл запомнит свойство, раздела под него нет).
 * Числа в multipart приезжают строками, поэтому `@Type(() => Number)`.
 */
export class UploadFileDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Файл' })
  file?: unknown;

  @ApiPropertyOptional({ example: 1, description: 'Раздел файлов' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sectionId?: number;

  @ApiPropertyOptional({ example: 6, description: 'Свойство «Файл» или «Изображение»' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  propertyId?: number;
}
