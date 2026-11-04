import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { EXTERNAL_URL_MAX_LENGTH } from '../../settings/properties/property';

/**
 * «Забрать в хранилище»: внешний файл по адресу скачивает сервер и кладёт
 * к себе, как загруженный. Куда класть — как у загрузки: раздел или свойство.
 */
export class ImportFileDto {
  @ApiProperty({ example: 'https://old.site/upload/logo.png', description: 'Адрес внешнего файла, http(s)' })
  @IsString()
  @MaxLength(EXTERNAL_URL_MAX_LENGTH)
  url: string;

  @ApiPropertyOptional({ example: 1, description: 'Раздел файлов' })
  @IsOptional()
  @IsInt()
  sectionId?: number;

  @ApiPropertyOptional({ example: 6, description: 'Свойство «Файл» или «Изображение»' })
  @IsOptional()
  @IsInt()
  propertyId?: number;
}
